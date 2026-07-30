const axios = require('axios');
const { error } = require('../utils/apiResponse');

const verifyRecaptcha = async (req, res, next) => {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('[reCAPTCHA] Secret key not configured. Bypassing check.');
    return next();
  }

  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return error(res, 'reCAPTCHA token is missing.', 400);
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    );

    const data = response.data;

    if (!data.success || data.score < 0.5) {
      console.warn(`[reCAPTCHA] Failed verification or low score:`, data);
      return error(res, 'reCAPTCHA verification failed. Bot behavior detected.', 403);
    }
    delete req.body.recaptchaToken;
    next();
  } catch (err) {
    console.error('[reCAPTCHA] Error verifying token:', err.message);
    return error(res, 'Internal server error during reCAPTCHA verification.', 500);
  }
};

module.exports = verifyRecaptcha;
