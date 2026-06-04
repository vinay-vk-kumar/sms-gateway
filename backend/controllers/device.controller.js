
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const mongoose = require('mongoose');

const Device = require('../models/Device');
const SmsQueue = require('../models/SmsQueue');
const { success, error } = require('../utils/apiResponse');

const registerSchema = Joi.object({
  fcmToken: Joi.string().min(10).required().messages({
    'string.min': 'FCM token appears too short',
    'any.required': 'fcmToken is required',
  }),
  deviceName: Joi.string().max(100).optional().default('Unnamed Device'),
});

const refreshTokenSchema = Joi.object({
  newFcmToken: Joi.string().min(10).required().messages({
    'any.required': 'newFcmToken is required',
  }),
});

const register = async (req, res) => {
  const { error: validationError, value } = registerSchema.validate(req.body, { abortEarly: true });
  if (validationError) {
    return error(res, validationError.details[0].message, 400);
  }

  const { fcmToken, deviceName } = value;

  // Generate a cryptographically secure device secret
  const deviceSecret = crypto.randomBytes(32).toString('hex');

  // Hash it — only the hash is stored
  const deviceSecretHash = await bcrypt.hash(deviceSecret, 12);

  const device = await Device.create({
    userId: req.user._id,
    fcmToken,
    deviceName,
    deviceSecretHash,
  });

  console.log(`[Device] Registered: "${deviceName}" for user ${req.user.email}`);

  return success(res, {
    deviceId: device._id,
    deviceName: device.deviceName,
    // ⚠ Plain secret shown ONCE — store it in the Android app immediately
    deviceSecret,
    warning: 'Save this deviceSecret now. It will NEVER be shown again. If lost, delete this device and register a new one.',
  }, 201);
};

const list = async (req, res) => {
  const devices = await Device.find({ userId: req.user._id, isActive: true }).lean();

  const now = Date.now();
  const TWO_MINUTES = 2 * 60 * 1000;

  // Get SMS sent count per device
  const smsCounts = await SmsQueue.aggregate([
    { $match: { userId: req.user._id, status: 'sent' } },
    { $group: { _id: '$deviceId', count: { $sum: 1 } } },
  ]);

  const smsCountMap = {};
  smsCounts.forEach((item) => {
    smsCountMap[item._id.toString()] = item.count;
  });

  const enriched = devices.map((d) => ({
    _id: d._id,
    deviceName: d.deviceName,
    isActive: d.isActive,
    isOnline: d.lastSeenAt ? now - new Date(d.lastSeenAt).getTime() < TWO_MINUTES : false,
    lastSeenAt: d.lastSeenAt,
    smsSentCount: smsCountMap[d._id.toString()] || 0,
    createdAt: d.createdAt,
    // Never return fcmToken or deviceSecretHash to the frontend
  }));

  return success(res, { devices: enriched });
};

const deactivate = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return error(res, 'Invalid device ID', 400);
  }

  // Ensure the device belongs to the current user
  const device = await Device.findOne({ _id: id, userId: req.user._id });

  if (!device) {
    return error(res, 'Device not found or does not belong to your account', 404);
  }

  device.isActive = false;
  await device.save();

  console.log(`[Device] Deactivated: ${device.deviceName} (${id})`);

  return success(res, { message: 'Device deactivated successfully' });
};

const refreshToken = async (req, res) => {
  const { error: validationError } = refreshTokenSchema.validate(req.body);
  if (validationError) {
    return error(res, validationError.details[0].message, 400);
  }

  const { newFcmToken } = req.body;

  req.device.fcmToken = newFcmToken;
  await req.device.save();

  console.log(`[Device] FCM token refreshed for device: ${req.device._id}`);

  return success(res, { message: 'FCM token updated successfully' });
};

module.exports = { register, list, deactivate, refreshToken };
