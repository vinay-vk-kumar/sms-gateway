package com.smsgw.com.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.smsgw.com.BuildConfig

object SecureStorage {

    private const val TAG        = "SecureStorage"
    private const val PREFS_FILE = "smsgw_prefs"

    private const val KEY_DEVICE_ID      = "device_id"
    private const val KEY_DEVICE_SECRET  = "device_secret"
    private const val KEY_SERVER_URL     = "server_url"
    private const val KEY_FCM_TOKEN      = "fcm_token"

    // Production URL — users can override in Settings
    private const val DEFAULT_SERVER_URL = "https://api.smsgateway.codewithvin.app"

    private fun getPrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_FILE, Context.MODE_PRIVATE)

    fun getDeviceId(ctx: Context): String = try {
        getPrefs(ctx).getString(KEY_DEVICE_ID, "") ?: ""
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read deviceId: ${e.message}")
        ""
    }

    fun getDeviceSecret(ctx: Context): String = try {
        getPrefs(ctx).getString(KEY_DEVICE_SECRET, "") ?: ""
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read deviceSecret: ${e.message}")
        ""
    }

    fun getServerUrl(ctx: Context): String {
        if (!com.smsgw.com.BuildConfig.DEBUG) {
            return DEFAULT_SERVER_URL
        }
        return try {
            getPrefs(ctx).getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read serverUrl: ${e.message}")
            DEFAULT_SERVER_URL
        }
    }

    fun getFcmToken(ctx: Context): String = try {
        getPrefs(ctx).getString(KEY_FCM_TOKEN, "") ?: ""
    } catch (e: Exception) {
        Log.e(TAG, "Failed to read fcmToken: ${e.message}")
        ""
    }

    fun saveCredentials(ctx: Context, deviceId: String, deviceSecret: String) {
        try {
            getPrefs(ctx).edit()
                .putString(KEY_DEVICE_ID, deviceId.trim())
                .putString(KEY_DEVICE_SECRET, deviceSecret.trim())
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save credentials: ${e.message}")
        }
    }

    fun saveServerUrl(ctx: Context, url: String) {
        try {
            getPrefs(ctx).edit()
                .putString(KEY_SERVER_URL, url.trimEnd('/'))
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save serverUrl: ${e.message}")
        }
    }

    fun saveFcmToken(ctx: Context, token: String) {
        try {
            getPrefs(ctx).edit()
                .putString(KEY_FCM_TOKEN, token)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save fcmToken: ${e.message}")
        }
    }

    fun isConfigured(ctx: Context): Boolean {
        val id     = getDeviceId(ctx)
        val secret = getDeviceSecret(ctx)
        return id.isNotBlank() && secret.isNotBlank()
    }

    fun clearCredentials(ctx: Context) {
        try {
            getPrefs(ctx).edit()
                .remove(KEY_DEVICE_ID)
                .remove(KEY_DEVICE_SECRET)
                .remove(KEY_FCM_TOKEN)
                .apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear credentials: ${e.message}")
        }
    }
}
