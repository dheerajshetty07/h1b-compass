import { prisma } from '../src/lib/db.js';
async function check() {
  const oflc = await prisma.wagesOflc.count();
  const oews = await prisma.wagesOews.count();
  console.log('OFLC records:', oflc);
  console.log('OEWS records:', oews);

  const sample = await prisma.wagesOflc.findFirst({ where: { socCode: '151252', areaCode: '41860' } });
  console.log('SF Software Dev OFLC:', sample ? JSON.stringify({ l1: sample.level1Annual, l2: sample.level2Annual, l3: sample.level3Annual, l4: sample.level4Annual }, null, 2) : 'NOT FOUND');

  const oewsSample = await prisma.wagesOews.findFirst({ where: { socCode: '151252', areaCode: '41860' } });
  console.log('SF Software Dev OEWS:', oewsSample ? JSON.stringify({ mean: oewsSample.mean, p50: oewsSample.p50, p90: oewsSample.p90 }, null, 2) : 'NOT FOUND');

  await prisma.$disconnect();
}
check();
