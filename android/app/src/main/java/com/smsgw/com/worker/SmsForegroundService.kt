package com.smsgw.com.worker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.smsgw.com.R
import kotlinx.coroutines.*

class SmsForegroundService : Service() {

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d("SmsForegroundService", "Service started")
        
        // 1. Start foreground immediately with a persistent notification
        startForeground(NOTIFICATION_ID, buildNotification())

        // 2. Launch the 30-second polling loop
        serviceScope.launch {
            while (isActive) {
                Log.d("SmsForegroundService", "Polling backend (30s interval)")
                // Trigger the actual SmsWorker to do the heavy lifting
                SmsWorker.triggerImmediate(applicationContext)
                
                // Wait 30 seconds
                delay(30_000)
            }
        }

        // START_STICKY tells the OS to recreate the service if it runs low on memory
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d("SmsForegroundService", "Service destroyed")
        serviceJob.cancel() // Stop the polling loop
    }

    override fun onBind(intent: Intent?): IBinder? {
        // We don't use binding for this service
        return null
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SMS Gateway is running")
            .setContentText("Continuous polling is active (every 30s)")
            .setSmallIcon(R.mipmap.ic_launcher_round)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Continuous Polling Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the app alive to process SMS instantly"
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    companion object {
        private const val CHANNEL_ID = "sms_foreground_service_channel"
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, SmsForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, SmsForegroundService::class.java)
            context.stopService(intent)
        }
    }
}
