const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { error } = require('../utils/apiResponse');

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies?.jwt;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return error(res, 'Authentication token required', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return error(res, 'Token expired. Please log in again.', 401);
      }
      return error(res, 'Invalid token', 401);
    }

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return error(res, 'User not found', 401);
    }

    if (user.isSuspended) {
      return error(res, 'Your account has been suspended. Contact support.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware]', err.message);
    return error(res, 'Authentication failed', 500);
  }
};

module.exports = authMiddleware;
