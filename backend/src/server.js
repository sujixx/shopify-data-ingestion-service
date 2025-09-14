// backend/src/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// ---- Security / infra basics ----
app.set('trust proxy', 1); // behind Railway/Render proxy
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('combined'));

// ---- CORS ----
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true, // allow all if not set
    credentials: true,
  })
);

// ---- Health check ----
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ---- Body parsers ----
// IMPORTANT: Do NOT parse JSON/urlencoded on the webhook path. It must stay RAW for HMAC.
const isShopifyWebhook = (req) =>
  (req.originalUrl || req.url || '').startsWith('/api/shopify/webhook');

app.use((req, res, next) =>
  isShopifyWebhook(req) ? next() : bodyParser.json({ limit: '10mb' })(req, res, next)
);
app.use((req, res, next) =>
  isShopifyWebhook(req) ? next() : bodyParser.urlencoded({ extended: true })(req, res, next)
);

// ---- Routes (with safe optional requires) ----
const safeRequire = (p) => {
  try {
    return require(p);
  } catch {
    return null;
  }
};

const authRouter = safeRequire('./routes/auth');
const shopifyRouter = safeRequire('./routes/shopify'); // includes /webhook (raw handled inside)
const analyticsRouter = safeRequire('./routes/analytics');
const gdprRouter = safeRequire('./routes/gdpr'); // optional
const verifyRouter = safeRequire('./routes/verify'); // optional

if (verifyRouter) app.use('/api/verify', verifyRouter);
if (authRouter) app.use('/api/auth', authRouter);
if (shopifyRouter) app.use('/api/shopify', shopifyRouter);
if (analyticsRouter) app.use('/api/analytics', analyticsRouter);
if (gdprRouter) app.use('/api/shopify/gdpr', gdprRouter);

// Root helper
app.get('/', (_req, res) => res.redirect('/health'));

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Error handler ----
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ---- Start server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const publicUrl =
    process.env.SHOPIFY_APP_URL ||
    process.env.APP_URL ||
    `http://localhost:${PORT}`;
  console.log(`🚀 Server running at ${publicUrl}`);
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
