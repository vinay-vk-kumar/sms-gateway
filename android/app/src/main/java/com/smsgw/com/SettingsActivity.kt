package com.smsgw.com

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.snackbar.Snackbar
import com.smsgw.com.data.SecureStorage
import com.smsgw.com.databinding.ActivitySettingsBinding


class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Custom back button (we no longer use the ActionBar)
        binding.btnBack.setOnClickListener { finish() }

        // ── Pre-fill existing values ──────────────────────────────────────────
        binding.etServerUrl.setText(SecureStorage.getServerUrl(this))
        binding.etDeviceId.setText(SecureStorage.getDeviceId(this))

        // Hint changes based on whether a secret is already stored
        binding.etDeviceSecret.hint = if (SecureStorage.getDeviceSecret(this).isNotBlank())
            "Secret saved — enter new one to change"
        else
            "Paste device secret from dashboard"

        // ── Save button ───────────────────────────────────────────────────────
        binding.btnSave.setOnClickListener {
            val serverUrl    = binding.etServerUrl.text.toString().trim()
            val deviceId     = binding.etDeviceId.text.toString().trim()
            val deviceSecret = binding.etDeviceSecret.text.toString().trim()

            // Validation
            if (serverUrl.isBlank()) {
                binding.etServerUrl.error = "Server URL is required"
                return@setOnClickListener
            }
            if (!serverUrl.startsWith("http")) {
                binding.etServerUrl.error = "Must start with http:// or https://"
                return@setOnClickListener
            }
            if (deviceId.isBlank()) {
                binding.etDeviceId.error = "Device ID is required"
                return@setOnClickListener
            }
            if (deviceId.length != 24) {
                binding.etDeviceId.error = "Must be 24 characters (MongoDB ObjectId)"
                return@setOnClickListener
            }

            // Save
            SecureStorage.saveServerUrl(this, serverUrl)

            val existingSecret = SecureStorage.getDeviceSecret(this)
            when {
                deviceSecret.isNotBlank() -> {
                    // New secret entered
                    SecureStorage.saveCredentials(this, deviceId, deviceSecret)
                    showSuccess("Credentials saved")
                }
                existingSecret.isNotBlank() -> {
                    // Keep existing secret, update ID and URL only
                    SecureStorage.saveCredentials(this, deviceId, existingSecret)
                    showSuccess("Settings updated")
                }
                else -> {
                    binding.etDeviceSecret.error = "Device secret is required — copy from dashboard"
                    return@setOnClickListener
                }
            }

            finish()
        }

        // ── Clear button ──────────────────────────────────────────────────────
        binding.btnClear.setOnClickListener {
            SecureStorage.clearCredentials(this)
            binding.etDeviceId.setText("")
            binding.etDeviceSecret.setText("")
            binding.etDeviceSecret.hint = "Paste device secret from dashboard"
            showError("Credentials cleared")
        }
    }

    // ── Styled Snackbar helpers ───────────────────────────────────────────────

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
            .show()
    }
}
