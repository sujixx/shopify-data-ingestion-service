const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { shopify, webhookHandlers } = require('../config/shopify');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify Shopify webhooks
const verifyShopifyWebhook = (req, res, next) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash === hmac) {
    next();
  } else {
    console.warn('❌ Invalid webhook signature');
    res.status(401).send('Unauthorized');
  }
};

// Shopify webhook endpoint
router.post('/webhook', verifyShopifyWebhook, async (req, res) => {
  try {
    const topic = req.get('X-Shopify-Topic');
    const shop = req.get('X-Shopify-Shop-Domain');
    const payload = req.body;

    console.log(`📨 Webhook received: ${topic} from ${shop}`);

    // Find tenant by shop domain
    const tenant = await prisma.tenant.findFirst({
      where: { shopifyDomain: shop }
    });

    if (!tenant) {
      console.warn(`⚠️ No tenant found for shop: ${shop}`);
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Log the webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        tenantId: tenant.id,
        event: topic,
        payload: payload,
        status: 'PENDING'
      }
    });

    try {
      // Process based on webhook type
      await processWebhook(tenant.id, topic, payload);

      // Update log as completed
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'COMPLETED',
          updatedAt: new Date()
        }
      });

      console.log(`✅ Webhook processed: ${topic}`);
    } catch (processError) {
      // Update log as failed
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { 
          status: 'FAILED',
          errorMessage: processError.message
        }
      });

      console.error(`❌ Webhook processing failed:`, processError);
    }

    // Always respond OK to Shopify (so they don't retry)
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Manual data sync endpoint
router.post('/sync', authenticate, async (req, res) => {
  try {
    const { tenantId } = req;
    const { resources = ['customers', 'orders', 'products'] } = req.body;

    console.log(`🔄 Starting manual sync for tenant: ${tenantId}`);

    const results = {};

    // You can add actual Shopify API calls here
    // For now, we'll create some sample data
    if (resources.includes('customers')) {
      results.customers = await createSampleCustomers(tenantId);
    }

    if (resources.includes('orders')) {
      results.orders = await createSampleOrders(tenantId);
    }

    if (resources.includes('products')) {
      results.products = await createSampleProducts(tenantId);
    }

    res.json({
      success: true,
      message: 'Sync completed',
      results
    });

  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});

// Connect Shopify store to tenant
router.post('/connect', authenticate, async (req, res) => {
  try {
    const { tenantId } = req;
    const { shopifyDomain } = req.body;

    // Update tenant with Shopify domain
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { shopifyDomain }
    });

    res.json({
      success: true,
      message: 'Shopify store connected',
      tenant: updatedTenant
    });

  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({
      error: 'Connection failed'
    });
  }
});

// Process webhook based on type
async function processWebhook(tenantId, topic, payload) {
  switch (topic) {
    case 'customers/create':
    case 'customers/update':
      return await processCustomer(tenantId, payload);
    
    case 'orders/create':
    case 'orders/updated':
      return await processOrder(tenantId, payload);
    
    case 'products/create':
    case 'products/update':
      return await processProduct(tenantId, payload);
    
    default:
      console.log(`ℹ️ Unhandled webhook: ${topic}`);
  }
}

// Process customer data
async function processCustomer(tenantId, shopifyCustomer) {
  const customer = await prisma.customer.upsert({
    where: {
      email_tenantId: {
        email: shopifyCustomer.email,
        tenantId
      }
    },
    update: {
      shopifyCustomerId: shopifyCustomer.id?.toString(),
      firstName: shopifyCustomer.first_name,
      lastName: shopifyCustomer.last_name,
      phone: shopifyCustomer.phone,
      totalSpent: parseFloat(shopifyCustomer.total_spent || 0),
      ordersCount: shopifyCustomer.orders_count || 0
    },
    create: {
      tenantId,
      shopifyCustomerId: shopifyCustomer.id?.toString(),
      email: shopifyCustomer.email,
      firstName: shopifyCustomer.first_name,
      lastName: shopifyCustomer.last_name,
      phone: shopifyCustomer.phone,
      totalSpent: parseFloat(shopifyCustomer.total_spent || 0),
      ordersCount: shopifyCustomer.orders_count || 0
    }
  });

  console.log(`👤 Customer processed: ${customer.email}`);
  return customer;
}

// Process order data
async function processOrder(tenantId, shopifyOrder) {
  // Find customer
  let customer = null;
  if (shopifyOrder.customer && shopifyOrder.customer.email) {
    customer = await prisma.customer.findFirst({
      where: {
        email: shopifyOrder.customer.email,
        tenantId
      }
    });

    // Create customer if doesn't exist
    if (!customer) {
      customer = await processCustomer(tenantId, shopifyOrder.customer);
    }
  }

  // Create/update order
  const order = await prisma.order.upsert({
    where: {
      shopifyOrderId_tenantId: {
        shopifyOrderId: shopifyOrder.id.toString(),
        tenantId
      }
    },
    update: {
      orderNumber: shopifyOrder.name || shopifyOrder.order_number?.toString(),
      email: shopifyOrder.email,
      totalPrice: parseFloat(shopifyOrder.total_price || 0),
      status: mapOrderStatus(shopifyOrder.financial_status),
      processedAt: shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : new Date(),
      customerId: customer?.id
    },
    create: {
      tenantId,
      shopifyOrderId: shopifyOrder.id.toString(),
      orderNumber: shopifyOrder.name || shopifyOrder.order_number?.toString(),
      email: shopifyOrder.email,
      totalPrice: parseFloat(shopifyOrder.total_price || 0),
      status: mapOrderStatus(shopifyOrder.financial_status),
      processedAt: shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : new Date(),
      customerId: customer?.id
    }
  });

  // Process line items
  if (shopifyOrder.line_items) {
    for (const item of shopifyOrder.line_items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          totalPrice: parseFloat(item.price) * item.quantity,
          title: item.title,
          sku: item.sku
        }
      });
    }
  }

  console.log(`🛍️ Order processed: ${order.orderNumber}`);
  return order;
}

// Process product data
async function processProduct(tenantId, shopifyProduct) {
  const product = await prisma.product.upsert({
    where: {
      shopifyProductId_tenantId: {
        shopifyProductId: shopifyProduct.id.toString(),
        tenantId
      }
    },
    update: {
      title: shopifyProduct.title,
      handle: shopifyProduct.handle,
      description: shopifyProduct.body_html,
      vendor: shopifyProduct.vendor,
      status: shopifyProduct.status || 'active',
      price: shopifyProduct.variants?.[0]?.price ? parseFloat(shopifyProduct.variants[0].price) : 0,
      sku: shopifyProduct.variants?.[0]?.sku
    },
    create: {
      tenantId,
      shopifyProductId: shopifyProduct.id.toString(),
      title: shopifyProduct.title,
      handle: shopifyProduct.handle,
      description: shopifyProduct.body_html,
      vendor: shopifyProduct.vendor,
      status: shopifyProduct.status || 'active',
      price: shopifyProduct.variants?.[0]?.price ? parseFloat(shopifyProduct.variants[0].price) : 0,
      sku: shopifyProduct.variants?.[0]?.sku
    }
  });

  console.log(`📦 Product processed: ${product.title}`);
  return product;
}

// Helper function to map Shopify order status
function mapOrderStatus(shopifyStatus) {
  const statusMap = {
    'pending': 'PENDING',
    'authorized': 'CONFIRMED',
    'paid': 'CONFIRMED',
    'partially_paid': 'PROCESSING',
    'refunded': 'CANCELLED',
    'voided': 'CANCELLED'
  };
  return statusMap[shopifyStatus] || 'PENDING';
}

// Sample data creators (for testing without real Shopify store)
async function createSampleCustomers(tenantId) {
  const sampleCustomers = [
    { email: 'john@example.com', firstName: 'John', lastName: 'Doe', totalSpent: 299.99 },
    { email: 'jane@example.com', firstName: 'Jane', lastName: 'Smith', totalSpent: 199.50 },
    { email: 'bob@example.com', firstName: 'Bob', lastName: 'Johnson', totalSpent: 450.00 }
  ];

  const results = [];
  for (const customerData of sampleCustomers) {
    const customer = await prisma.customer.upsert({
      where: {
        email_tenantId: {
          email: customerData.email,
          tenantId
        }
      },
      update: customerData,
      create: { ...customerData, tenantId }
    });
    results.push(customer);
  }

  return { count: results.length, created: results.length };
}

async function createSampleOrders(tenantId) {
  const customers = await prisma.customer.findMany({
    where: { tenantId }
  });

  if (customers.length === 0) {
    return { count: 0, message: 'No customers found' };
  }

  const sampleOrders = [
    { orderNumber: 'ORD-001', totalPrice: 99.99, customerId: customers[0].id },
    { orderNumber: 'ORD-002', totalPrice: 149.50, customerId: customers[1]?.id || customers[0].id },
    { orderNumber: 'ORD-003', totalPrice: 75.25, customerId: customers[2]?.id || customers[0].id }
  ];

  const results = [];
  for (const orderData of sampleOrders) {
    const order = await prisma.order.create({
      data: { ...orderData, tenantId }
    });
    results.push(order);
  }

  return { count: results.length, created: results.length };
}

async function createSampleProducts(tenantId) {
  const sampleProducts = [
    { title: 'Sample T-Shirt', price: 25.99, sku: 'TSH-001' },
    { title: 'Sample Jeans', price: 79.99, sku: 'JNS-001' },
    { title: 'Sample Sneakers', price: 120.00, sku: 'SNK-001' }
  ];

  const results = [];
  for (const productData of sampleProducts) {
    const product = await prisma.product.create({
      data: { ...productData, tenantId }
    });
    results.push(product);
  }

  return { count: results.length, created: results.length };
}

module.exports = router;
