/**
 * queue/sms.queue.js
 * ===================
 * BullMQ Queue setup for SMS delivery triggering.
 *
 * PURPOSE:
 *   BullMQ is used ONLY to trigger FCM push notifications.
 *   It does NOT store SMS data — MongoDB is the source of truth.
 *   If FCM fails after all retries, the SMS stays "pending" in MongoDB
 *   and WorkManager (Android) will pick it up via 15-min polling.
 *
 * QUEUES:
 *   "sms-delivery"      → main queue, jobs trigger FCM pushes
 *   "sms-failed-jobs"   → dead letter queue, jobs that failed all 3 FCM attempts
 *
 * WORKER:
 *   Started via initSmsWorker() — called from server.js on startup.
 *   Concurrency: 5 (can process 5 FCM pushes simultaneously)
 *
 * Usage:
 *   const { getSmsQueue } = require('./queue/sms.queue');
 *   const q = getSmsQueue();
 *   await q.add('send-sms', jobData, jobOptions);
 */

const { Queue } = require('bullmq');
const { getRedisConfig } = require('../config/redis');

let smsQueue = null;
let dlQueue = null;

const getSmsQueue = () => {
  if (smsQueue) return smsQueue;

  const connection = getRedisConfig();
  smsQueue = new Queue('sms-delivery', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,   // Retry delays: 5s, 10s, 20s
      },
      removeOnComplete: {
        count: 100,    // Keep last 100 completed jobs for inspection
        age: 3600,     // Remove completed jobs older than 1 hour
      },
      removeOnFail: false,  // Never auto-remove failed jobs (inspected in DLQ)
    },
  });

  console.log('[BullMQ] ✓ Queue "sms-delivery" initialized.');
  return smsQueue;
};

const getDlQueue = () => {
  if (dlQueue) return dlQueue;

  const connection = getRedisConfig();
  dlQueue = new Queue('sms-failed-jobs', {
    connection,
    defaultJobOptions: {
      removeOnComplete: false,  // Keep ALL completed DLQ jobs
      removeOnFail: false,
    },
  });

  console.log('[BullMQ] ✓ Dead letter queue "sms-failed-jobs" initialized.');
  return dlQueue;
};

module.exports = { getSmsQueue, getDlQueue };
