import 'dotenv/config';
import prisma from '../src/utils/prisma';

async function main() {
  const payouts = await prisma.payout.findMany({
    include: { recipient: { select: { name: true } }, circle: { select: { name: true } } },
    orderBy: { paid_at: 'desc' },
  });
  console.log(`Payout rows in DB: ${payouts.length}\n`);
  for (const p of payouts) {
    console.log(`  ₦${p.amount / 100} → ${p.recipient.name} · ${p.circle.name} · cycle ${p.cycle_number} · ${p.paid_at.toISOString()}`);
    console.log(`    transfer_ref: ${p.nomba_transfer_reference ?? '—'}`);
  }

  // Circles where everyone paid current cycle but no payout recorded (stalled?)
  const active = await prisma.circle.findMany({
    where: { status: 'ACTIVE' },
    include: { memberships: true },
  });
  console.log(`\nActive circles: ${active.length}`);
  for (const c of active) {
    const paid = await prisma.contribution.count({
      where: { circle_id: c.id, cycle_number: c.current_cycle, status: 'PAID' },
    });
    console.log(`  ${c.name}: cycle ${c.current_cycle}/${c.total_slots} — ${paid}/${c.memberships.length} paid`);
  }
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
