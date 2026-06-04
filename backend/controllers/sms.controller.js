

const Joi = require('joi');
const mongoose = require('mongoose');

const SmsQueue = require('../models/SmsQueue');
const Device = require('../models/Device');
const { success, error } = require('../utils/apiResponse');

// BullMQ queue — imported lazily to avoid circular dependency issues
// The queue is initialized in server.js (Stage 3), accessed here via require
const getQueue = () => {
  try {
    const { getSmsQueue } = require('../queue/sms.queue');
    return getSmsQueue();
  } catch {
    // Stage 3 not yet implemented — queue gracefully absent
    return null;
  }
};

const queueSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\+[1-9]\d{6,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g. +91XXXXXXXXXX)',
      'any.required': '"to" phone number is required',
    }),
  message: Joi.string().min(1).max(1600).required().messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message too long (max 1600 characters)',
    'any.required': '"message" is required',
  }),
  deviceId: Joi.string().required().messages({
    'any.required': '"deviceId" is required',
  }),
  type: Joi.string()
    .valid('otp', 'welcome', 'forgot-password', 'custom')
    .default('custom'),
  idempotencyKey: Joi.string().max(255).optional(),
});

const markSentSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).required().messages({
    'array.min': 'At least one message ID is required',
    'any.required': '"ids" array is required',
  }),
});

const markFailedSchema = Joi.object({
  id: Joi.string().required(),
  error: Joi.string().max(500).optional().default('Unknown error'),
});

const queue = async (req, res) => {
  
  const { error: validationError, value } = queueSchema.validate(req.body, { abortEarly: true });
  if (validationError) {
    return error(res, validationError.details[0].message, 400);
  }

  const { to, message, deviceId, type, idempotencyKey } = value;

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return error(res, 'Invalid deviceId format', 400);
  }

  const device = await Device.findOne({ _id: deviceId, userId: req.user._id });
  if (!device) {
    return error(res, 'Device not found or does not belong to your account', 404);
  }

  if (!device.isActive) {
    return error(res, 'Device is deactivated. Please register a new device.', 400);
  }

  if (idempotencyKey) {
    const existing = await SmsQueue.findOne({ idempotencyKey });
    if (existing) {
      console.log(`[SMS] Idempotency hit: ${idempotencyKey}`);
      // Return existing record — don't queue again
      return success(res, {
        messageId: existing._id,
        status: existing.status,
        idempotent: true,
        message: 'Duplicate request. Returning existing message record.',
      });
    }
  }

  let smsRecord;
  try {
    smsRecord = await SmsQueue.create({
      userId: req.user._id,
      deviceId: device._id,
      to,
      message,
      type,
      idempotencyKey: idempotencyKey || null,
      status: 'pending',
    });
  } catch (dbErr) {
    // Handle duplicate idempotency key race condition at DB level
    if (dbErr.code === 11000) {
      const existing = await SmsQueue.findOne({ idempotencyKey });
      return success(res, { messageId: existing._id, status: existing.status, idempotent: true });
    }
    throw dbErr;
  }

  // Count how many pending messages this device has (including this new one)
  const pendingCount = await SmsQueue.countDocuments({
    deviceId: device._id,
    status: 'pending',
  });

  const bullQueue = getQueue();
  if (bullQueue) {
    await bullQueue.add('send-sms', {
      smsId: smsRecord._id.toString(),
      deviceId: device._id.toString(),
      fcmToken: device.fcmToken,
      userId: req.user._id.toString(),
      pendingCount,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,   // Keep last 100 completed jobs
      removeOnFail: false,     // Keep all failed jobs for DLQ inspection
    });
  } else {
    // Stage 3 not yet set up — log and continue (WorkManager polling is the fallback)
    console.log('[SMS] BullMQ not initialized — SMS queued for WorkManager polling only.');
  }

  console.log(`[SMS] Queued: ${to} via device ${device.deviceName} (${smsRecord._id})`);

  return success(res, { messageId: smsRecord._id, status: 'pending' }, 201);
};

const getPending = async (req, res) => {
  const deviceId = req.device._id;

  // If the Android app fetched messages but crashed / lost network before
  // calling mark-sent or mark-failed, they get stuck in "processing" forever.
  // We reset any message that has been in "processing" for > 5 minutes.
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  const resetResult = await SmsQueue.updateMany(
    { deviceId, status: 'processing', updatedAt: { $lt: staleThreshold } },
    { $set: { status: 'pending' } }
  );
  if (resetResult.modifiedCount > 0) {
    console.log(`[SMS] Reset ${resetResult.modifiedCount} stale processing message(s) → pending for device ${deviceId}`);
  }

  const candidates = await SmsQueue.find({ deviceId, status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(10)
    .select('_id to message type retries createdAt')
    .lean();

  if (candidates.length === 0) {
    // Still update lastSeenAt so the device shows as "online" in dashboard
    await Device.findByIdAndUpdate(deviceId, { lastSeenAt: new Date() });
    return success(res, { messages: [] });
  }

  const ids = candidates.map((m) => m._id);

  // Only updates documents STILL in "pending" state
  // Safe against concurrent requests from the same device or WorkManager
  const updateResult = await SmsQueue.updateMany(
    { _id: { $in: ids }, status: 'pending' },
    { $set: { status: 'processing' } }
  );

  // Update lastSeenAt on the device (heartbeat)
  await Device.findByIdAndUpdate(deviceId, { lastSeenAt: new Date() });

  console.log(
    `[SMS] Device ${deviceId} fetched ${updateResult.modifiedCount} messages (locked as processing)`
  );

  return success(res, { messages: candidates });
};

const markSent = async (req, res) => {
  const { error: validationError } = markSentSchema.validate(req.body);
  if (validationError) {
    return error(res, validationError.details[0].message, 400);
  }

  const { ids } = req.body;

  // Validate all IDs are valid ObjectIds
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length !== ids.length) {
    return error(res, 'One or more message IDs are invalid', 400);
  }

  // Security: only update messages that belong to THIS device
  // and are currently "processing" or already "sent" (idempotent)
  // NOTE: "pending" intentionally excluded — device MUST call /pending first
  //       which atomically transitions pending → processing (race condition safe)
  const result = await SmsQueue.updateMany(
    {
      _id: { $in: validIds },
      deviceId: req.device._id,
      status: { $in: ['processing', 'sent'] },
    },
    {
      $set: { status: 'sent', sentAt: new Date() },
    }
  );

  console.log(`[SMS] Marked ${result.modifiedCount}/${validIds.length} messages as sent`);

  return success(res, {
    marked: result.modifiedCount,
    total: validIds.length,
  });
};

const markFailed = async (req, res) => {
  const { error: validationError, value } = markFailedSchema.validate(req.body);
  if (validationError) {
    return error(res, validationError.details[0].message, 400);
  }

  const { id, error: failureReason } = value;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return error(res, 'Invalid message ID', 400);
  }

  // Security: message must belong to this device
  const sms = await SmsQueue.findOne({ _id: id, deviceId: req.device._id });
  if (!sms) {
    return error(res, 'Message not found or does not belong to this device', 404);
  }

  // Already permanently failed — idempotent
  if (sms.status === 'failed') {
    return success(res, { status: 'failed', message: 'Already marked as failed' });
  }

  sms.retries += 1;

  if (sms.retries >= 3) {
    // Permanently failed after 3 attempts
    sms.status = 'failed';
    sms.error = failureReason || 'Max retries reached';
    console.log(`[SMS] Permanently failed after ${sms.retries} retries: ${id}`);
  } else {
    // Still has retries left — put back to pending for WorkManager to pick up
    sms.status = 'pending';
    sms.error = failureReason;
    console.log(`[SMS] Attempt ${sms.retries}/3 failed for ${id} — reset to pending`);
  }

  await sms.save();

  return success(res, {
    status: sms.status,
    retries: sms.retries,
    willRetry: sms.status === 'pending',
  });
};

const getLogs = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const skip = (page - 1) * limit;

  // Build filter
  const filter = { userId: req.user._id };

  if (req.query.status && ['pending', 'processing', 'sent', 'failed'].includes(req.query.status)) {
    filter.status = req.query.status;
  }

  if (req.query.deviceId && mongoose.Types.ObjectId.isValid(req.query.deviceId)) {
    // Verify device belongs to user before filtering
    filter.deviceId = req.query.deviceId;
  }

  if (req.query.startDate) {
    filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.startDate) };
  }

  if (req.query.endDate) {
    filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.endDate) };
  }

  const [messages, total] = await Promise.all([
    SmsQueue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('deviceId', 'deviceName')
      .lean(),
    SmsQueue.countDocuments(filter),
  ]);

  return success(res, {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

const getStats = async (req, res) => {
  const userId = req.user._id;

  const now = new Date();
  
  // Use UTC boundaries for MongoDB `$match` to perfectly align with `$dateToString` (which uses UTC)
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));

  const [result] = await SmsQueue.aggregate([
    { $match: { userId } },
    {
      $facet: {
        // Total messages ever queued
        total: [{ $count: 'n' }],

        // Total ever sent
        sentAll: [{ $match: { status: 'sent' } }, { $count: 'n' }],

        // Sent today
        sentToday: [
          { $match: { status: 'sent', sentAt: { $gte: startOfDay } } },
          { $count: 'n' },
        ],

        // Failed today
        failedToday: [
          { $match: { status: 'failed', createdAt: { $gte: startOfDay } } },
          { $count: 'n' },
        ],

        // 7-day chart data: group by date, count sent + failed per day
        chart: [
          { $match: { createdAt: { $gte: sevenDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              sent:   { $sum: { $cond: [{ $eq: ['$status', 'sent']   }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const total      = result.total[0]?.n       ?? 0;
  const sentAll    = result.sentAll[0]?.n      ?? 0;
  const sentToday  = result.sentToday[0]?.n    ?? 0;
  const failedToday = result.failedToday[0]?.n ?? 0;
  const successRate = total > 0 ? Math.round((sentAll / total) * 100) : 0;

  // Build 7-day chart array (fill in missing days with 0)
  const chartMap = {};
  result.chart.forEach((d) => { chartMap[d._id] = { sent: d.sent, failed: d.failed }; });

  const chart = Array.from({ length: 7 }, (_, i) => {
    // Generate each day strictly in UTC to match MongoDB's `$dateToString` output
    const d = new Date(Date.UTC(sevenDaysAgo.getUTCFullYear(), sevenDaysAgo.getUTCMonth(), sevenDaysAgo.getUTCDate() + i));
    const dateKey = d.toISOString().slice(0, 10); // 'YYYY-MM-DD' in UTC
    const label   = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return {
      date:   dateKey,
      day:    label,
      sent:   chartMap[dateKey]?.sent   ?? 0,
      failed: chartMap[dateKey]?.failed ?? 0,
    };
  });

  return success(res, {
    total,
    sentAll,
    sentToday,
    failedToday,
    successRate,
    chart,
  });
};

module.exports = { queue, getPending, markSent, markFailed, getLogs, getStats };
