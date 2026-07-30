/**
 *   POST   /api/devices/register       → register new device (JWT)
 *   GET    /api/devices                → list user's devices (JWT)
 *   DELETE /api/devices/:id            → deactivate device (JWT)
 *   PUT    /api/devices/refresh-token  → update FCM token (device auth)
 */

const express = require('express');
const router = express.Router();

const { register, list, deactivate, refreshToken, createPairingSession, checkPairingSession, completePairing, updateDevice } = require('../controllers/device.controller');
const authMiddleware = require('../middleware/auth.middleware');
const deviceMiddleware = require('../middleware/device.middleware');
const requireVerified = require('../middleware/requireVerified.middleware');

router.post('/register', authMiddleware, requireVerified, register);
router.get('/', authMiddleware, requireVerified, list);
router.put('/:id', authMiddleware, requireVerified, updateDevice);
router.delete('/:id', authMiddleware, requireVerified, deactivate);

router.put('/refresh-token', deviceMiddleware, refreshToken);

// QR Code Pairing routes
router.post('/pairing-session', authMiddleware, requireVerified, createPairingSession);
router.get('/pairing-status', authMiddleware, requireVerified, checkPairingSession);
router.post('/pair', completePairing);

module.exports = router;
