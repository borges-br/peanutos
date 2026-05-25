const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('../../../apps/api/node_modules/bcryptjs'); // point directly to api's node_modules

async function run() {
  const user = await prisma.user.findFirst({
    where: { email: 'nathan@example.com' }
  });
  
  if (!user) {
    console.log('User nathan@example.com not found!');
    return;
  }
  
  console.log('User email:', user.email);
  console.log('User status:', user.status);
  console.log('Hash in DB:', user.passwordHash);
  
  // Test password comparisons
  const p1 = 'SecurePassword123!';
  const match = bcrypt.compareSync(p1, user.passwordHash);
  console.log(`Does hash match '${p1}'?`, match);
  
  await prisma.$disconnect();
}

run();
