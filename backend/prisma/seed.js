const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { name: 'Demo Store' },
    update: { shopifyDomain: 'demo-store.myshopify.com', isActive: true },
    create: { name: 'Demo Store', shopifyDomain: 'demo-store.myshopify.com', isActive: true }
  });

  const hashed = await bcrypt.hash('password123', 12);

  await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@demo.com', tenantId: tenant.id } },
    update: {
      password: hashed,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true
    },
    create: {
      email: 'admin@demo.com',
      password: hashed,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      tenantId: tenant.id,
      isActive: true
    }
  });

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
