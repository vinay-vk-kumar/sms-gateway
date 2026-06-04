const admin = require('firebase-admin');

let initialized = false;
const initializeFirebase = () => {
  if (initialized) return;

  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountB64) {
    console.warn('[Firebase] ⚠ FIREBASE_SERVICE_ACCOUNT not set. FCM push will not work.');
    console.warn('[Firebase] Android WorkManager polling will handle SMS delivery instead.');
    return;
  }

  try {
    // Decode base64 → parse JSON
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

const sendFcmToDevice = async (fcmToken, deviceId, count) => {
  if (!initialized) {
    console.warn('[FCM] Firebase not initialized — skipping push. WorkManager fallback active.');
    return false;
  }

  try {
    const message = {
      token: fcmToken,
      // Data-only payload — no notification body
      data: {
        type: 'SMS_PENDING',
        deviceId: String(deviceId),
        count: String(count),
      },
      android: {
        priority: 'high',       // Wakes device even in Doze mode
        ttl: 300000,            // 5 minutes in milliseconds — drop if stale
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] ✓ Push sent to device ${deviceId}. Message ID: ${response}`);
    return true;
  } catch (err) {
    // NEVER throw — FCM failure is expected and handled by WorkManager fallback
    console.error(`[FCM] ✗ Failed to send to device ${deviceId}:`, err.message);
    // Detailed diagnosis — log code + errorInfo so we can identify the root cause
    if (err.code) console.error(`[FCM]    Error code:   ${err.code}`);
    if (err.errorInfo) console.error(`[FCM]    Error info:   ${JSON.stringify(err.errorInfo)}`);
    console.error(`[FCM]    Token prefix: ${fcmToken ? fcmToken.substring(0, 40) : 'null'}...`);
    return false;
  }
};

module.exports = { initializeFirebase, sendFcmToDevice };
