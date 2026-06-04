

require('dotenv').config();
require('express-async-errors'); // Catches async errors automatically in Express 4

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const { getRedisClient, getRedisConfig } = require('./config/redis');
const { initializeFirebase } = require('./config/firebase.config');
const { getSmsQueue, getDlQueue } = require('./queue/sms.queue');
const { initSmsWorker } = require('./queue/sms.worker');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
getRedisClient();     // Initialize ioredis client on startup (for rate limiting)
getRedisConfig();     // Parse and cache Redis connection config for BullMQ
initializeFirebase();   // Initialize Firebase Admin SDK 

initSmsWorker();        // Start processing SMS delivery jobs

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-api-key',
    'x-device-id',
    'x-device-secret',
  ],
  credentials: true,
}));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use('/auth', require('./routes/auth.routes'));
app.use('/api/devices', require('./routes/device.routes'));
app.use('/api/sms', require('./routes/sms.routes'));

app.get('/health', async (req, res) => {
  let redisStatus = 'disconnected';
  try {
    const redis = getRedisClient();
    await redis.ping();
    redisStatus = 'connected';
  } catch (e) {
    redisStatus = 'error';
  }

  res.json({
    success: true,
    data: {
      status: 'ok',
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisStatus,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    },
    error: null,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, data: null, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n[Server] ✓ Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`[Server] Health: http://localhost:${PORT}/health\n`);
});

const shutdown = (signal) => {
  console.log(`\n[Server] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await mongoose.connection.close();
    console.log('[Server] MongoDB connection closed. Goodbye.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
