/**
 * routes/sms.routes.js
 * =====================
 * SMS queue and delivery routes.
 *
 *   POST /api/sms/queue        → queue a new SMS (API Key + rate limit)
 *   POST /api/sms/webhook/:jobId -> Webhook callback from Android App (device auth)
 *   GET  /api/sms/logs         → paginated SMS history (JWT)
 *
 * Auth layers:
 *   - POST /queue:       API Key middleware + Rate Limit middleware
 *   - POST /webhook:     Device middleware (x-device-id + x-device-secret)
 *   - GET  /logs:        JWT middleware
 */

const express = require('express');
const router = express.Router();

const { queue, webhookCallback, getLogs, getStats, getStatus } = require('../controllers/sms.controller');
const apiKeyMiddleware = require('../middleware/apiKey.middleware');
const deviceMiddleware = require('../middleware/device.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const requireVerified = require('../middleware/requireVerified.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

router.post('/queue', apiKeyMiddleware, rateLimitMiddleware, queue);

router.get('/status/:messageId', apiKeyMiddleware, getStatus);

router.post('/webhook/:jobId', deviceMiddleware, webhookCallback);

router.get('/logs', authMiddleware, requireVerified, getLogs);
router.get('/stats', authMiddleware, requireVerified, getStats);

module.exports = router;
