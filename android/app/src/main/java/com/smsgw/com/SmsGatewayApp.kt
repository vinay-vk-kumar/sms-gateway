package com.smsgw.com

import android.app.Application
import android.util.Log
import com.smsgw.com.worker.SmsWorker

/**
 * SmsGatewayApp.kt
 * =================
 * Application class — the entry point for every process start.
 *
 * WHY THIS IS NEEDED:
 *   WorkManager's PeriodicWorkRequest survives device restarts (it's persisted
 *   to a Room DB), BUT the scheduling is re-initialized by WorkManager itself
 *   using Android's boot receiver. However, our custom scheduling logic
 *   (ExistingPeriodicWorkPolicy.KEEP) must be called at least once to register
 *   the job. The Application class ensures it runs on EVERY process start —
 *   including after:
 *     - Device reboot
 *     - App update (APK install)
 *     - System killing the process for battery optimization
 *     - Manual force-stop + reopen
 *
 * WHAT IT DOES:
 *   Calls SmsWorker.schedulePeriodicPolling() with KEEP policy — safe to call
 *   multiple times (idempotent). If already scheduled, Android ignores the call.
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
        Log.d(TAG, "Application started — registering WorkManager periodic polling")

        // Register 15-minute periodic polling — safe to call multiple times.
        // ExistingPeriodicWorkPolicy.KEEP: if already scheduled, this is a no-op.
        // This is the fallback delivery mechanism when FCM pushes fail/miss.
        SmsWorker.schedulePeriodicPolling(this)

        Log.d(TAG, "WorkManager periodic polling registered ✓")
    }
}
