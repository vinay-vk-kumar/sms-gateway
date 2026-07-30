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
