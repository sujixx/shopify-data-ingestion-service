const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/verify?shop=<your-store>.myshopify.com
 * Returns counts + a few recent webhook logs for that tenant.
 */
router.get('/', async (req, res) => {
  try {
    const shop = req.query.shop;
    if (!shop) return res.status(400).json({ error: 'Missing ?shop=' });

    const tenant = await prisma.tenant.findFirst({
      where: { shopifyDomain: shop, isActive: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found for this shop' });

    const [customers, products, orders, logs, latestOrders] = await Promise.all([
      prisma.customer.count({ where: { tenantId: tenant.id } }),
      prisma.product.count({ where: { tenantId: tenant.id } }),
      prisma.order.count({ where: { tenantId: tenant.id } }),
      prisma.webhookLog.findMany({
        where: { tenantId: tenant.id },
        select: { event: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.order.findMany({
        where: { tenantId: tenant.id },
        select: { orderNumber: true, totalPrice: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ]);

    res.json({
      shop,
      tenantId: tenant.id,
      counts: { customers, products, orders, webhookLogs: logs.length },
      latestWebhookLogs: logs,
      latestOrders
    });
  } catch (e) {
    console.error('Verify error:', e);
    res.status(500).json({ error: 'Failed to verify' });
  }
});

module.exports = router;
