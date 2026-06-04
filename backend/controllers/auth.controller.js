const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Joi = require('joi');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');
const { sendOtpEmail } = require('../utils/email');
const { success, error } = require('../utils/apiResponse');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({ 'string.email': 'Please provide a valid email address', 'any.required': 'Email is required' }),
  password: Joi.string().min(8).required().messages({ 'string.min': 'Password must be at least 8 characters', 'any.required': 'Password is required' }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().messages({ 'any.required': 'Password is required' }),
});

const generateToken = (userId, options = {}) =>
  jwt.sign(
    { userId: userId.toString(), ...options },
    process.env.JWT_SECRET,
    { expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN || '7d' }
  );

const todayStr = () => new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

const sendTokenResponse = (res, user, statusCode = 200) => {
  const token = generateToken(user._id);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  res.cookie('jwt', token, cookieOptions);
  return success(res, { token, apiKey: user.apiKey, email: user.email }, statusCode);
};

const register = async (req, res) => {
  const { error: ve } = registerSchema.validate(req.body, { abortEarly: true });
  if (ve) return error(res, ve.details[0].message, 400);

  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return error(res, 'This email is already registered. Please log in.', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const apiKey = crypto.randomBytes(32).toString('hex');

  const user = await User.create({ email: normalizedEmail, passwordHash, apiKey });

  console.log(`[Auth] Registered: ${normalizedEmail}`);
  return sendTokenResponse(res, user, 201);
};

const login = async (req, res) => {
  const { error: ve } = loginSchema.validate(req.body, { abortEarly: true });
  if (ve) return error(res, ve.details[0].message, 400);

  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user || !user.passwordHash) return error(res, 'Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return error(res, 'Invalid email or password', 401);

  if (user.isSuspended) return error(res, 'Your account has been suspended. Contact support.', 403);

  console.log(`[Auth] Login: ${normalizedEmail}`);
  return sendTokenResponse(res, user);
};

const me = async (req, res) => {
  return success(res, {
    email: req.user.email,
    apiKey: req.user.apiKey,
    createdAt: req.user.createdAt,
    isSuspended: req.user.isSuspended,
    isGoogleUser: !!req.user.googleId,
  });
};

const regenerateApiKey = async (req, res) => {
  const newApiKey = crypto.randomBytes(32).toString('hex');
  await User.findByIdAndUpdate(req.user._id, { apiKey: newApiKey });
  console.log(`[Auth] API key regenerated for: ${req.user.email}`);
  return success(res, { apiKey: newApiKey });
};

const googleAuth = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return error(res, 'Google ID token is required', 400);

  if (!process.env.GOOGLE_CLIENT_ID) {
    return error(res, 'Google Sign-In is not configured on this server', 503);
  }

  // Verify the token with Google
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (e) {
    console.error('[Auth] Google token verification failed:', e.message);
    return error(res, 'Invalid Google token. Please try again.', 401);
  }

  const { sub: googleId, email, email_verified } = payload;
  if (!email_verified) return error(res, 'Google account email is not verified', 400);

  const normalizedEmail = email.toLowerCase().trim();

  let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    const apiKey = crypto.randomBytes(32).toString('hex');
    user = await User.create({ email: normalizedEmail, googleId, apiKey });
    console.log(`[Auth] Google sign-up: ${normalizedEmail}`);
  }

  if (user.isSuspended) return error(res, 'Your account has been suspended. Contact support.', 403);

  console.log(`[Auth] Google login: ${normalizedEmail}`);
  return sendTokenResponse(res, user);
};

const logout = async (req, res) => {
  res.cookie('jwt', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  return success(res, { message: 'Logged out successfully' });
};

const OTP_EXPIRY_MINUTES = 10;
const OTP_DAILY_LIMIT = 3;

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !/\S+@\S+\.\S+/.test(email)) return error(res, 'Valid email is required', 400);

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return error(res, 'No account found with this email address.', 404);
  }

  if (!user.passwordHash && user.googleId) {
    return error(res, 'This account uses Google Sign-In. Please sign in with Google instead.', 400);
  }

  const today = todayStr();
  const sameDay = user.passwordResetDate === today;
  const countToday = sameDay ? (user.passwordResetCount || 0) : 0;

  if (countToday >= OTP_DAILY_LIMIT) {
    return error(
      res,
      `You've reached the OTP limit (${OTP_DAILY_LIMIT} per day). Please try again tomorrow.`,
      429
    );
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60_000);

  await User.findByIdAndUpdate(user._id, {
    passwordResetOtp: otpHash,
    passwordResetExpiry: expiry,
    passwordResetCount: countToday + 1,
    passwordResetDate: today,
  });

  try {
    await sendOtpEmail(normalizedEmail, otp);
    console.log(`[Auth] OTP sent to ${normalizedEmail} (attempt ${countToday + 1}/${OTP_DAILY_LIMIT})`);
  } catch (e) {
    console.error(`[Auth] Failed to send OTP email to ${normalizedEmail}:`, e.message);
    return error(res, 'Failed to send email. Please try again later.', 500);
  }

  return success(res, {
    message: 'OTP sent to your email.',
    attemptsLeft: OTP_DAILY_LIMIT - (countToday + 1),
  });
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return error(res, 'Email and OTP are required', 400);
  if (!/^\d{6}$/.test(otp)) return error(res, 'OTP must be 6 digits', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) return error(res, 'No account found with this email address.', 404);

  if (!user.passwordResetOtp || !user.passwordResetExpiry) {
    return error(res, 'No active OTP found. Please request a new one.', 400);
  }

  if (new Date() > user.passwordResetExpiry) {
    // Clear expired OTP
    await User.findByIdAndUpdate(user._id, {
      passwordResetOtp: null,
      passwordResetExpiry: null,
    });
    return error(res, 'OTP has expired (valid for 10 minutes). Request a new one.', 400);
  }

  const isMatch = await bcrypt.compare(otp, user.passwordResetOtp);
  if (!isMatch) {
    return error(res, 'Incorrect OTP. Check your email and try again.', 400);
  }

  await User.findByIdAndUpdate(user._id, {
    passwordResetOtp: null,
    passwordResetExpiry: null,
  });

  // Issue a short-lived reset token (15 min)
  const resetToken = jwt.sign(
    { userId: user._id.toString(), purpose: 'password-reset' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  console.log(`[Auth] OTP verified for ${normalizedEmail}`);
  return success(res, { resetToken });
};

const resetPassword = async (req, res) => {
  const { resetToken, password } = req.body;
  if (!resetToken || !password) return error(res, 'Reset token and new password are required', 400);
  if (password.length < 8) return error(res, 'Password must be at least 8 characters', 400);

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    return error(res, 'Reset token is invalid or has expired. Please start over.', 401);
  }

  if (decoded.purpose !== 'password-reset') {
    return error(res, 'Invalid reset token', 401);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.findByIdAndUpdate(decoded.userId, {
    passwordHash,
    passwordResetOtp: null,
    passwordResetExpiry: null,
  });

  console.log(`[Auth] Password reset for user ${decoded.userId}`);
  return success(res, { message: 'Password reset successfully. You can now sign in.' });
};

module.exports = {
  register, login, me, regenerateApiKey,
  googleAuth,
  forgotPassword, verifyOtp,
  resetPassword,
  logout,
};
