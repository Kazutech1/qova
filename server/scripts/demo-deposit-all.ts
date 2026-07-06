import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { runDepositReconciliation } from '../src/services/cron';
import { markContributionPaid, ensureAutoDebitContribution } from '../src/services/contribution';
import { getMasterBalance } from '../src/services/nomba';

const INVITE = 'HACK-2026-01';
const DUMMY_PHONES = new Set(['+2348011111111', '+2348022222222', '+2348033333333', '+2348044444444']);

async function main() {
  const circle = await prisma.circle.findUnique({
    where: { invite_code: INVITE },
    include: { memberships: { include: { user: true }, orderBy: { slot_number: 'asc' } } },
  });
  if (!circle) throw new Error('Demo circle not found — run seed-hackathon-demo.ts first');

  console.log(`Circle: ${circle.name} · ${circle.status} · cycle ${circle.current_cycle} · ${circle.memberships.length}/${circle.total_slots} members`);

  // 1) You must have joined
  const joiner = circle.memberships.find(m => !DUMMY_PHONES.has(m.user.phone));
  if (!joiner) {
    console.log(`\n⛔ You haven't joined yet — join with ${INVITE} in the app, then re-run.`);
    await prisma.$disconnect(); return;
  }
  console.log(`Joiner: ${joiner.user.name} (${joiner.user.phone})`);

  // 2) Crown: you must be FIRST in payout order before the pot completes
  if (circle.payout_order[0] !== joiner.user_id) {
    const dummyIds = circle.memberships.filter(m => DUMMY_PHONES.has(m.user.phone)).map(m => m.user_id);
    await prisma.circle.update({
      where: { id: circle.id },
      data: { payout_order: [joiner.user_id, ...dummyIds], ...(circle.status === 'PENDING' ? { status: 'ACTIVE' } : {}) },
    });
    console.log('👑 Payout order fixed — you are now the cycle-1 recipient');
  } else {
    console.log('👑 Already first in payout order');
  }

  // 3) Wallet check — the payout will auto-fire when the pot completes
  const pot = circle.contribution_amount * circle.memberships.length;
  const bal = await getMasterBalance();
  console.log(`\nPot: ₦${pot / 100} · Master wallet: ₦${bal?.balanceNaira ?? '?'}`);
  if (bal && bal.balanceKobo < pot) {
    console.log('⚠️  Wallet below pot — the auto-payout will FAIL until it is topped up (sweep will retry).');
  }

  // 4) Settle YOUR real deposit from Nomba's feed (webhook-independent)
  console.log('\n── Reconciling your real deposit ──');
  await runDepositReconciliation();

  const fresh = await prisma.circle.findUnique({ where: { id: circle.id } });
  const yourContrib = await prisma.contribution.findFirst({
    where: { circle_id: circle.id, user_id: joiner.user_id, cycle_number: fresh!.current_cycle },
  });
  console.log(`Your contribution: ${yourContrib?.status ?? 'NOT CREATED YET'} ${yourContrib?.nomba_reference ? `(ref ${yourContrib.nomba_reference})` : ''}`);
  if (yourContrib?.status !== 'PAID') {
    console.log('⛔ Your deposit is not visible in the Nomba feed yet. Wait a minute and re-run — dummies were NOT settled.');
    await prisma.$disconnect(); return;
  }

  // 5) Dummies deposit (simulated) — the LAST one completes the pot and triggers the real payout
  console.log('\n── Dummy deposits ──');
  for (const m of circle.memberships) {
    if (!DUMMY_PHONES.has(m.user.phone)) continue;
    const contribution = await ensureAutoDebitContribution(fresh!, m.user_id);
    if (contribution.status === 'PAID') { console.log(`  ${m.user.name}: already paid`); continue; }
    await markContributionPaid(
      { id: contribution.id, user_id: contribution.user_id, circle_id: contribution.circle_id, circle: fresh! },
      { nombaReference: `demo-sim-${Date.now()}`, wasLate: false, paidVia: 'MANUAL' },
    );
    console.log(`  ${m.user.name}: PAID ✓`);
  }

  // 6) Give the auto-payout (setImmediate) time to fire, then report the truth
  console.log('\n── Waiting for auto-payout… ──');
  await new Promise(r => setTimeout(r, 12_000));

  const payout = await prisma.payout.findFirst({
    where: { circle_id: circle.id, cycle_number: fresh!.current_cycle },
    include: { recipient: { select: { name: true } } },
  });
  const after = await prisma.circle.findUnique({ where: { id: circle.id } });

  if (payout) {
    console.log(`\n🎉 PAYOUT FIRED: ₦${payout.amount / 100} → ${payout.recipient.name}`);
    console.log(`   transfer ref: ${payout.nomba_transfer_reference}`);
    console.log(`   circle now: cycle ${after?.current_cycle} · ${after?.status}`);
  } else {
    console.log('\n⚠️  No payout row yet — the transfer likely failed (check wallet balance / logs above).');
    console.log('   The payout sweep retries every 2 minutes once the blocker is fixed.');
  }

  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
