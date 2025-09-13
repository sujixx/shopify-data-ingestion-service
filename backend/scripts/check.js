const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔎 Starting DB check...');
console.log('📦 Using .env at:', path.join(__dirname, '..', '.env'));
console.log('🔗 DATABASE_URL =', process.env.DATABASE_URL || '(not set)');

const { PrismaClient } = require('@prisma/client');
const mysql = require('mysql2/promise');

// Prisma with verbose logs
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

(async () => {
  // 1) Low-level ping via mysql2 to prove the port/host/db are reachable
  try {
    const url = new URL(process.env.DATABASE_URL);
    const conn = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: url.username,
      password: url.password,
      database: url.pathname.replace('/', ''),
    });
    await conn.ping();
    console.log('✅ mysql2 ping OK');
    await conn.end();
  } catch (e) {
    console.error('❌ mysql2 ping FAILED:', e.message);
  }

  // 2) Prisma queries with a 10s timeout so we don’t hang forever
  const withTimeout = (p, ms, label) =>
    Promise.race([
      p,
      new Promise((_r, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))
    ]);

  try {
    const tenants = await withTimeout(prisma.tenant.findMany(), 10000, 'tenant.findMany');
    const users = await withTimeout(prisma.user.findMany(), 10000, 'user.findMany');

    console.log('🏷️ Tenants count:', tenants.length);
    console.log('👤 Users count  :', users.length);
    console.log('Tenants sample  :', tenants.slice(0, 2));
    console.log('Users sample    :', users.slice(0, 2).map(u => ({ id: u.id, email: u.email, tenantId: u.tenantId })));
  } catch (e) {
    console.error('❌ Prisma query FAILED:', e.message);
  } finally {
    await prisma.$disconnect();
    console.log('🔚 Done.');
  }
})();
