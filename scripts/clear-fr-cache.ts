import { prisma } from '../src/lib/db.js';
async function main() {
  await prisma.dataRefreshLog.deleteMany({ where: { dataset: 'federal_register' } });
  await prisma.policyDocument.deleteMany({});
  console.log('Cleared Federal Register cache and data');
  await prisma.$disconnect();
}
main();
