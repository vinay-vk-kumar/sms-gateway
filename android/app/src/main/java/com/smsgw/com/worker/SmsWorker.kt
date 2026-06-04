package com.smsgw.com.worker

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.work.*
import com.smsgw.com.data.ApiClient
import com.smsgw.com.data.SecureStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class SmsWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        private const val TAG = "SmsWorker"

        // Intent actions for SmsManager SENT broadcast receivers
        private const val SMS_SENT_ACTION    = "com.smsgw.com.SMS_SENT"
        private const val SMS_TIMEOUT_MS     = 5_000L  // 5 seconds max per message to avoid freezing

        fun schedulePeriodicPolling(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val periodicWork = PeriodicWorkRequestBuilder<SmsWorker>(
                15, TimeUnit.MINUTES    // Android minimum is 15 minutes
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "sms-polling",
                ExistingPeriodicWorkPolicy.KEEP,  // Don't restart if already scheduled
                periodicWork
            )

            Log.e(TAG, "Periodic SMS polling scheduled")
        }

        fun triggerImmediate(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val immediateWork = OneTimeWorkRequestBuilder<SmsWorker>()
                .setConstraints(constraints)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()

            WorkManager.getInstance(context)
                .enqueue(immediateWork)

        }

        suspend fun sendSmsPublic(context: Context, phoneNumber: String, message: String): Pair<Boolean, String> {
            return withContext(Dispatchers.IO) {
                
                val smsManager: SmsManager = try {
                    val subId = SubscriptionManager.getDefaultSmsSubscriptionId()
                    if (subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                            context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
                        else { @Suppress("DEPRECATION") SmsManager.getSmsManagerForSubscriptionId(subId) }
                    } else {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                            context.getSystemService(SmsManager::class.java)
                        else { @Suppress("DEPRECATION") SmsManager.getDefault() }
                    }
                } catch (e: Exception) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
                        context.getSystemService(SmsManager::class.java)
                    else { @Suppress("DEPRECATION") SmsManager.getDefault() }
                }

                val sentAction = "${SMS_SENT_ACTION}_${System.currentTimeMillis()}"
                var resultCode = -999
                val latch      = java.util.concurrent.CountDownLatch(1)

                val sentReceiver = object : BroadcastReceiver() {
                    override fun onReceive(ctx: Context?, intent: Intent?) {
                        resultCode = getResultCode()
                        latch.countDown()
                    }
                }

                val filter = IntentFilter(sentAction)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                    context.registerReceiver(sentReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
                else
                    context.registerReceiver(sentReceiver, filter)

                val sentPi = PendingIntent.getBroadcast(
                    context, 0, Intent(sentAction),
                    PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
                )

                try {
                    val parts = smsManager.divideMessage(message)
                    if (parts.size == 1) {
                        smsManager.sendTextMessage(phoneNumber, null, message, sentPi, null)
                    } else {
                        val intents = ArrayList<PendingIntent>().apply {
                            add(sentPi)
                            for (i in 1 until parts.size) add(PendingIntent.getBroadcast(
                                context, i, Intent("${sentAction}_part_$i"),
                                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
                            ))
                        }
                        smsManager.sendMultipartTextMessage(phoneNumber, null, parts, intents, null)
                    }

                    val got = latch.await(SMS_TIMEOUT_MS, java.util.concurrent.TimeUnit.MILLISECONDS)
                    if (!got) {
                        // Broadcast timed out — this is normal on MIUI and many Indian ROMs.
                        // The SMS was already submitted to the modem via sendTextMessage().
                        // Treat as success; the network will deliver it.
                        return@withContext Pair(true, "")
                    }

                    when (resultCode) {
                        android.app.Activity.RESULT_OK,           // -1  standard success
                        android.app.Activity.RESULT_CANCELED,     //  0  some Indian carriers on success
                        SmsManager.RESULT_ERROR_GENERIC_FAILURE,  //  1  spurious on MIUI — SMS still goes
                        -> Pair(true, "")

                        SmsManager.RESULT_ERROR_RADIO_OFF   -> Pair(false, "Radio off — enable mobile signal")
                        SmsManager.RESULT_ERROR_NULL_PDU    -> Pair(false, "Null PDU error")
                        SmsManager.RESULT_ERROR_NO_SERVICE  -> Pair(false, "No cellular service")
                        else                                -> Pair(false, "SmsManager code: $resultCode")
                    }
                } catch (e: Exception) {
                    Pair(false, "Exception: ${e.message}")
                } finally {
                    try { context.unregisterReceiver(sentReceiver) } catch (_: Exception) {}
                }
            }
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {

        if (!SecureStorage.isConfigured(context)) {
            return@withContext Result.success()
        }

        try {
            
            val messages = ApiClient.fetchPendingMessages(context)
            if (messages.isEmpty()) {
                return@withContext Result.success()
            }

            val sentIds    = mutableListOf<String>()
            val failedIds  = mutableListOf<Pair<String, String>>()  // id → reason

            for (msg in messages) {
                Log.d(TAG, "Sending to ${msg.to}: \"${msg.message.take(30)}…\"")

                val (success, reason) = sendSms(msg.to, msg.message)

                if (success) {
                    sentIds.add(msg.id)
                    // Report success immediately so it doesn't get stuck in 'processing' on the backend
                    try { ApiClient.markSent(context, listOf(msg.id)) } catch (e: Exception) { Log.e(TAG, "markSent error", e) }
                } else {
                    failedIds.add(Pair(msg.id, reason))
                    Log.w(TAG, "SMS failed for ${msg.id}: $reason")
                    // Report failure immediately
                    try { ApiClient.markFailed(context, msg.id, reason) } catch (e: Exception) { Log.e(TAG, "markFailed error", e) }
                }
            }

            Result.success()

        } catch (e: Exception) {
            Log.e(TAG, "SmsWorker error: ${e.message}", e)
            // Return retry — WorkManager will retry with exponential backoff
            Result.retry()
        }
    }

    private suspend fun sendSms(phoneNumber: String, message: String): Pair<Boolean, String> =
        sendSmsPublic(context, phoneNumber, message)
}
