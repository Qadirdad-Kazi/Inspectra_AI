#!/usr/bin/env tsx
/**
 * Promote a user to platform admin.
 * Usage: DATABASE_URL=... pnpm --filter @inspectra/db exec tsx ../../tooling/scripts/promote-admin.ts user@example.com
 */
import { PrismaClient } from '@prisma/client';

const email = process.argv[2];
if (!email) {
  console.error('Usage: promote-admin.ts <email>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { isPlatformAdmin: true },
  });
  console.log(`Promoted ${user.email} to platform admin`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
