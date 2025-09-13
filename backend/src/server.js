// backend/src/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const { PrismaClient } = require('@prisma/client');

const verifyRouter = require('./routes/verify');
const authRouter = require('./routes/auth');
const shopifyRouter = require('./routes/shopify');
const analyticsRouter = require('./routes/analytics');
const gdprRouter = require('./routes/gdpr'); // if you don't have this yet, comment it out

const app = express();
const prisma = new PrismaClient();

// ---- Security / infra basics ----
app.set('trust proxy', 1); // needed on Railway/Render behind proxy
app.use(helmet({
  crossOriginResourcePolicy: false, // avoid blocking embedded contexts
}));
app.use(morgan('combined'));

// ---- CORS ----
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true, // allow all in dev
  credentials: true,
}));

// ---- Health check ----
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ---- Body parsers ----
// IMPORTANT: Do NOT parse JSON on the webhook path. It must stay RAW for HMAC.
app.use((req, res, next) => {
  if (req.path === '/api/shopify/webhook') return next();
  return bodyParser.json({ limit: '10mb' })(req, res, next);
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/verify', verifyRouter);

// If you previously had `express.json({ verify: ... })` storing req.rawBody,
// remove it. We use RAW only inside the shopify router for the webhook.

// ---- Routes ----
app.use('/api/auth', authRouter);
app.use('/api/shopify', shopifyRouter);       // includes /webhook (raw handled in router)
app.use('/api/analytics', analyticsRouter);
app.use('/api/shopify/gdpr', gdprRouter);     // comment this line if file not present

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Error handler ----
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ---- Start server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ---- Graceful shutdown ----
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully (SIGTERM)…');
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully (SIGINT)…');
  await prisma.$disconnect();
  process.exit(0);
});
