

const { Worker } = require('bullmq');
const { getRedisConfig } = require('../config/redis');
const { getDlQueue } = require('./sms.queue');
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

      console.log(`[Worker] Processing job ${job.id} → device ${deviceId}, ${pendingCount} pending`);

      const device = await Device.findById(deviceId);

      if (!device) {
        // Device deleted — give up but don't fail the SMS
        console.warn(`[Worker] Device ${deviceId} not found — skipping FCM. WorkManager will handle it.`);
        return { skipped: true, reason: 'device_not_found' };
      }

      if (!device.isActive) {
        // Device deactivated by user — stop trying to push to it
        console.warn(`[Worker] Device ${deviceId} is inactive — skipping FCM push.`);
        return { skipped: true, reason: 'device_inactive' };
      }

      // Use the stored fcmToken (may be newer than job data if it was refreshed)
      const tokenToUse = device.fcmToken || fcmToken;
      const fcmSuccess = await sendFcmToDevice(tokenToUse, deviceId, pendingCount);

      if (!fcmSuccess) {
        // Throw to trigger BullMQ retry with exponential backoff
        // After 3 retries, the failed event fires → we move to DLQ
        throw new Error(`FCM push failed for device ${deviceId}`);
      }

      console.log(`[Worker] ✓ FCM push succeeded for device ${deviceId}`);
      return { success: true, deviceId };
    },
    {
      connection,
      concurrency: 5,
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

    const maxAttempts = job.opts?.attempts ?? 3;
    console.error(
      `[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}/${maxAttempts}): ${err.message}`
    );

    // SMS stays "pending" in MongoDB — WorkManager polling will deliver it.
    // The DLQ entry is for admin inspection and optional manual retry.
    if (job.attemptsMade >= maxAttempts) {
      console.warn(
        `[Worker] Job ${job.id} permanently failed after ${maxAttempts} attempts. Moving to DLQ.`
      );
      handlePermanentFailure(job, err);
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err.message);
  });

  console.log('[BullMQ] ✓ SMS worker started (concurrency: 5).');
  return worker;
};

const handlePermanentFailure = async (job, finalErr) => {
  try {
    const dlQueue = getDlQueue();

    await dlQueue.add('failed-fcm-job', {
      originalJobId: job.id,
      ...job.data,
      failedAt: new Date().toISOString(),
      errorMessage: finalErr.message,
      note: 'FCM delivery failed after 3 attempts. SMS is still PENDING in MongoDB. WorkManager polling will deliver it.',
    });

    console.log(`[Worker] Job ${job.id} moved to dead letter queue.`);
    console.log('[Worker] NOTE: SMS remains pending — WorkManager will deliver via polling.');
  } catch (dlqErr) {
    console.error('[Worker] Failed to move job to DLQ:', dlqErr.message);
  }
};

module.exports = { initSmsWorker, handlePermanentFailure };
