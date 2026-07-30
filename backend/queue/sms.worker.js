const { Worker } = require('bullmq');
const { getRedisConfig } = require('../config/redis');
const { sendFcmToDevice } = require('../config/firebase.config');
const Device = require('../models/Device');

let worker = null;

const initSmsWorker = () => {
  if (worker) return worker;

  const connection = getRedisConfig();

  worker = new Worker(
    'sms-delivery',
    async (job) => {
      const { smsId, deviceId, fcmToken, pendingCount } = job.data;

      if (Date.now() - job.timestamp > 120000) {
        console.warn(`[Worker] Job ${job.id} expired (stuck > 2 mins) — failing SMS immediately.`);
        const SmsQueue = require('../models/SmsQueue');
        await SmsQueue.findOneAndUpdate(
          { _id: smsId, status: { $ne: 'sent' } },
          { status: 'failed', error: 'Delivery timed out (2 minutes limit)' }
        );
        return { skipped: true, reason: 'expired' };
      }

      const SmsQueue = require('../models/SmsQueue');
      const currentSms = await SmsQueue.findById(smsId);
      if (currentSms && currentSms.status === 'sent') {
        console.log(`[Worker] Job ${job.id} was already marked sent by a delayed webhook. Resolving.`);
        return { success: true, reason: 'already_sent' };
      }

      console.log(`[Worker] Processing job ${job.id} → device ${deviceId}, ${pendingCount} pending`);

      const device = await Device.findById(deviceId);

      if (!device) {
        console.warn(`[Worker] Device ${deviceId} not found — failing SMS immediately.`);
        const SmsQueue = require('../models/SmsQueue');
        await SmsQueue.findByIdAndUpdate(smsId, { status: 'failed', error: 'Device was deleted' });
        return { skipped: true, reason: 'device_not_found' };
      }

      if (!device.isActive) {
        console.warn(`[Worker] Device ${deviceId} is inactive — failing SMS immediately.`);
        const SmsQueue = require('../models/SmsQueue');
        await SmsQueue.findByIdAndUpdate(smsId, { status: 'failed', error: 'Device is deactivated' });
        return { skipped: true, reason: 'device_inactive' };
      }

      const tokenToUse = device.fcmToken || fcmToken;

      const smsData = { ...job.data, jobId: job.id };
      const fcmSuccess = await sendFcmToDevice(tokenToUse, deviceId, smsData);

      if (!fcmSuccess) {
        throw new Error(`FCM push failed for device ${deviceId}`);
      }

      console.log(`[Worker] FCM pushed. Awaiting webhook for job ${job.id}...`);

      const Redis = require('ioredis');
      const subscriber = new Redis(connection);
      const channel = `webhook:${job.id}`;

      try {
        await subscriber.subscribe(channel);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout (20s) awaiting webhook for job ${job.id}`));
          }, 20000);

          subscriber.on('message', (chan, message) => {
            if (chan === channel) {
              clearTimeout(timeout);
              if (message === 'SUCCESS') {
                resolve();
              } else {
                reject(new Error(`Webhook reported failure: ${message}`));
              }
            }
          });
        });
        console.log(`[Worker] ✓ Webhook received for job ${job.id}`);
      } finally {
        await subscriber.quit();
      }

      return { success: true, deviceId };
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on('completed', (job, result) => {
    if (result?.skipped) {
      console.log(`[Worker] Job ${job.id} skipped: ${result.reason}`);
    } else {
      console.log(`[Worker] Job ${job.id} completed successfully.`);
    }
  });

  worker.on('failed', (job, err) => {
    // job may be undefined if the worker itself crashed before job was assigned
    if (!job) {
      console.error('[Worker] Unknown job failed:', err.message);
      return;
    }

    const maxAttempts = job.opts?.attempts ?? 24;

    // Update the retry count on the dashboard in real-time, but NEVER overwrite a 'sent' status
    const SmsQueue = require('../models/SmsQueue');
    const newStatus = job.attemptsMade >= maxAttempts ? 'failed' : 'pending';

    SmsQueue.findOneAndUpdate(
      { _id: job.data.smsId, status: { $ne: 'sent' } },
      {
        retries: job.attemptsMade,
        status: newStatus,
        error: err.message
      }
    ).catch(e => console.error('[Worker] Failed to update MongoDB:', e.message));

    console.error(
      `[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}/${maxAttempts}): ${err.message}`
    );

    if (job.attemptsMade >= maxAttempts) {
      console.warn(
        `[Worker] Job ${job.id} permanently failed after ${maxAttempts} attempts. Status marked as failed on dashboard.`
      );
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
  });

  console.log('[BullMQ] ✓ SMS worker started (concurrency: 5).');
  return worker;
};

module.exports = { initSmsWorker };
