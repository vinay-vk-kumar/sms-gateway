/**
 *   POST /auth/register            → create account (public)
 *   POST /auth/login               → get JWT + apiKey (public)
 *   POST /auth/google              → Google Sign-In / Sign-Up (public)
 *   GET  /auth/me                  → current user profile (JWT protected)
 *   POST /auth/regenerate-api-key  → issue new apiKey (JWT protected)
 *   POST /auth/forgot-password     → send OTP email (public, rate-limited)
 *   POST /auth/verify-otp          → validate OTP → reset token (public)
 *   POST /auth/reset-password      → set new password via reset token (public)
 */

const express = require('express');
const router = express.Router();

const {
  register, login, me, regenerateApiKey,
  googleAuth,
  forgotPassword, verifyOtp, resetPassword,
  logout,
} = require('../controllers/auth.controller');

const authMiddleware = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

router.get('/me', authMiddleware, me);
router.post('/regenerate-api-key', authMiddleware, regenerateApiKey);

module.exports = router;
