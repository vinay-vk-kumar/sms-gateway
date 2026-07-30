const { error } = require('../utils/apiResponse');

const requireVerified = async (req, res, next) => {
  if (!req.user) {
    return error(res, 'Authentication required', 401);
  }

  if (!req.user.isVerified) {
    return error(res, 'Please verify your email address to access this feature', 403);
  }

  next();
};

module.exports = requireVerified;
