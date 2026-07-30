package com.smsgw.com

import android.app.Application
import android.util.Log


/**
 * SmsGatewayApp.kt
 * =================
 * Application class — the entry point for every process start.
 *
 * REGISTERED IN:
 *   AndroidManifest.xml → <application android:name=".SmsGatewayApp">
 */
class SmsGatewayApp : Application() {

    companion object {
        private const val TAG = "SmsGatewayApp"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Application started")
    }
}
