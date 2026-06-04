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
     * Fetch pending SMS messages for this device.
     * Backend atomically marks them as "processing" to prevent race conditions.
     */
    fun fetchPendingMessages(context: Context): List<SmsMessage> {
        val serverUrl    = SecureStorage.getServerUrl(context)
        val deviceId     = SecureStorage.getDeviceId(context)
        val deviceSecret = SecureStorage.getDeviceSecret(context)

        if (!SecureStorage.isConfigured(context)) {
            throw AuthException("No credentials saved. Open Settings and enter Device ID + Secret.")
        }

        val request = Request.Builder()
            .url("$serverUrl/api/sms/pending")
            .addHeader("x-device-id", deviceId)
            .addHeader("x-device-secret", deviceSecret)
            .get()
            .build()

        // Let IOException propagate — caller shows "cannot reach server" message
        val response = httpClient.newCall(request).execute()
        val bodyStr  = response.body?.string() ?: "{}"

        if (response.code == 401 || response.code == 403) {
            Log.e(TAG, "Auth failed (${response.code})")
            throw AuthException("Wrong Device ID or Secret (${response.code}). Check Settings.")
        }

        if (!response.isSuccessful) {
            Log.e(TAG, "fetchPendingMessages server error: ${response.code}")
            throw IOException("Server error ${response.code}")
        }

        val json     = JSONObject(bodyStr)
        val data     = json.optJSONObject("data") ?: return emptyList()
        val messages = data.optJSONArray("messages") ?: return emptyList()

        val result = mutableListOf<SmsMessage>()
        for (i in 0 until messages.length()) {
            val m = messages.getJSONObject(i)
            result.add(SmsMessage(
                id      = m.getString("_id"),
                to      = m.getString("to"),
                message = m.getString("message"),
                type    = m.optString("type", "custom")
            ))
        }
        return result
    }

    /**
     * Mark multiple messages as successfully delivered.
     * IDEMPOTENT — safe to call multiple times.
     */
    fun markSent(context: Context, ids: List<String>): Boolean {
        if (ids.isEmpty()) return true

        val serverUrl    = SecureStorage.getServerUrl(context)
        val deviceId     = SecureStorage.getDeviceId(context)
        val deviceSecret = SecureStorage.getDeviceSecret(context)

        val body = JSONObject().put("ids", JSONArray(ids)).toString()

        val request = Request.Builder()
            .url("$serverUrl/api/sms/mark-sent")
            .addHeader("x-device-id", deviceId)
            .addHeader("x-device-secret", deviceSecret)
            .post(body.toRequestBody(JSON_TYPE))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.e(TAG, "markSent failed: ${response.code}")
            }
            response.body?.close()
            response.isSuccessful
        } catch (e: IOException) {
            Log.e(TAG, "Network error marking sent: ${e.message}")
            false
        }
    }

    /**
     * Mark a single message as failed.
     * Retry logic is handled server-side (max 3 attempts before permanently failed).
     */
    fun markFailed(context: Context, id: String, reason: String): Boolean {
        val serverUrl    = SecureStorage.getServerUrl(context)
        val deviceId     = SecureStorage.getDeviceId(context)
        val deviceSecret = SecureStorage.getDeviceSecret(context)

        val body = JSONObject()
            .put("id", id)
            .put("error", reason)
            .toString()

        val request = Request.Builder()
            .url("$serverUrl/api/sms/mark-failed")
            .addHeader("x-device-id", deviceId)
            .addHeader("x-device-secret", deviceSecret)
            .post(body.toRequestBody(JSON_TYPE))
            .build()

        return try {
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                Log.e(TAG, "markFailed for $id failed: ${response.code}")
            }
            response.body?.close()
            response.isSuccessful
        } catch (e: IOException) {
            Log.e(TAG, "Network error marking failed: ${e.message}")
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
