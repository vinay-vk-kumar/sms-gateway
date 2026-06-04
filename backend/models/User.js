

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
  },

  passwordHash: {
    type: String,
    default: null,
  },

  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },

  apiKey: {
    type: String,
    unique: true,
    required: true,
  },

  isSuspended: {
    type: Boolean,
    default: false,
  },

  passwordResetOtp: { type: String, default: null },
  passwordResetExpiry: { type: Date, default: null },
  passwordResetCount: { type: Number, default: 0 },
  passwordResetDate: { type: String, default: null },

  dailySmsLimit: { type: Number, default: 1000 },
  minuteSmsLimit: { type: Number, default: 30 },
  hourlyPhoneLimit: { type: Number, default: 100 },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
