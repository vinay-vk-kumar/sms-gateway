

const User = require('../models/User');
const { error } = require('../utils/apiResponse');

const apiKeyMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return error(res, 'API key required. Include x-api-key header.', 401);
    }

    const user = await User.findOne({ apiKey }).select('-passwordHash');

    if (!user) {
      return error(res, 'Invalid API key', 401);
    }

    if (user.isSuspended) {
      return error(res, 'Your account has been suspended. Contact support.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[API Key Middleware]', err.message);
    return error(res, 'Authentication failed', 500);
  }
};

module.exports = apiKeyMiddleware;
