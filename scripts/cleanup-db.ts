import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Attempting to manually drop the FTS trigger and function...');

  try {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS incident_fts_update ON "Incident";`);
    console.log('✅ Trigger "incident_fts_update" dropped successfully.');
  } catch (error) {
    console.error('❌ Failed to drop trigger. It may not have existed.', error);
  }

  try {
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS update_incident_fts();`);
    console.log('✅ Function "update_incident_fts" dropped successfully.');
  } catch (error) {
    console.error('❌ Failed to drop function. It may not have existed.', error);
  }

  console.log('💧 Database cleanup script finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
