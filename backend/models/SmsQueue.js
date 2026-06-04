/**
 * models/SmsQueue.js
 *
 *
 *   pending
 *     │
 *     ├─→ processing   (set atomically when device fetches)
 *     │       │          Prevents two simultaneous calls from
 *     │       │          fetching the same message twice
 *     │       │
 *     │       ├─→ sent      (device calls /mark-sent)
 *     │       │
 *     │       └─→ failed    (device calls /mark-failed, retries >= 3)
 *     │                      OR admin manually fails it
 *     │
 *     └─→ pending (stays here if FCM fails — WorkManager will pick it up)
 *
 */

const mongoose = require('mongoose');

const smsQueueSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
  },

  to: {
    type: String,
    required: [true, 'Recipient phone number is required'],
    trim: true,
  },

  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    // Standard SMS: 160 chars per segment, max 10 segments = 1600 chars
    maxlength: [1600, 'Message too long (max 1600 characters / 10 SMS segments)'],
  },

  type: {
    type: String,
    enum: ['otp', 'welcome', 'forgot-password', 'custom'],
    default: 'custom',
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed'],
    default: 'pending',
  },

  idempotencyKey: {
    type: String,
    default: null,
  },

  retries: {
    type: Number,
    default: 0,
    max: 3,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  sentAt: {
    type: Date,
    default: null,
  },

  error: {
    type: String,
    default: null,
  },
}, { timestamps: true });

smsQueueSchema.index({ userId: 1, status: 1, createdAt: -1 });
smsQueueSchema.index({ deviceId: 1, status: 1 });
smsQueueSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
smsQueueSchema.index({ deviceId: 1, status: 1, updatedAt: 1 });

module.exports = mongoose.model('SmsQueue', smsQueueSchema);
