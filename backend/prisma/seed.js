const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Store',
      shopifyDomain: 'demo-store.myshopify.com'
    }
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('password123', 12);
  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      tenantId: tenant.id
    }
  });

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
