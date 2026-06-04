const bcrypt = require('bcryptjs');
const Device = require('../models/Device');
const { error } = require('../utils/apiResponse');

const deviceMiddleware = async (req, res, next) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const deviceSecret = req.headers['x-device-secret'];

    if (!deviceId || !deviceSecret) {
      return error(
        res,
        'Device credentials required. Send x-device-id and x-device-secret headers.',
        401
      );
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return error(res, 'Device not found', 401);
    }
    const isValid = await bcrypt.compare(deviceSecret, device.deviceSecretHash);
    if (!isValid) {
      return error(res, 'Invalid device credentials', 401);
    }
    if (!device.isActive) {
      return error(res, 'This device has been deactivated. Re-register a new device.', 403);
    }

    req.device = device;
    next();
  } catch (err) {
    if (err.name === 'CastError') {
      return error(res, 'Invalid device ID format', 400);
    }
    console.error('[Device Middleware]', err.message);
    return error(res, 'Device authentication failed', 500);
  }
};

module.exports = deviceMiddleware;
