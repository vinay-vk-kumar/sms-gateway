package com.smsgw.com.data

import android.content.Context
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * ApiClient.kt
 * =============
 * HTTP client for all communication with the SMS Gateway backend.
 *
 * Authentication: Every request includes x-device-id and x-device-secret headers.
 *
 * Endpoints:
 *   GET  /api/sms/pending       → fetch + lock messages as "processing"
 *   POST /api/sms/mark-sent     → report successful delivery (batch)
 *   POST /api/sms/mark-failed   → report delivery failure
 *   PUT  /api/devices/refresh-token → update FCM token on rotation
 */
object ApiClient {

    private const val TAG      = "ApiClient"
    private val JSON_TYPE      = "application/json; charset=utf-8".toMediaType()

    /** Thrown when the server rejects credentials (401/403). */
    class AuthException(message: String) : Exception(message)

    // Singleton OkHttp client — thread-safe, efficient connection pooling
    private val httpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    data class SmsMessage(
        val id:      String,
        val to:      String,
        val message: String,
        val type:    String
    )

    // ── API methods ───────────────────────────────────────────────────────────

    /**
     * Send webhook callback to resolve the BullMQ job.
     */
    fun sendWebhook(context: Context, jobId: String, smsId: String, success: Boolean, reason: String): Boolean {
        val serverUrl    = SecureStorage.getServerUrl(context)
        val deviceId     = SecureStorage.getDeviceId(context)
        val deviceSecret = SecureStorage.getDeviceSecret(context)

        if (!SecureStorage.isConfigured(context)) {
            Log.e(TAG, "Cannot send webhook: Device not configured.")
            return false
        }

        val body = JSONObject()
            .put("status", if (success) "sent" else "failed")
            .put("smsId", smsId)
            .put("error", reason)
            .toString()

        val request = Request.Builder()
            .url("$serverUrl/api/sms/webhook/$jobId")
            .addHeader("x-device-id", deviceId)
            .addHeader("x-device-secret", deviceSecret)
            .post(body.toRequestBody(JSON_TYPE))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.e(TAG, "sendWebhook failed: ${response.code}")
            }
            response.body?.close()
            response.isSuccessful
        } catch (e: IOException) {
            Log.e(TAG, "Network error sending webhook: ${e.message}")
            false
        }
    }

    /**
     * Notify backend that the FCM token has changed.
     * Firebase rotates tokens periodically — keep backend in sync.
     */
    fun refreshFcmToken(context: Context, newFcmToken: String): Boolean {
        if (!SecureStorage.isConfigured(context)) return false

        val serverUrl    = SecureStorage.getServerUrl(context)
        val deviceId     = SecureStorage.getDeviceId(context)
        val deviceSecret = SecureStorage.getDeviceSecret(context)

        val body = JSONObject().put("newFcmToken", newFcmToken).toString()

        val request = Request.Builder()
            .url("$serverUrl/api/devices/refresh-token")
            .addHeader("x-device-id", deviceId)
            .addHeader("x-device-secret", deviceSecret)
            .put(body.toRequestBody(JSON_TYPE))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.e(TAG, "refreshFcmToken failed: ${response.code}")
            }
            response.body?.close()
            response.isSuccessful
        } catch (e: IOException) {
            Log.e(TAG, "Network error refreshing FCM token: ${e.message}")
            false
        }
    }
}
