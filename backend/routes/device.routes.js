/**
 *   POST   /api/devices/register       → register new device (JWT)
 *   GET    /api/devices                → list user's devices (JWT)
 *   DELETE /api/devices/:id            → deactivate device (JWT)
 *   PUT    /api/devices/refresh-token  → update FCM token (device auth)
 */

const express = require('express');
const router = express.Router();

const { register, list, deactivate, refreshToken } = require('../controllers/device.controller');
const authMiddleware = require('../middleware/auth.middleware');
const deviceMiddleware = require('../middleware/device.middleware');

router.post('/register', authMiddleware, register);
router.get('/', authMiddleware, list);
router.delete('/:id', authMiddleware, deactivate);

router.put('/refresh-token', deviceMiddleware, refreshToken);

module.exports = router;
