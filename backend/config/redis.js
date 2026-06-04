const Redis = require('ioredis');

let client = null;
let parsedConfig = null;

const parseRedisUrl = (url) => {
  try {
    const parsed = new URL(url);
    const isTls = parsed.protocol === 'rediss:';

    const config = {
      host: parsed.hostname,
      port: parseInt(parsed.port) || (isTls ? 6380 : 6379),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      username: parsed.username && parsed.username !== 'default' ? parsed.username : undefined,
      maxRetriesPerRequest: null,  // Required by BullMQ
    };

    if (isTls) {
      config.tls = {};
    }

    return config;
  } catch (err) {
    throw new Error(`[Redis] Failed to parse REDIS_URL: ${err.message}`);
  }
};

const getRedisConfig = () => {
  if (parsedConfig) return parsedConfig;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[Redis] REDIS_URL not set — using localhost fallback');
    parsedConfig = {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
    return parsedConfig;
  }

  parsedConfig = parseRedisUrl(redisUrl);
  return parsedConfig;
};

const getRedisClient = () => {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.error('[Redis] REDIS_URL is not set — rate limiting will be skipped.');
    return createMockClient();
  }

  try {
    const config = getRedisConfig();

    client = new Redis({
      ...config,
      maxRetriesPerRequest: 3,  // Override for ioredis client (different from BullMQ)
      lazyConnect: false,
      enableOfflineQueue: false,
    });

    client.on('connect', () => console.log('[Redis] ✓ Connected.'));
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

    return client;
  } catch (err) {
    console.error('[Redis] Failed to create client:', err.message);
    return createMockClient();
  }
};

const createMockClient = () => {
  const noop = async () => null;
  return {
    ping: noop,
    incr: async () => 0,
    expire: noop,
    get: noop,
    set: noop,
    del: noop,
    on: () => { },
    status: 'mock',
  };
};

module.exports = { getRedisClient, getRedisConfig };
