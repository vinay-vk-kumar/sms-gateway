package com.smsgw.com

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.messaging.FirebaseMessaging
import com.smsgw.com.data.ApiClient
import com.smsgw.com.data.SecureStorage
import com.smsgw.com.worker.SmsWorker
import com.smsgw.com.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG                    = "MainActivity"
        private const val REQUEST_SMS_PERMISSION = 100
    }

    private lateinit var binding: ActivityMainBinding

    private var fullFcmToken: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        requestRequiredPermissions()
        loadFcmToken()
        updateStatusDisplay()

        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        binding.btnCopyToken.setOnClickListener {
            if (fullFcmToken.isBlank()) {
                showInfo("FCM token not ready yet — please wait a moment")
                return@setOnClickListener
            }

            // Copy the FULL token (not the truncated display text)
            val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("FCM Token", fullFcmToken))

            // Button feedback: change text → wait → restore
            binding.btnCopyToken.text = "Copied ✓"
            binding.btnCopyToken.isEnabled = false
            lifecycleScope.launch {
                delay(1800)
                binding.btnCopyToken.text = "Copy Token"
                binding.btnCopyToken.isEnabled = true
            }

            // Android 13+ shows its own copy confirmation — avoid double notification
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                showSuccess("FCM Token copied to clipboard")
            } else {
                // Still show our styled snackbar on Android 13+ for consistency
                showSuccess("FCM Token copied")
            }
        }

        binding.btnPollNow.setOnClickListener {
            if (!SecureStorage.isConfigured(this)) {
                showError("Configure Device ID and Secret in Settings first")
                return@setOnClickListener
            }
            runPollCycle()
        }

        val isPollingEnabled = SecureStorage.isContinuousPollingEnabled(this)
        binding.switchPolling.isChecked = isPollingEnabled
        
        if (isPollingEnabled) {
            com.smsgw.com.worker.SmsForegroundService.start(this)
        }
        
        binding.switchPolling.setOnCheckedChangeListener { _, isChecked ->
            SecureStorage.setContinuousPollingEnabled(this, isChecked)
            if (isChecked) {
                com.smsgw.com.worker.SmsForegroundService.start(this)
                showSuccess("Continuous polling started")
            } else {
                com.smsgw.com.worker.SmsForegroundService.stop(this)
                showInfo("Continuous polling stopped")
            }
        }

        SmsWorker.schedulePeriodicPolling(this)
    }

    override fun onResume() {
        super.onResume()
        updateStatusDisplay()
    }

    private fun runPollCycle() {
        binding.btnPollNow.isEnabled = false
        binding.btnPollNow.text = "Polling…"

        lifecycleScope.launch {
            try {
                val messages = withContext(Dispatchers.IO) {
                    ApiClient.fetchPendingMessages(this@MainActivity)
                }

                if (messages.isEmpty()) {
                    showInfo("No pending messages for this device")
                    return@launch
                }

                showInfo("Found ${messages.size} message(s) — sending…")
                binding.btnPollNow.text = "Sending ${messages.size} SMS…"

                val sentIds   = mutableListOf<String>()
                val failedIds = mutableListOf<Pair<String, String>>()

                for (msg in messages) {
                    val (ok, reason) = withContext(Dispatchers.IO) {
                        SmsWorker.sendSmsPublic(applicationContext, msg.to, msg.message)
                    }
                    if (ok) {
                        sentIds.add(msg.id)
                        try { withContext(Dispatchers.IO) { ApiClient.markSent(this@MainActivity, listOf(msg.id)) } } catch (e: Exception) {}
                    } else {
                        failedIds.add(Pair(msg.id, reason))
                        try { withContext(Dispatchers.IO) { ApiClient.markFailed(this@MainActivity, msg.id, reason) } } catch (e: Exception) {}
                    }
                }

                val now = SimpleDateFormat("HH:mm, d MMM", Locale.getDefault()).format(Date())
                SecureStorage.saveLastPollTime(this@MainActivity, now)
                updateStatusDisplay()

                val summary = buildString {
                    if (sentIds.isNotEmpty())   append("${sentIds.size} sent")
                    if (failedIds.isNotEmpty()) {
                        if (isNotEmpty()) append(", ")
                        append("${failedIds.size} failed")
                    }
                }

                if (failedIds.isEmpty()) showSuccess("Done — $summary")
                else                     showError("Done — $summary")

            } catch (e: ApiClient.AuthException) {
                showError(e.message ?: "Authentication error — check Settings")
                Log.e(TAG, "Auth error: ${e.message}")
            } catch (e: java.io.IOException) {
                val url = SecureStorage.getServerUrl(this@MainActivity)
                showError("Cannot reach server — check connection")
                Log.e(TAG, "Network error: ${e.message} ($url)")
            } catch (e: Exception) {
                showError("Unexpected error — please try again")
                Log.e(TAG, "Poll error", e)
            } finally {
                binding.btnPollNow.isEnabled = true
                binding.btnPollNow.text      = "Poll Now"
            }
        }
    }

    private fun updateStatusDisplay() {
        val configured = SecureStorage.isConfigured(this)
        val deviceId   = SecureStorage.getDeviceId(this)
        val serverUrl  = SecureStorage.getServerUrl(this)
        val lastPoll   = SecureStorage.getLastPollTime(this)

        if (configured) {
            binding.ivStatusDot.setImageResource(R.drawable.status_dot_green)
            binding.tvStatus.text = "Device Configured"
            binding.tvStatus.setTextColor(0xFF4ade80.toInt())
            binding.tvDeviceId.text = "ID: ${deviceId.take(8)}…${deviceId.takeLast(4)}"
            binding.tvServer.text   = serverUrl
            binding.cardSetup.visibility = View.GONE

            if (lastPoll.isNotBlank()) {
                binding.tvLastSync.visibility = View.VISIBLE
                binding.tvLastSync.text       = "Last synced: $lastPoll"
            } else {
                binding.tvLastSync.visibility = View.GONE
            }
        } else {
            binding.ivStatusDot.setImageResource(R.drawable.status_dot_amber)
            binding.tvStatus.text = "Not Configured"
            binding.tvStatus.setTextColor(0xFFfbbf24.toInt())
            binding.tvDeviceId.text = "Open Settings to connect this device"
            binding.tvServer.text   = ""
            binding.tvLastSync.visibility = View.GONE
            binding.cardSetup.visibility  = View.VISIBLE
        }
    }

    private fun loadFcmToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.e(TAG, "FCM token failed: ${task.exception?.message}")
                binding.tvFcmToken.text = "Failed to load token\n(Check google-services.json)"
                return@addOnCompleteListener
            }

            fullFcmToken = task.result          // Store FULL token for copying
            SecureStorage.saveFcmToken(this, fullFcmToken)

            // Display truncated preview — full token copied via button
            binding.tvFcmToken.text =
                "${fullFcmToken.take(40)}…\n(tap Copy Token for the full value)"
        }
    }

    private fun requestRequiredPermissions() {
        val needed = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.SEND_SMS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), REQUEST_SMS_PERMISSION)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_SMS_PERMISSION) {
            val smsIndex = permissions.indexOf(Manifest.permission.SEND_SMS)
            if (smsIndex != -1 && grantResults[smsIndex] == PackageManager.PERMISSION_GRANTED) {
                showSuccess("SMS permission granted")
            } else {
                showError("SMS permission required — grant it in Settings → Apps → SMS Gateway → Permissions")
            }
        }
    }

    private fun showSuccess(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT)
            .setBackgroundTint(0xFF0d2218.toInt())
            .setTextColor(0xFF4ade80.toInt())
            .show()
    }

    private fun showError(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG)
            .setBackgroundTint(0xFF2a0f0f.toInt())
            .setTextColor(0xFFf87171.toInt())
            .setAction("OK") {}
            .setActionTextColor(0xFFf87171.toInt())
            .show()
    }

    private fun showInfo(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT)
            .setBackgroundTint(0xFF111827.toInt())
            .setTextColor(0xFF818cf8.toInt())
            .show()
    }
}
