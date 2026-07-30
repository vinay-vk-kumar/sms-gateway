/**
 *   POST /auth/register            → create account (public)
 *   POST /auth/login               → get JWT + apiKey (public)
 *   POST /auth/google              → Google Sign-In / Sign-Up (public)
 *   GET  /auth/me                  → current user profile (JWT protected)
 *   POST /auth/regenerate-api-key  → issue new apiKey (JWT protected)
 *   POST /auth/forgot-password     → send Reset Link email (public, rate-limited)
 *   POST /auth/reset-password      → set new password via reset token (public)
 */

const express = require('express');
const router = express.Router();

const {
  register, login, me, regenerateApiKey,
  googleAuth,
  forgotPassword, resetPassword,
  logout,
  verifyEmail, resendVerification, changeEmail, checkVerification
} = require('../controllers/auth.controller');

const authMiddleware = require('../middleware/auth.middleware');
const verifyRecaptcha = require('../middleware/recaptcha.middleware');

router.post('/register', verifyRecaptcha, register);
router.post('/login', verifyRecaptcha, login);
router.post('/google', googleAuth);
router.post('/logout', logout);
router.post('/forgot-password', verifyRecaptcha, forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', authMiddleware, me);
router.post('/regenerate-api-key', authMiddleware, regenerateApiKey);

router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/change-email', changeEmail);
router.get('/check-verification', checkVerification);

module.exports = router;
