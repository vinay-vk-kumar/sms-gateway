package com.smsgw.com.fcm

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.smsgw.com.data.ApiClient
import com.smsgw.com.data.SecureStorage

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
            // Backend sends full SMS payload
            "SMS_DISPATCH" -> {
                val jobId = data["jobId"]
                val smsId = data["smsId"]
                val to = data["to"]
                val messageText = data["message"]

                if (jobId != null && smsId != null && to != null && messageText != null) {
                    Log.d(TAG, "SMS_DISPATCH trigger: dispatching SMS to $to")
                    
                    // Acquire WakeLock to ensure CPU stays awake while sending
                    val powerManager = getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
                    val wakeLock = powerManager.newWakeLock(
                        android.os.PowerManager.PARTIAL_WAKE_LOCK,
                        "SmsGateway::FcmSmsDispatchWakeLock"
                    )
                    wakeLock.acquire(120 * 1000L /*1 minute max*/)
                    
                    serviceScope.launch {
                        try {
                            // Send SMS
                            val smsManager = android.telephony.SmsManager.getDefault()
                            
                            val parts = smsManager.divideMessage(messageText)
                            if (parts.size > 1) {
                                smsManager.sendMultipartTextMessage(to, null, parts, null, null)
                            } else {
                                smsManager.sendTextMessage(to, null, messageText, null, null)
                            }
                            
                            // Log locally as SENT
                            com.smsgw.com.data.SmsLogDbHelper(applicationContext).insertLog(smsId, to, messageText, "SENT")

                            // Immediately report success to backend
                            val success = ApiClient.sendWebhook(applicationContext, jobId, smsId, true, "Delivered")
                            if (success) {
                                Log.d(TAG, "SMS $smsId reported as SENT")
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error sending SMS: ${e.message}")
                            // Log locally as FAILED
                            com.smsgw.com.data.SmsLogDbHelper(applicationContext).insertLog(smsId, to, messageText, "FAILED")
                            ApiClient.sendWebhook(applicationContext, jobId, smsId, false, e.message ?: "Unknown error")
                        } finally {
                            if (wakeLock.isHeld) {
                                wakeLock.release()
                            }
                        }
                    }
                } else {
                    Log.e(TAG, "Invalid SMS_DISPATCH payload: $data")
                }
            }
            "FORCE_LOGOUT" -> {
                Log.w(TAG, "FORCE_LOGOUT received: wiping local credentials")
                SecureStorage.clearCredentials(applicationContext)
                
                // Send broadcast to update UI if app is open
                val intent = android.content.Intent("com.smsgw.com.DEVICE_DELETED")
                androidx.localbroadcastmanager.content.LocalBroadcastManager.getInstance(applicationContext).sendBroadcast(intent)
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
                    Log.w(TAG, "Failed to report FCM token update to backend")
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // serviceScope coroutines are cancelled automatically when scope is cancelled
    }
}
