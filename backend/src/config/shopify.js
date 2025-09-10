const { shopifyApi } = require('@shopify/shopify-api');
const { PrismaSessionStorage } = require('@shopify/shopify-app-session-storage-prisma');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: ['read_products', 'read_customers', 'read_orders', 'write_webhooks'],
  hostName: process.env.SHOPIFY_APP_URL?.replace('https://', '') || 'localhost:3000',
  apiVersion: '2024-01',
  isEmbeddedApp: true,
  sessionStorage: new PrismaSessionStorage(prisma)
});

// Webhook handlers
const webhookHandlers = {
  CUSTOMERS_CREATE: async (topic, shop, body) => {
    console.log(`Customer created in ${shop}:`, body.id);
  },
  CUSTOMERS_UPDATE: async (topic, shop, body) => {
    console.log(`Customer updated in ${shop}:`, body.id);
  },
  ORDERS_CREATE: async (topic, shop, body) => {
    console.log(`Order created in ${shop}:`, body.id);
  },
  ORDERS_UPDATED: async (topic, shop, body) => {
    console.log(`Order updated in ${shop}:`, body.id);
  },
  PRODUCTS_CREATE: async (topic, shop, body) => {
    console.log(`Product created in ${shop}:`, body.id);
  },
  PRODUCTS_UPDATE: async (topic, shop, body) => {
    console.log(`Product updated in ${shop}:`, body.id);
  }
};

module.exports = { shopify, webhookHandlers };
 
