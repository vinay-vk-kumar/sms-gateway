const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Joi = require('joi');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/email');
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
  return success(res, { token, apiKey: user.apiKey, email: user.email, isVerified: user.isVerified }, statusCode);
};



const register = async (req, res) => {
  const { error: ve } = registerSchema.validate(req.body, { abortEarly: true });
  if (ve) return error(res, ve.details[0].message, 400);

  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  let user = await User.findOne({ email: normalizedEmail });

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
  const today = todayStr();

  if (user) {
    if (user.isVerified) {
      return error(res, 'This email is already registered. Please log in.', 409);
    }

    const countToday = user.emailVerificationDate === today ? (user.emailVerificationCount || 0) : 0;
    const limit = user.emailDailyLimit || 5;
    if (countToday >= limit) {
      return error(res, `You've reached the limit (${limit} per day). Please try again tomorrow.`, 429);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;
    user.emailVerificationToken = token;
    user.emailVerificationExpiry = expiry;
    user.emailVerificationCount = countToday + 1;
    user.emailVerificationDate = today;
    await user.save();
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    const apiKey = "sms-gateway_" + crypto.randomBytes(32).toString('hex');

    user = await User.create({
      email: normalizedEmail,
      passwordHash,
      apiKey,
      isVerified: false,
      emailVerificationToken: token,
      emailVerificationExpiry: expiry,
      emailVerificationCount: 1,
      emailVerificationDate: today,
    });
  }

  // Send the email asynchronously
  sendVerificationEmail(normalizedEmail, token).catch(e => console.error('[Email Failed]', e));

  console.log(`[Auth] Registered/Re-registered: ${normalizedEmail}`);
  return success(res, { message: 'Verification email sent', email: normalizedEmail }, 200);
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

  if (!user.isVerified) {
    const today = todayStr();
    const countToday = user.emailVerificationDate === today ? (user.emailVerificationCount || 0) : 0;
    const limit = user.emailDailyLimit || 5;
    if (countToday >= limit) {
      return error(res, `You've reached the verification limit (${limit} per day). Please try again tomorrow.`, 429);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    user.emailVerificationToken = token;
    user.emailVerificationExpiry = expiry;
    user.emailVerificationCount = countToday + 1;
    user.emailVerificationDate = today;
    await user.save();

    sendVerificationEmail(normalizedEmail, token).catch(e => console.error('[Email Failed]', e));
    console.log(`[Auth] Login attempt for unverified: ${normalizedEmail}`);
    return success(res, { requiresVerification: true, email: normalizedEmail });
  }

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
    isVerified: req.user.isVerified,
  });
};

const regenerateApiKey = async (req, res) => {
  const newApiKey = "sms-gateway_" + crypto.randomBytes(32).toString('hex');
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
      user.isVerified = true;
      await user.save();
    }
  } else {
    const apiKey = "sms-gateway_" + crypto.randomBytes(32).toString('hex');
    user = await User.create({
      email: normalizedEmail,
      googleId,
      apiKey,
      isVerified: true
    });
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

  const limit = user.emailDailyLimit || 5;
  if (countToday >= limit) {
    return error(
      res,
      `You've reached the limit (${limit} per day). Please try again tomorrow.`,
      429
    );
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 10 * 60_000); // 10 mins

  await User.findByIdAndUpdate(user._id, {
    passwordResetToken: token,
    passwordResetExpiry: expiry,
    passwordResetCount: countToday + 1,
    passwordResetDate: today,
  });

  try {
    await sendPasswordResetEmail(normalizedEmail, token);
    console.log(`[Auth] Password reset link sent to ${normalizedEmail}`);
  } catch (e) {
    console.error(`[Auth] Failed to send email to ${normalizedEmail}:`, e.message);
    return error(res, 'Failed to send email. Please try again later.', 500);
  }

  return success(res, { message: 'Reset link sent to your email.' });
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return error(res, 'Token and new password are required', 400);
  if (password.length < 8) return error(res, 'Password must be at least 8 characters', 400);

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() }
  });

  if (!user) {
    return error(res, 'Invalid or expired reset link. Please request a new one.', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await User.findByIdAndUpdate(user._id, {
    passwordHash,
    passwordResetToken: null,
    passwordResetExpiry: null,
  });

  console.log(`[Auth] Password reset successful for ${user.email}`);
  return success(res, { message: 'Password has been reset successfully.' });
};

const verifyEmail = async (req, res) => {
  const { token } = req.body;
  if (!token) return error(res, 'Token is required', 400);

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpiry: { $gt: new Date() }
  });

  if (!user) {
    return error(res, 'Invalid or expired verification link. Please request a new one.', 400);
  }

  if (user.isVerified) return error(res, 'Email already verified', 400);

  user.isVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpiry = null;
  await user.save();

  console.log(`[Auth] Email verified for ${user.email}`);
  return sendTokenResponse(res, user);
};

const resendVerification = async (req, res) => {
  const { email } = req.body;
  if (!email) return error(res, 'Email is required', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) return error(res, 'No account found with this email.', 404);
  if (user.isVerified) return error(res, 'Email already verified', 400);

  const today = todayStr();
  const countToday = user.emailVerificationDate === today ? (user.emailVerificationCount || 0) : 0;
  const limit = user.emailDailyLimit || 5;
  if (countToday >= limit) {
    return error(res, `You've reached the limit (${limit} per day). Please try again tomorrow.`, 429);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  user.emailVerificationToken = token;
  user.emailVerificationExpiry = expiry;
  user.emailVerificationCount = countToday + 1;
  user.emailVerificationDate = today;
  await user.save();

  // Send the email asynchronously
  sendVerificationEmail(user.email, token).catch(e => console.error('[Email Failed]', e));

  return success(res, { message: 'A new verification link has been sent to your email.' });
};

const changeEmail = async (req, res) => {
  const { email, newEmail } = req.body;
  if (!email || !newEmail) return error(res, 'Both current and new email are required', 400);
  if (!/\S+@\S+\.\S+/.test(newEmail)) return error(res, 'Valid new email is required', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedNewEmail = newEmail.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return error(res, 'No account found with this email.', 404);

  if (user.isVerified) return error(res, 'Email already verified', 400);
  if (user.email === normalizedNewEmail) return error(res, 'This is already your email address', 400);

  // Check if new email is in use
  const existing = await User.findOne({ email: normalizedNewEmail });
  if (existing) return error(res, 'This email address is already in use by another account', 409);

  const today = todayStr();
  const countToday = user.emailVerificationDate === today ? (user.emailVerificationCount || 0) : 0;
  const limit = user.emailDailyLimit || 5;
  if (countToday >= limit) {
    return error(res, `You've reached the limit (${limit} per day). Please try again tomorrow.`, 429);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  user.email = normalizedNewEmail;
  user.emailVerificationToken = token;
  user.emailVerificationExpiry = expiry;
  user.emailVerificationCount = countToday + 1;
  user.emailVerificationDate = today;
  await user.save();

  sendVerificationEmail(normalizedNewEmail, token).catch(e => console.error('[Email Failed]', e));

  return success(res, { message: 'Email updated successfully. Verification link sent.', newEmail: normalizedNewEmail });
};

const checkVerification = async (req, res) => {
  const { email } = req.query;
  if (!email) return error(res, 'Email is required', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('isVerified');

  if (!user) return error(res, 'No account found with this email.', 404);

  return success(res, { isVerified: user.isVerified });
};

module.exports = {
  register,
  login,
  me,
  googleAuth,
  logout,
  regenerateApiKey,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changeEmail,
  checkVerification,
};
