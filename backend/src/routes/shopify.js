// backend/src/routes/shopify.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Use raw body ONLY for webhook route so HMAC works reliably
const rawJson = express.raw({ type: 'application/json' });

// Env helpers
const APP_URL = process.env.SHOPIFY_APP_URL || process.env.APP_URL;
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || SHOPIFY_API_SECRET;
const OAUTH_SCOPES =
  process.env.SCOPES || 'read_products,read_customers,read_orders,write_webhooks';

// ---------- HMAC verify ----------
function isValidHmac(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || '';
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.body) // Buffer (raw)
    .digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
  } catch {
    return false;
  }
}

// ---------- Helpers: write with findFirst + create/update (fits your schema) ----------
async function upsertCustomer(tenantId, c) {
  const shopifyCustomerId = c?.id ? String(c.id) : null;

  // Try by Shopify ID then by email (both are non-unique in your schema; email+tenant is unique)
  let existing =
    (shopifyCustomerId &&
      (await prisma.customer.findFirst({
        where: { tenantId, shopifyCustomerId },
      }))) ||
    (c?.email &&
      (await prisma.customer.findFirst({
        where: { tenantId, email: c.email },
      })));

  const data = {
    tenantId,
    shopifyCustomerId,
    email: c?.email || null,
    firstName: c?.first_name || null,
    lastName: c?.last_name || null,
    phone: c?.phone || null,
    totalSpent: c?.total_spent != null ? parseFloat(c.total_spent) : 0,
    ordersCount: c?.orders_count != null ? Number(c.orders_count) : 0,
    lastOrderDate: c?.last_order?.created_at ? new Date(c.last_order.created_at) : null,
  };

  if (existing) {
    return prisma.customer.update({ where: { id: existing.id }, data });
  } else {
    return prisma.customer.create({ data });
  }
}

async function upsertProduct(tenantId, p) {
  const shopifyProductId = p?.id ? String(p.id) : null;
  const firstVariant = Array.isArray(p?.variants) && p.variants[0] ? p.variants[0] : null;
  const price = firstVariant?.price != null ? parseFloat(firstVariant.price) : 0;

  let existing =
    (shopifyProductId &&
      (await prisma.product.findFirst({
        where: { tenantId, shopifyProductId },
      }))) || null;

  const data = {
    tenantId,
    shopifyProductId,
    title: p?.title || 'Untitled',
    handle: p?.handle || null,
    description: p?.body_html || null,
    price,
    sku: firstVariant?.sku || null,
    vendor: p?.vendor || null,
    status: p?.status || 'active',
  };

  if (existing) {
    return prisma.product.update({ where: { id: existing.id }, data });
  } else {
    return prisma.product.create({ data });
  }
}

function mapOrderStatus(shopify) {
  const cancelled = !!shopify?.cancelled_at;
  const financial = (shopify?.financial_status || '').toLowerCase();
  const fulfill = (shopify?.fulfillment_status || '').toLowerCase();

  if (cancelled) return 'CANCELLED';
  if (financial.includes('paid') || financial.includes('partially_paid')) return 'CONFIRMED';
  if (fulfill.includes('fulfilled') || fulfill.includes('shipped')) return 'SHIPPED';
  return 'PENDING';
}

async function upsertOrder(tenantId, o) {
  const shopifyOrderId = o?.id ? String(o.id) : null;

  let existing =
    (shopifyOrderId &&
      (await prisma.order.findFirst({
        where: { tenantId, shopifyOrderId },
      }))) || null;

  // Ensure customer exists/linked
  let customerId = null;
  if (o?.customer) {
    const cust = await upsertCustomer(tenantId, o.customer);
    customerId = cust.id;
  }

  const data = {
    tenantId,
    shopifyOrderId,
    orderNumber: String(o?.name || o?.order_number || shopifyOrderId || ''),
    email: o?.email || o?.contact_email || null,
    totalPrice: o?.total_price != null ? parseFloat(o.total_price) : 0,
    currency: o?.currency || 'USD',
    status: mapOrderStatus(o),
    processedAt: o?.processed_at ? new Date(o.processed_at) : null,
    createdAt: o?.created_at ? new Date(o.created_at) : undefined, // keep default now() on create
    customerId: customerId || null,
  };

  let saved;
  if (existing) {
    saved = await prisma.order.update({ where: { id: existing.id }, data });
    await prisma.orderItem.deleteMany({ where: { orderId: saved.id } });
  } else {
    saved = await prisma.order.create({ data });
  }

  // Line items
  if (Array.isArray(o?.line_items)) {
    for (const li of o.line_items) {
      const qty = li?.quantity != null ? Number(li.quantity) : 1;
      const unitPrice = li?.price != null ? parseFloat(li.price) : 0;
      const total = Number((unitPrice * qty).toFixed(2));

      let productId = null;
      if (li?.product_id) {
        const prod = await upsertProduct(tenantId, {
          id: li.product_id,
          title: li.name,
          variants: [{ price: unitPrice, sku: li.sku }],
          vendor: null,
          status: 'active',
        });
        productId = prod.id;
      }

      await prisma.orderItem.create({
        data: {
          orderId: saved.id,
          productId,
          title: li?.name || 'Item',
          sku: li?.sku || null,
          quantity: qty,
          price: unitPrice,
          totalPrice: total,
        },
      });
    }
  }

  return saved;
}

async function processWebhook(tenantId, topic, payload) {
  const t = (topic || '').toLowerCase();

  if (t.startsWith('customers')) {
    const c = payload?.customer || payload;
    await upsertCustomer(tenantId, c);
    return;
  }
  if (t.startsWith('products')) {
    const p = payload?.product || payload;
    await upsertProduct(tenantId, p);
    return;
  }
  if (t.startsWith('orders')) {
    const o = payload?.order || payload;
    await upsertOrder(tenantId, o);
    return;
  }
}

// ---------- Routes ----------

// POST /api/shopify/webhook  (raw JSON body)
router.post('/webhook', rawJson, async (req, res) => {
  if (!isValidHmac(req)) return res.status(401).send('Invalid signature');

  const topic = req.get('X-Shopify-Topic') || '';
  const shop = req.get('X-Shopify-Shop-Domain') || '';
  const payload = JSON.parse(req.body.toString('utf8'));

  const tenant = await prisma.tenant.findFirst({ where: { shopifyDomain: shop } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const log = await prisma.webhookLog.create({
    data: { tenantId: tenant.id, event: topic, payload, status: 'PROCESSING' },
  });

  try {
    await processWebhook(tenant.id, topic, payload);
    await prisma.webhookLog.update({ where: { id: log.id }, data: { status: 'COMPLETED' } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', errorMessage: String(err?.message || err) },
    });
    console.error('Webhook processing failed:', err);
    return res.status(500).json({ error: 'processing failed' });
  }
});

// POST /api/shopify/connect  (save dev-store domain on current tenant)
// POST /api/shopify/connect  (handle domain already attached to another tenant)
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { shopifyDomain } = req.body;
    if (!shopifyDomain) {
      return res.status(400).json({ error: 'shopifyDomain is required' });
    }

    // Normalize input a bit
    const domain = String(shopifyDomain).trim().toLowerCase();

    // Current tenant (from JWT)
    const currentTenant = await prisma.tenant.findUnique({ where: { id: req.tenantId } });
    if (!currentTenant) {
      return res.status(404).json({ error: 'Current tenant not found' });
    }

    // Is this domain already owned by some tenant?
    const existing = await prisma.tenant.findFirst({
      where: { shopifyDomain: domain },
    });

    // If already set on this same tenant, return success
    if (existing && existing.id === currentTenant.id) {
      return res.json({ success: true, tenant: existing, note: 'Domain already connected' });
    }

    // If owned by a different tenant, move the current user to that tenant
    // (Common case: OAuth created a separate tenant row with this domain earlier.)
    if (existing && existing.id !== currentTenant.id) {
      // Reassign the current user to the existing tenant
      await prisma.user.update({
        where: { id: req.user.id },
        data: { tenantId: existing.id },
      });

      return res.status(200).json({
        success: true,
        tenant: existing,
        note: 'Domain already linked to another tenant. Your user has been re-linked to that tenant.',
      });
    }

    // Otherwise, set the domain on the current tenant
    const updated = await prisma.tenant.update({
      where: { id: currentTenant.id },
      data: { shopifyDomain: domain },
    });

    return res.json({ success: true, tenant: updated });
  } catch (e) {
    console.error('Connect error:', e);
    return res.status(500).json({ error: 'Failed to connect shop' });
  }
});


// POST /api/shopify/sync  (create a bit of sample data)
router.post('/sync', authenticate, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // sample customers
    const [c1, c2] = await Promise.all([
      prisma.customer.create({
        data: {
          tenantId,
          email: `alice+${Date.now()}@example.com`,
          firstName: 'Alice',
          lastName: 'Lee',
          totalSpent: 250,
          ordersCount: 2,
        },
      }),
      prisma.customer.create({
        data: {
          tenantId,
          email: `bob+${Date.now()}@example.com`,
          firstName: 'Bob',
          lastName: 'Singh',
          totalSpent: 600,
          ordersCount: 5,
        },
      }),
    ]);

    // sample products
    const [p1, p2] = await Promise.all([
      prisma.product.create({
        data: { tenantId, title: 'T-Shirt', price: 25, vendor: 'Acme', status: 'active' },
      }),
      prisma.product.create({
        data: { tenantId, title: 'Sneakers', price: 120, vendor: 'Acme', status: 'active' },
      }),
    ]);

    // sample order
    const o1 = await prisma.order.create({
      data: {
        tenantId,
        orderNumber: `SYN-${Date.now()}`,
        totalPrice: 145,
        currency: 'USD',
        status: 'CONFIRMED',
        processedAt: new Date(),
        customerId: c1.id,
      },
    });

    await prisma.orderItem.createMany({
      data: [
        { orderId: o1.id, productId: p1.id, title: p1.title, quantity: 1, price: 25, totalPrice: 25, sku: p1.sku || null },
        { orderId: o1.id, productId: p2.id, title: p2.title, quantity: 1, price: 120, totalPrice: 120, sku: p2.sku || null },
      ],
    });

    return res.json({ success: true, message: 'Sample data synced' });
  } catch (e) {
    console.error('Sync error:', e);
    return res.status(500).json({ error: 'Sync failed' });
  }
});

// ---------- OAuth (simple flow) ----------
const oauthStates = new Map(); // dev-only

router.get('/auth', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing ?shop=');
  if (!APP_URL || !SHOPIFY_API_KEY) return res.status(500).send('App not configured');

  const state = crypto.randomBytes(8).toString('hex');
  oauthStates.set(shop, state);

  const redirectUri = `${APP_URL}/api/shopify/auth/callback`;
  const url =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(OAUTH_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, shop } = req.query;
    if (!shop || !code || !state) return res.status(400).send('Missing parameters');
    const expected = oauthStates.get(shop);
    if (!expected || expected !== state) return res.status(400).send('Invalid state');
    oauthStates.delete(shop);

    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    });
    const accessToken = tokenRes.data.access_token;

    const tenant = await prisma.tenant.upsert({
      where: { shopifyDomain: shop },
      update: { shopifyToken: accessToken, isActive: true, name: shop },
      create: { name: shop, shopifyDomain: shop, shopifyToken: accessToken, isActive: true },
    });

    await registerWebhooksForTenant(shop, accessToken);

    res.status(200).send(`Installed for ${tenant.name}. Webhooks registered. You can close this tab.`);
  } catch (e) {
    console.error('OAuth callback failed:', e.response?.data || e.message);
    res.status(500).send('OAuth failed');
  }
});

// ---------- Webhook registration ----------
async function registerWebhooksForTenant(shop, accessToken) {
  const address = `${APP_URL}/api/shopify/webhook`;
  const topics = [
    'customers/create',
    'customers/update',
    'products/create',
    'products/update',
    'orders/create',
    'orders/updated',
  ];

  for (const topic of topics) {
    try {
      await axios.post(
        `https://${shop}/admin/api/2025-07/webhooks.json`,
        { webhook: { topic, address, format: 'json' } },
        { headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      const code = e.response?.status;
      // 422 = already exists; safe to ignore
      if (code !== 422) {
        console.warn(`Webhook register failed for ${topic}:`, code, e.response?.data || e.message);
      }
    }
  }
}

module.exports = router;
