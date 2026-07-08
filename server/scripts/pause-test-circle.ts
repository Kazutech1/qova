import 'dotenv/config';
import prisma from '../src/utils/prisma';

async function main() {
  const circle = await prisma.circle.findFirst({
    where: { name: { contains: 'Test Pay' }, status: 'ACTIVE' },
  });
  if (!circle) { console.log('No active Test Pay circle found'); return; }

  await prisma.circle.update({ where: { id: circle.id }, data: { status: 'PAUSED' } });
  console.log(`✓ Paused "${circle.name}" (${circle.id}) — payout retry loop will stop on the next sweep.`);
  console.log('  To resume later: set status back to ACTIVE after fixing the recipient bank details.');
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
