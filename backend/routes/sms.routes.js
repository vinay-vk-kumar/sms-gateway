/**
 * routes/sms.routes.js
 * =====================
 * SMS queue and delivery routes.
 *
 *   POST /api/sms/queue        → queue a new SMS (API Key + rate limit)
 *   GET  /api/sms/pending      → fetch pending messages for device (device auth)
 *   POST /api/sms/mark-sent    → mark messages as delivered (device auth)
 *   POST /api/sms/mark-failed  → report delivery failure (device auth)
 *   GET  /api/sms/logs         → paginated SMS history (JWT)
 *
 * Auth layers:
 *   - POST /queue:       API Key middleware + Rate Limit middleware
 *   - GET  /pending:     Device middleware (x-device-id + x-device-secret)
 *   - POST /mark-*:      Device middleware
 *   - GET  /logs:        JWT middleware
 */

const express = require('express');
const router = express.Router();

const { queue, getPending, markSent, markFailed, getLogs, getStats } = require('../controllers/sms.controller');
const apiKeyMiddleware = require('../middleware/apiKey.middleware');
const deviceMiddleware = require('../middleware/device.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const rateLimitMiddleware = require('../middleware/rateLimit.middleware');

router.post('/queue', apiKeyMiddleware, rateLimitMiddleware, queue);

router.get('/pending', deviceMiddleware, getPending);
router.post('/mark-sent', deviceMiddleware, markSent);
router.post('/mark-failed', deviceMiddleware, markFailed);

router.get('/logs', authMiddleware, getLogs);
router.get('/stats', authMiddleware, getStats);  // Pre-computed stats for dashboard

module.exports = router;
