/**
 * queue/sms.queue.js
 * ===================
 * BullMQ Queue setup for SMS delivery triggering.
 *
 * WORKER:
 *   Started via initSmsWorker() — called from server.js on startup.
 *   Concurrency: 5 (can process 5 FCM pushes simultaneously)
 */

const { Queue } = require('bullmq');
const { getRedisConfig } = require('../config/redis');

let smsQueue = null;

const getSmsQueue = () => {
  if (smsQueue) return smsQueue;

  const connection = getRedisConfig();
  smsQueue = new Queue('sms-delivery', {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 8000,   // Retry delays: 8s, 16s, 32s, 64s (~2 mins total)
      },
      removeOnComplete: {
        count: 100,    // Keep last 100 completed jobs for inspection
        age: 3600,     // Remove completed jobs older than 1 hour
      },
      removeOnFail: false,  // Never auto-remove failed jobs
    },
  });

  console.log('[BullMQ] ✓ Queue "sms-delivery" initialized.');
  return smsQueue;
};

module.exports = { getSmsQueue };
