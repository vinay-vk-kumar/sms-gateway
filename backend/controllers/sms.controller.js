const Joi = require('joi');
const mongoose = require('mongoose');

const SmsQueue = require('../models/SmsQueue');
const Device = require('../models/Device');
const { success, error } = require('../utils/apiResponse');

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
  webhookUrl: Joi.string().uri().max(500).optional(),
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

  const { to, message, deviceId, type, idempotencyKey, webhookUrl } = value;

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
      webhookUrl: webhookUrl || null,
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
    try {
      const addJobPromise = bullQueue.add('send-sms', {
        smsId: smsRecord._id.toString(),
        deviceId: device._id.toString(),
        fcmToken: device.fcmToken,
        userId: req.user._id.toString(),
        pendingCount,
        to,
        message,
      }, {
        attempts: 5,                             // 5 attempts max
        backoff: { type: 'fixed', delay: 5000 }, // 5-second delay between attempts
        removeOnComplete: true,                  // Delete from Redis on success
        removeOnFail: true,                      // Delete from Redis on failure
      });

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Redis connection timeout')), 3000);
      });

      // Wait for BullMQ to add the job, but timeout if Redis is offline
      await Promise.race([addJobPromise, timeoutPromise]);
      clearTimeout(timeoutId); // Prevent memory leak / unhandled rejection
    } catch (err) {
      console.error('[SMS] Failed to queue job (Redis down?):', err.message);
      smsRecord.status = 'failed';
      smsRecord.error = 'Queue error: System temporarily unavailable';
      await smsRecord.save();
      return error(res, 'System temporarily unavailable. Please try again later.', 503);
    }
  } else {
    console.log('[SMS] BullMQ not initialized — Queueing failed.');
  }

  console.log(`[SMS] Queued: ${to} via device ${device.deviceName} (${smsRecord._id})`);

  return success(res, { messageId: smsRecord._id, status: 'pending' }, 201);
};

const webhookCallback = async (req, res) => {
  const { jobId } = req.params;
  const { status, error: failureReason, smsId } = req.body;

  if (!jobId || !smsId) {
    return error(res, 'Missing jobId or smsId', 400);
  }

  const sms = await SmsQueue.findOne({ _id: smsId, deviceId: req.device._id });
  if (!sms) {
    return error(res, 'Message not found or does not belong to this device', 404);
  }

  if (status === 'sent') {
    sms.status = 'sent';
    sms.sentAt = new Date();
    await sms.save();
  } else {
    // Only used if BullMQ is disabled. Otherwise BullMQ handles tracking retries.
    sms.retries += 1;
    sms.status = sms.retries >= 24 ? 'failed' : 'pending';
    sms.error = failureReason || 'Unknown Android error';
    await sms.save();
  }

  // Dispatch Outbound Webhook if configured (Fire and Forget)
  if (sms.webhookUrl) {
    const axios = require('axios');
    axios.post(sms.webhookUrl, {
      messageId: sms._id,
      to: sms.to,
      status: sms.status,
      error: sms.error,
      sentAt: sms.sentAt,
      type: sms.type,
      idempotencyKey: sms.idempotencyKey
    }, { timeout: 10000 }).catch(err => {
      console.error(`[Webhook] Failed to send outbound webhook to ${sms.webhookUrl}:`, err.message);
    });
  }

  // Heartbeat
  await Device.findByIdAndUpdate(req.device._id, { lastSeenAt: new Date() });

  // Publish to Redis to resolve BullMQ worker
  const { getRedisClient } = require('../config/redis');
  const publisher = getRedisClient();

  if (status === 'sent') {
    publisher.publish(`webhook:${jobId}`, 'SUCCESS');
  } else {
    publisher.publish(`webhook:${jobId}`, `FAILED: ${failureReason || 'Unknown error'}`);
  }

  return success(res, { message: 'Webhook processed successfully' });
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
              sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const total = result.total[0]?.n ?? 0;
  const sentAll = result.sentAll[0]?.n ?? 0;
  const sentToday = result.sentToday[0]?.n ?? 0;
  const failedToday = result.failedToday[0]?.n ?? 0;
  const successRate = total > 0 ? Math.round((sentAll / total) * 100) : 0;

  // Build 7-day chart array (fill in missing days with 0)
  const chartMap = {};
  result.chart.forEach((d) => { chartMap[d._id] = { sent: d.sent, failed: d.failed }; });

  const chart = Array.from({ length: 7 }, (_, i) => {
    // Generate each day strictly in UTC to match MongoDB's `$dateToString` output
    const d = new Date(Date.UTC(sevenDaysAgo.getUTCFullYear(), sevenDaysAgo.getUTCMonth(), sevenDaysAgo.getUTCDate() + i));
    const dateKey = d.toISOString().slice(0, 10); // 'YYYY-MM-DD' in UTC
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return {
      date: dateKey,
      day: label,
      sent: chartMap[dateKey]?.sent ?? 0,
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

const getStatus = async (req, res) => {
  const { messageId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return error(res, 'Invalid message ID format', 400);
  }

  const query = { _id: messageId, userId: req.user._id };

  // Initial check
  let message = await SmsQueue.findOne(query)
    .select('_id to status error sentAt createdAt')
    .lean();

  if (!message) {
    return error(res, 'Message not found', 404);
  }

  // Long Polling: Hold up to 3 seconds if the message is still queued
  let attempts = 0;
  while ((message.status === 'pending' || message.status === 'processing') && attempts < 6) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    message = await SmsQueue.findOne(query)
      .select('_id to status error sentAt createdAt')
      .lean();
    attempts++;
  }

  return success(res, {
    messageId: message._id,
    to: message.to,
    status: message.status,
    error: message.error,
    sentAt: message.sentAt,
    createdAt: message.createdAt
  });
};

module.exports = {
  queue,
  webhookCallback,
  getLogs,
  getStats,
  getStatus
};
