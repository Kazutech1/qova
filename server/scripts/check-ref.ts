import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { listVirtualAccountDeposits } from '../src/services/nomba';

async function main() {
  const deposits = await listVirtualAccountDeposits(48);
  for (const d of deposits) {
    console.log(`Deposit: ${d.accountRef} · ₦${d.amountKobo / 100} · ${d.timeCreated}`);
    const c = await prisma.contribution.findUnique({
      where: { nomba_account_ref: d.accountRef },
      include: { user: { select: { name: true } }, circle: { select: { name: true } } },
    });
    if (!c) { console.log('  → NO contribution row with this ref in DB\n'); continue; }
    console.log(`  → DB: ${c.user.name} · ${c.circle.name} · status=${c.status} · paid_via=${c.paid_via ?? '—'} · nomba_ref=${c.nomba_reference ?? '—'} · paid_at=${c.paid_at?.toISOString() ?? '—'}\n`);
  }
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
