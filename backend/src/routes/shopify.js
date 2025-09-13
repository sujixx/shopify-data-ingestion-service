// backend/src/routes/shopify.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// RAW body only on the webhook route (needed for HMAC)
const rawJson = express.raw({ type: 'application/json' });

/* -------------------- HMAC -------------------- */
function isValidHmac(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || '';
  const digest = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(req.body) // Buffer
    .digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(digest));
  } catch {
    return false;
  }
}

/* ------------- Upsert helpers (YOUR schema) ------------- */
async function upsertCustomer(tenantId, c) {
  const customer = c || {};
  const shopifyCustomerId = customer.id ? String(customer.id) : null;

  return prisma.customer.upsert({
    where: { tenantId_shopifyCustomerId: { tenantId, shopifyCustomerId } },
    update: {
      email: customer.email ?? undefined,
      firstName: customer.first_name ?? undefined,
      lastName: customer.last_name ?? undefined,
      phone: customer.phone ?? undefined,
      totalSpent: customer.total_spent != null ? parseFloat(customer.total_spent) : undefined,
      ordersCount: customer.orders_count != null ? Number(customer.orders_count) : undefined,
      lastOrderDate: customer.last_order?.created_at ? new Date(customer.last_order.created_at) : undefined,
    },
    create: {
      tenantId,
      shopifyCustomerId,
      email: customer.email || null,
      firstName: customer.first_name || null,
      lastName: customer.last_name || null,
      phone: customer.phone || null,
      totalSpent: customer.total_spent != null ? parseFloat(customer.total_spent) : 0,
      ordersCount: customer.orders_count != null ? Number(customer.orders_count) : 0,
      lastOrderDate: customer.last_order?.created_at ? new Date(customer.last_order.created_at) : null,
    },
  });
}

async function upsertProduct(tenantId, p) {
  const product = p || {};
  const shopifyProductId = product.id ? String(product.id) : null;
  const price = product.variants?.[0]?.price != null ? parseFloat(product.variants[0].price) : 0;

  return prisma.product.upsert({
    where: { tenantId_shopifyProductId: { tenantId, shopifyProductId } },
    update: {
      title: product.title ?? undefined,
      handle: product.handle ?? undefined,
      description: product.body_html ?? undefined,
      price,
      sku: product.variants?.[0]?.sku ?? undefined,
      vendor: product.vendor ?? undefined,
      status: product.status ?? undefined,
    },
    create: {
      tenantId,
      shopifyProductId,
      title: product.title || 'Untitled',
      handle: product.handle || null,
      description: product.body_html || null,
      price,
      sku: product.variants?.[0]?.sku || null,
      vendor: product.vendor || null,
      status: product.status || 'active',
    },
  });
}

function mapOrderStatus(o) {
  const s = (o.financial_status || o.fulfillment_status || 'pending').toUpperCase();
  if (s.includes('CANCEL')) return 'CANCELLED';
  if (s.includes('SHIPPED') || s.includes('FULFILLED')) return 'SHIPPED';
  if (s.includes('PAID')) return 'CONFIRMED';
  return 'PENDING';
}

async function upsertOrder(tenantId, o) {
  const order = o || {};
  const shopifyOrderId = order.id ? String(order.id) : null;
  const orderNumber = order.name || String(order.order_number || shopifyOrderId || '');
  const totalPrice = order.total_price != null ? parseFloat(order.total_price) : 0;
  const currency = order.currency || 'USD';
  const processedAt = order.processed_at ? new Date(order.processed_at) : null;
  const createdAt = order.created_at ? new Date(order.created_at) : new Date();
  const status = mapOrderStatus(order);

  let customerId = null;
  if (order.customer?.id) {
    const c = await upsertCustomer(tenantId, order.customer);
    customerId = c.id;
  }

  const saved = await prisma.order.upsert({
    where: { tenantId_shopifyOrderId: { tenantId, shopifyOrderId } },
    update: {
      orderNumber,
      email: order.email ?? undefined,
      totalPrice,
      currency,
      status,
      processedAt: processedAt ?? undefined,
      createdAt,
      customerId: customerId ?? undefined,
    },
    create: {
      tenantId,
      shopifyOrderId,
      orderNumber,
      email: order.email || null,
      totalPrice,
      currency,
      status,
      processedAt,
      createdAt,
      customerId,
    },
  });

  // Replace items
  await prisma.orderItem.deleteMany({ where: { orderId: saved.id } });
  for (const li of order.line_items || []) {
    const qty = li.quantity != null ? Number(li.quantity) : 1;
    const unitPrice = li.price != null ? parseFloat(li.price) : 0;
    const total = Number((unitPrice * qty).toFixed(2));

    let productId = null;
    if (li.product_id) {
      const p = await prisma.product.upsert({
        where: { tenantId_shopifyProductId: { tenantId, shopifyProductId: String(li.product_id) } },
        update: { title: li.name ?? undefined, sku: li.sku ?? undefined, price: unitPrice },
        create: {
          tenantId,
          shopifyProductId: String(li.product_id),
          title: li.name || 'Untitled',
          price: unitPrice,
          sku: li.sku || null,
          status: 'active',
        },
      });
      productId = p.id;
    }

    await prisma.orderItem.create({
      data: {
        orderId: saved.id,
        productId,
        title: li.name || 'Item',
        sku: li.sku || null,
        quantity: qty,
        price: unitPrice,
        totalPrice: total,
      },
    });
  }

  return saved;
}

/* ----------------- Topic router ----------------- */
async function processWebhook(tenantId, topic, payload) {
  const t = (topic || '').toLowerCase();
  if (t.startsWith('customers/')) {
    const c = payload.customer || payload;
    await upsertCustomer(tenantId, c);
    return;
  }
  if (t.startsWith('products/')) {
    const p = payload.product || payload;
    await upsertProduct(tenantId, p);
    return;
  }
  if (t.startsWith('orders/')) {
    const o = payload.order || payload;
    await upsertOrder(tenantId, o);
    return;
  }
}

/* ----------------- Webhook Endpoint ----------------- */
router.post('/webhook', rawJson, async (req, res) => {
  if (!isValidHmac(req)) return res.status(401).send('Invalid signature');

  const topic = req.get('X-Shopify-Topic') || '';
  const shop = req.get('X-Shopify-Shop-Domain') || '';
  const payload = JSON.parse(req.body.toString('utf8'));

  const tenant = await prisma.tenant.findFirst({ where: { shopifyDomain: shop } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const log = await prisma.webhookLog.create({
    data: { tenantId: tenant.id, event: topic, payload, status: 'PENDING' },
  });

  try {
    await processWebhook(tenant.id, topic, payload);
    await prisma.webhookLog.update({ where: { id: log.id }, data: { status: 'COMPLETED' } });
    return res.status(200).json({ ok: true });
  } catch (err) {
    await prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', errorMessage: String(err) },
    });
    console.error('Webhook processing failed:', err);
    return res.status(500).json({ error: 'processing failed' });
  }
});

/* ----------------- OAuth (simple) ----------------- */
const oauthStates = new Map(); // in-memory state store for dev

router.get('/auth', async (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing ?shop=');

  const state = crypto.randomBytes(8).toString('hex');
  oauthStates.set(shop, state);

  const redirectUri = `${process.env.APP_URL}/api/shopify/auth/callback`;
  const scopes = process.env.SCOPES || 'read_products,read_orders,read_customers,write_webhooks';
  const url =
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${process.env.SHOPIFY_API_KEY}` +
    `&scope=${encodeURIComponent(scopes)}` +
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

    // Exchange code for token
    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    });
    const accessToken = tokenRes.data.access_token;

    // Save/Update Tenant (name defaults to domain if not present)
    const tenant = await prisma.tenant.upsert({
      where: { shopifyDomain: shop },
      update: { shopifyToken: accessToken, isActive: true },
      create: {
        name: shop,
        shopifyDomain: shop,
        shopifyToken: accessToken,
        isActive: true,
      },
    });

    // Register webhooks
    await registerWebhooksForTenant(shop, accessToken);

    res
      .status(200)
      .send(`Installed for ${tenant.name}. Webhooks registered. You can close this tab.`);
  } catch (e) {
    console.error('OAuth callback failed:', e.response?.data || e.message);
    res.status(500).send('OAuth failed');
  }
});

/* -------- Register webhooks via Admin REST -------- */
async function registerWebhooksForTenant(shop, accessToken) {
  const address = `${process.env.APP_URL}/api/shopify/webhook`;
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
      // If duplicate exists, Shopify may return 422 — you can ignore errors silently if you want.
    } catch (e) {
      const code = e.response?.status;
      if (code !== 422) {
        console.warn(`Webhook register failed for ${topic}:`, code, e.response?.data || e.message);
      }
    }
  }
}

module.exports = router;
