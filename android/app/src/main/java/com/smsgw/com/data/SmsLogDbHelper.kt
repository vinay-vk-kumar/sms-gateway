package com.smsgw.com.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.provider.BaseColumns

data class SmsLog(
    val id: Long = 0,
    val smsId: String,
    val recipient: String,
    val message: String,
    val status: String, // "SENT", "FAILED"
    val timestamp: Long
)

class SmsLogDbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_VERSION = 1
        const val DATABASE_NAME = "SmsLogs.db"

        object LogEntry : BaseColumns {
            const val TABLE_NAME = "sms_logs"
            const val COLUMN_SMS_ID = "sms_id"
            const val COLUMN_RECIPIENT = "recipient"
            const val COLUMN_MESSAGE = "message"
            const val COLUMN_STATUS = "status"
            const val COLUMN_TIMESTAMP = "timestamp"
        }

        private const val SQL_CREATE_ENTRIES =
            "CREATE TABLE ${LogEntry.TABLE_NAME} (" +
                    "${BaseColumns._ID} INTEGER PRIMARY KEY," +
                    "${LogEntry.COLUMN_SMS_ID} TEXT," +
                    "${LogEntry.COLUMN_RECIPIENT} TEXT," +
                    "${LogEntry.COLUMN_MESSAGE} TEXT," +
                    "${LogEntry.COLUMN_STATUS} TEXT," +
                    "${LogEntry.COLUMN_TIMESTAMP} INTEGER)"

        private const val SQL_DELETE_ENTRIES = "DROP TABLE IF EXISTS ${LogEntry.TABLE_NAME}"
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(SQL_CREATE_ENTRIES)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL(SQL_DELETE_ENTRIES)
        onCreate(db)
    }

    fun insertLog(smsId: String, recipient: String, message: String, status: String) {
        val db = this.writableDatabase
        val values = ContentValues().apply {
            put(LogEntry.COLUMN_SMS_ID, smsId)
            put(LogEntry.COLUMN_RECIPIENT, recipient)
            put(LogEntry.COLUMN_MESSAGE, message)
            put(LogEntry.COLUMN_STATUS, status)
            put(LogEntry.COLUMN_TIMESTAMP, System.currentTimeMillis())
        }
        db.insert(LogEntry.TABLE_NAME, null, values)
        
        // Auto-cleanup older than 7 days
        val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
        db.delete(LogEntry.TABLE_NAME, "${LogEntry.COLUMN_TIMESTAMP} < ?", arrayOf(sevenDaysAgo.toString()))
    }

    fun getAllLogs(): List<SmsLog> {
        val db = this.readableDatabase
        val cursor = db.query(
            LogEntry.TABLE_NAME,
            null, null, null, null, null,
            "${LogEntry.COLUMN_TIMESTAMP} DESC" // newest first
        )

        val logs = mutableListOf<SmsLog>()
        with(cursor) {
            while (moveToNext()) {
                val id = getLong(getColumnIndexOrThrow(BaseColumns._ID))
                val smsId = getString(getColumnIndexOrThrow(LogEntry.COLUMN_SMS_ID))
                val recipient = getString(getColumnIndexOrThrow(LogEntry.COLUMN_RECIPIENT))
                val message = getString(getColumnIndexOrThrow(LogEntry.COLUMN_MESSAGE))
                val status = getString(getColumnIndexOrThrow(LogEntry.COLUMN_STATUS))
                val timestamp = getLong(getColumnIndexOrThrow(LogEntry.COLUMN_TIMESTAMP))
                logs.add(SmsLog(id, smsId, recipient, message, status, timestamp))
            }
        }
        cursor.close()
        return logs
    }
    
    fun clearAllLogs() {
        val db = this.writableDatabase
        db.delete(LogEntry.TABLE_NAME, null, null)
    }
}
