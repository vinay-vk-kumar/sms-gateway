const { getRedisClient } = require('../config/redis');
const { error } = require('../utils/apiResponse');

const incrementWithExpiry = async (redis, key, ttlSeconds) => {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return count;
};

const rateLimitMiddleware = async (req, res, next) => {
  try {
    const { to, deviceId } = req.body || {};
    if (!to || !deviceId) {
      return next();
    }

    const redis = getRedisClient();
    const userId = req.user._id.toString();

    const phoneRaw = to.replace(/[+\s]/g, '');

    const minuteLimit = req.user.minuteSmsLimit || 10;
    const minKey = `rate:user:${userId}:min`;
    const minCount = await incrementWithExpiry(redis, minKey, 60);

    if (minCount > minuteLimit) {
      return error(res, `Rate limit exceeded: ${minuteLimit} SMS per minute allowed. Please slow down.`, 429);
    }

    const dailyLimit = req.user.dailySmsLimit || 100;
    const dayKey = `rate:user:${userId}:day`;
    const dayCount = await incrementWithExpiry(redis, dayKey, 86400);

    if (dayCount > dailyLimit) {
      return error(res, `Daily limit reached: ${dailyLimit} SMS per day allowed.`, 429);
    }

    if (phoneRaw) {
      const phoneLimit = req.user.hourlyPhoneLimit ?? 100; // default 100

      if (phoneLimit > 0) {
        const phoneKey = `rate:phone:${phoneRaw}:hour`;
        const phoneCount = await incrementWithExpiry(redis, phoneKey, 3600);

        if (phoneCount > phoneLimit) {
          return error(res, `Too many messages to this number. Max ${phoneLimit} per hour.`, 429);
        }
      }
    }

    next();
  } catch (err) {
    console.error('[Rate Limit] Redis error — skipping rate check:', err.message);
    next();
  }
};

module.exports = rateLimitMiddleware;
