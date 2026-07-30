package com.smsgw.com

import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.smsgw.com.data.SmsLogDbHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LogsActivity : AppCompatActivity() {

    private lateinit var dbHelper: SmsLogDbHelper
    private lateinit var logsContainer: LinearLayout
    private lateinit var tvEmptyLogs: TextView
    private lateinit var loadingOverlay: android.view.View
    private lateinit var loadingContent: android.view.View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_logs)

        dbHelper = SmsLogDbHelper(this)
        logsContainer = findViewById(R.id.logsContainer)
        tvEmptyLogs = findViewById(R.id.tvEmptyLogs)
        loadingOverlay = findViewById(R.id.loadingOverlay)
        loadingContent = findViewById(R.id.loadingContent)

        findViewById<MaterialButton>(R.id.btnBack).setOnClickListener { finish() }
        findViewById<TextView>(R.id.btnClearLogs).setOnClickListener {
            val dialogView = layoutInflater.inflate(R.layout.dialog_clear_logs, null)
            val dialog = android.app.AlertDialog.Builder(this)
                .setView(dialogView)
                .create()
            
            dialog.window?.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT))

            dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnCancel).setOnClickListener {
                dialog.dismiss()
            }

            dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDelete).setOnClickListener {
                dbHelper.clearAllLogs()
                loadLogs()
                dialog.dismiss()
            }

            dialog.show()
        }

        loadLogs()
    }

    private fun showLoading(show: Boolean) {
        if (show) {
            loadingOverlay.alpha = 0f
            loadingOverlay.visibility = View.VISIBLE
            loadingOverlay.animate().alpha(1f).setDuration(200).start()
            loadingContent.alpha = 0f
            loadingContent.visibility = View.VISIBLE
            loadingContent.animate().alpha(1f).setDuration(200).start()
        } else {
            loadingOverlay.animate().alpha(0f).setDuration(200).withEndAction { loadingOverlay.visibility = View.GONE }.start()
            loadingContent.animate().alpha(0f).setDuration(200).withEndAction { loadingContent.visibility = View.GONE }.start()
        }
    }

    private fun loadLogs() {
        showLoading(true)
        logsContainer.removeAllViews()
        
        val logs = dbHelper.getAllLogs()
        showLoading(false)
        
        if (logs.isEmpty()) {
            tvEmptyLogs.visibility = View.VISIBLE
        } else {
            tvEmptyLogs.visibility = View.GONE
            val dateFormat = SimpleDateFormat("MMM dd, HH:mm:ss", Locale.getDefault())

            for (log in logs) {
                val logView = LinearLayout(this).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(0, 0, 0, dpToPx(16))
                }

                // Header row: To and Status
                val headerRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    weightSum = 1f
                }

                val toText = TextView(this).apply {
                    text = "To: ${log.recipient}"
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                }

                val statusText = TextView(this).apply {
                    text = log.status
                    setTextColor(if (log.status == "SENT") Color.parseColor("#4ade80") else Color.parseColor("#f87171"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
                    setTypeface(null, android.graphics.Typeface.BOLD)
                }

                headerRow.addView(toText)
                headerRow.addView(statusText)

                // Message Text
                val msgText = TextView(this).apply {
                    text = log.message
                    setTextColor(Color.parseColor("#94A3B8"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f)
                    setPadding(0, dpToPx(4), 0, dpToPx(4))
                }

                // Timestamp
                val timeText = TextView(this).apply {
                    text = dateFormat.format(Date(log.timestamp))
                    setTextColor(Color.parseColor("#64748B"))
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f)
                }

                // Divider
                val divider = View(this).apply {
                    setBackgroundColor(Color.parseColor("#1AFFFFFF"))
                    layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(1)).apply {
                        setMargins(0, dpToPx(12), 0, 0)
                    }
                }

                logView.addView(headerRow)
                logView.addView(msgText)
                logView.addView(timeText)
                logView.addView(divider)

                logsContainer.addView(logView)
            }
        }
    }

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp.toFloat(), resources.displayMetrics).toInt()
    }
}
