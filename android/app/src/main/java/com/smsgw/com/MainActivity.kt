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
import android.provider.Settings
import android.net.Uri
import android.os.PowerManager
import com.smsgw.com.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanIntentResult
import com.journeyapps.barcodescanner.ScanOptions
import org.json.JSONObject
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG                    = "MainActivity"
        private const val REQUEST_SMS_PERMISSION = 100
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var loadingOverlay: android.view.View
    private lateinit var loadingContent: android.view.View

    private var fullFcmToken: String = ""

    private val deviceDeletedReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.smsgw.com.DEVICE_DELETED") {
                // Show loader overlay during device removal handling
                runOnUiThread { showLoadingOverlay(true) }
                lifecycleScope.launch {
                    delay(1500)
                    runOnUiThread { 
                        showLoadingOverlay(false)
                        showError("Device was removed from the dashboard.")
                        updateStatusDisplay()
                    }
                }
            }
        }
    }

    private fun showLoadingOverlay(show: Boolean) {
        if (show) {
            loadingOverlay.visibility = View.VISIBLE
            loadingContent.visibility = View.VISIBLE
        } else {
            loadingOverlay.visibility = View.GONE
            loadingContent.visibility = View.GONE
        }
    }

    private val qrScannerLauncher = registerForActivityResult(ScanContract()) { result: ScanIntentResult ->
        if (result.contents != null) {
            handleQrCode(result.contents)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        // Initialize loader overlay views
        loadingOverlay = findViewById(R.id.loadingOverlay)
        loadingContent = findViewById(R.id.loadingContent)

        requestRequiredPermissions()
        loadFcmToken()
        updateStatusDisplay()

        androidx.localbroadcastmanager.content.LocalBroadcastManager.getInstance(this).registerReceiver(
            deviceDeletedReceiver,
            android.content.IntentFilter("com.smsgw.com.DEVICE_DELETED")
        )

        binding.btnLogs.setOnClickListener {
            startActivity(Intent(this, LogsActivity::class.java))
        }
        
        binding.btnScanQr.setOnClickListener {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                startQrScanner()
            } else {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 101)
            }
        }

        binding.btnGrantPermissions.setOnClickListener {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            val uri = Uri.fromParts("package", packageName, null)
            intent.data = uri
            startActivity(intent)
        }


        requestBatteryOptimizationIgnore()
    }

    private fun requestBatteryOptimizationIgnore() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent().apply {
                    action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = Uri.parse("package:$packageName")
                }
                try {
                    startActivity(intent)
                } catch (e: Exception) {
                    Log.e(TAG, "Battery optimization intent failed: ${e.message}")
                }
            } else {
                // If they already ignored battery optimization, ask them to check AutoStart
                // (Only really necessary for Xiaomi/Oppo/Vivo)
                com.smsgw.com.utils.AutoStartHelper.requestAutoStartPermissions(this)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatusDisplay()
    }

    override fun onDestroy() {
        super.onDestroy()
        androidx.localbroadcastmanager.content.LocalBroadcastManager.getInstance(this).unregisterReceiver(deviceDeletedReceiver)
    }



    private fun updateStatusDisplay() {
        // Hide loader if visible
        showLoadingOverlay(false)
        val configured = SecureStorage.isConfigured(this)
        val deviceId   = SecureStorage.getDeviceId(this)
        val serverUrl  = SecureStorage.getServerUrl(this)
        val hasSmsPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

        if (!hasSmsPermission) {
            binding.ivStatusDot.setImageResource(R.drawable.status_dot_amber)
            binding.tvStatus.text = "Permission Missing"
            binding.tvStatus.setTextColor(0xFFf87171.toInt())
            binding.tvDeviceId.text = "SMS Permission is required to send messages"
            binding.tvServer.text   = ""
            binding.tvLastSync.visibility = View.GONE
            binding.cardSetup.visibility  = View.GONE
            binding.cardPermissions.visibility = View.VISIBLE
        } else if (configured) {
            binding.ivStatusDot.setImageResource(R.drawable.status_dot_green)
            binding.tvStatus.text = "Device Configured"
            binding.tvStatus.setTextColor(0xFF4ade80.toInt())
            binding.tvDeviceId.text = "ID: ${deviceId.take(8)}…${deviceId.takeLast(4)}"
            binding.tvServer.text   = serverUrl
            binding.cardSetup.visibility = View.GONE
            binding.cardPermissions.visibility = View.GONE
            binding.tvLastSync.visibility = View.GONE
        } else {
            binding.ivStatusDot.setImageResource(R.drawable.status_dot_amber)
            binding.tvStatus.text = "Not Configured"
            binding.tvStatus.setTextColor(0xFFfbbf24.toInt())
            binding.tvDeviceId.text = "Scan QR code to connect this device"
            binding.tvServer.text   = ""
            binding.tvLastSync.visibility = View.GONE
            binding.cardSetup.visibility  = View.VISIBLE
            binding.cardPermissions.visibility = View.GONE
        }
    }

    private fun loadFcmToken() {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.e(TAG, "FCM token failed: ${task.exception?.message}")
                return@addOnCompleteListener
            }

            fullFcmToken = task.result          // Store FULL token for copying
            SecureStorage.saveFcmToken(this, fullFcmToken)
        }
    }

    private fun requestRequiredPermissions() {
        val needed = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
            != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.SEND_SMS)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.READ_PHONE_STATE)
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
        } else if (requestCode == 101) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startQrScanner()
            } else {
                showError("Camera permission is required to scan QR code")
            }
        }
    }

    private fun startQrScanner() {
        val options = ScanOptions()
        options.setDesiredBarcodeFormats(ScanOptions.QR_CODE)
        options.setPrompt("") // Custom layout handles prompt
        options.setBeepEnabled(false)
        options.setBarcodeImageEnabled(false)
        options.setCaptureActivity(CustomScannerActivity::class.java)
        qrScannerLauncher.launch(options)
    }

    private fun handleQrCode(jsonString: String) {
        lifecycleScope.launch {
            try {
                val json = JSONObject(jsonString)
                if (json.optString("action") != "smsgw_pair") {
                    showError("Invalid QR Code")
                    return@launch
                }
                
                val token = json.getString("token")
                val url = json.getString("url")
                
                showInfo("Pairing device...")
                
                var errorMessage = "Failed to pair device"
                val success = withContext(Dispatchers.IO) {
                    try {
                        val client = OkHttpClient()
                        val reqJson = JSONObject().apply {
                            put("pairingToken", token)
                            put("fcmToken", fullFcmToken.ifEmpty { "dummy_fcm_token_for_dev_mode_or_missing" })
                            put("deviceName", Build.MODEL ?: "Android Device")
                        }
                        
                        val body = reqJson.toString().toRequestBody("application/json".toMediaTypeOrNull())
                        val request = Request.Builder()
                            .url("$url/api/devices/pair")
                            .post(body)
                            .build()
                            
                        client.newCall(request).execute().use { response ->
                            val resString = response.body?.string() ?: ""
                            if (!response.isSuccessful) {
                                try {
                                    val errJson = JSONObject(resString)
                                    errorMessage = errJson.optString("error", "HTTP ${response.code}: $resString")
                                } catch(e:Exception) {
                                    errorMessage = "HTTP ${response.code}: $resString"
                                }
                                return@withContext false
                            }
                            
                            val resJson = JSONObject(resString)
                            if (resJson.optBoolean("success")) {
                                val data = resJson.getJSONObject("data")
                                SecureStorage.saveCredentials(this@MainActivity, data.getString("deviceId"), data.getString("deviceSecret"))
                                SecureStorage.saveServerUrl(this@MainActivity, url)
                                true
                            } else {
                                errorMessage = resJson.optString("error", "Unknown backend error")
                                false
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Pairing error: ${e.message}")
                        errorMessage = e.message ?: "Network error"
                        false
                    }
                }
                
                if (success) {
                    showSuccess("Device paired successfully!")
                    updateStatusDisplay()
                } else {
                    showError(errorMessage)
                }
            } catch (e: Exception) {
                showError("Invalid QR Code Format")
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
        com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
            .setTitle("Error")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .setBackground(android.graphics.drawable.ColorDrawable(0xFF11111C.toInt()))
            .show()
    }

    private fun showInfo(message: String) {
        Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT)
            .setBackgroundTint(0xFF111827.toInt())
            .setTextColor(0xFF818cf8.toInt())
            .show()
    }
}
