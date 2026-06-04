/**
 * Security model:
 * - On registration, backend generates a plain `deviceSecret`
 * - Plain secret is shown ONCE in the API response and never stored
 * - Only the bcrypt hash (`deviceSecretHash`) is stored in DB
 * - Android app stores the plain secret in EncryptedSharedPreferences
 * - Every API call from the device sends: x-device-id + x-device-secret
 * - Backend verifies: bcrypt.compare(incoming, hash)
 *
 *  */

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  fcmToken: {
    type: String,
    required: [true, 'FCM token is required'],
  },

  deviceName: {
    type: String,
    trim: true,
    default: 'Unnamed Device',
    maxlength: [100, 'Device name too long'],
  },

  deviceSecretHash: {
    type: String,
    required: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  lastSeenAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

deviceSchema.index({ userId: 1 });

deviceSchema.index({ fcmToken: 1 });

module.exports = mongoose.model('Device', deviceSchema);
