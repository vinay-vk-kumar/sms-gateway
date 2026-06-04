package com.smsgw.com.fcm

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.smsgw.com.data.ApiClient
import com.smsgw.com.data.SecureStorage
import com.smsgw.com.worker.SmsWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SmsFirebaseService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "SmsFirebaseService"
    }

    // Coroutine scope tied to this service's lifecycle
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val data = message.data
        val type = data["type"]

        Log.d(TAG, "FCM message received: type=$type, data=$data")

        when (type) {
            
            // Backend sends: { type: "SMS_PENDING", deviceId: "...", count: "3" }
            "SMS_PENDING" -> {
                val pendingCount = data["count"]?.toIntOrNull() ?: 0
                Log.d(TAG, "SMS_PENDING trigger: $pendingCount pending message(s)")

                // Trigger immediate WorkManager job to fetch + deliver
                // We DON'T do the HTTP/SMS work directly here because:
                // 1. onMessageReceived() has a 20-second execution limit from FCM
                // 2. WorkManager handles retries, constraints, and system integration
                SmsWorker.triggerImmediate(applicationContext)
            }

            else -> {
                // Unknown message type — log and ignore
                Log.w(TAG, "Unknown FCM message type: $type")
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed: ${token.take(20)}…")

        val oldToken = SecureStorage.getFcmToken(applicationContext)

        // Save the new token locally
        SecureStorage.saveFcmToken(applicationContext, token)

        // If we have a different old token AND we're configured → notify backend
        if (oldToken != token && SecureStorage.isConfigured(applicationContext)) {
            serviceScope.launch {
                val success = ApiClient.refreshFcmToken(applicationContext, token)
                if (success) {
                    Log.d(TAG, "FCM token update reported to backend ✓")
                } else {
                    Log.w(TAG, "Failed to report FCM token update to backend — WorkManager will still work")
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // serviceScope coroutines are cancelled automatically when scope is cancelled
    }
}
