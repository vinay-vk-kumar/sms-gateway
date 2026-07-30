const admin = require('firebase-admin');

let initialized = false;
const initializeFirebase = () => {
  if (initialized) return;

  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountB64) {
    console.warn('[Firebase] Service account missing. Push delivery disabled.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(
      Buffer.from(serviceAccountB64, 'base64').toString('utf-8')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    initialized = true;
    console.log('[Firebase] ✓ Admin SDK initialized successfully.');
  } catch (err) {
    console.error('[Firebase] ✗ Failed to initialize:', err.message);
    console.error('[Firebase] Check that FIREBASE_SERVICE_ACCOUNT is valid base64 JSON.');
  }
};

const sendFcmToDevice = async (fcmToken, deviceId, smsData) => {
  if (!initialized) {
    console.warn('[FCM] Firebase not initialized — skipping push.');
    return false;
  }

  try {
    const message = {
      token: fcmToken,
      data: {
        type: 'SMS_DISPATCH',
        jobId: String(smsData.jobId),
        smsId: String(smsData.smsId),
        to: String(smsData.to),
        message: String(smsData.message),
        deviceId: String(deviceId)
      },
      android: {
        priority: 'high',       // Wakes device even in Doze mode
        ttl: 120000,            // 120 seconds (2 minutes max delivery window)
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] ✓ Push sent to device ${deviceId}. Message ID: ${response}`);
    return true;
  } catch (err) {
    console.error(`[FCM] ✗ Failed to send to device ${deviceId}:`, err.message);
    if (err.code === 'messaging/registration-token-not-registered') {
      console.warn(`[FCM] App was uninstalled. Marking device ${deviceId} as inactive.`);
      try {
        const Device = require('../models/Device');
        await Device.findByIdAndUpdate(deviceId, { isActive: false });
      } catch (dbErr) {
        console.error(`[FCM] Failed to update device status: ${dbErr.message}`);
      }
    }
    if (err.code) console.error(`[FCM]    Error code:   ${err.code}`);
    if (err.errorInfo) console.error(`[FCM]    Error info:   ${JSON.stringify(err.errorInfo)}`);
    return false;
  }
};

module.exports = { initializeFirebase, sendFcmToDevice, admin };
