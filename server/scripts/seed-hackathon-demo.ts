import 'dotenv/config';
import prisma from '../src/utils/prisma';

// ─── Hackathon demo circle ────────────────────────────────────────────────────
// Seeds 4 dummy members into a 5-slot circle. You join as the 5th (last) member
// from the app using the invite code — the circle auto-starts on your join.
// Re-run the script after joining: it detects you and rewrites payout_order so
// YOU receive the first payout (cycle 1).
//
// Usage:
//   npx tsx scripts/seed-hackathon-demo.ts            → seed (or crown if you already joined)
//   npx tsx scripts/seed-hackathon-demo.ts --reset    → wipe and reseed fresh
//   npx tsx scripts/seed-hackathon-demo.ts 50         → ₦50 contribution instead of ₦100

const INVITE = 'HACK-2026-01';
const CONTRIBUTION_NAIRA = Number(process.argv.find(a => /^\d+$/.test(a)) ?? 100);
const RESET = process.argv.includes('--reset');

// Shared sandbox bank details (same as other seed scripts) — only used if a
// dummy ever needs a payout lookup; cycle 1 goes to YOU with your real account.
const SANDBOX_BANK = {
  bank_account_number: '8157012422',
  bank_code: '305',
  bank_name: 'Paycom (Opay)',
};

const DUMMIES = [
  { name: 'Emeka Okafor',  phone: '+2348011111111' },
  { name: 'Amaka Nwosu',   phone: '+2348022222222' },
  { name: 'Tunde Balogun', phone: '+2348033333333' },
  { name: 'Ngozi Eze',     phone: '+2348044444444' },
];

async function wipe(circleId: string) {
  await prisma.directDebitMandate.deleteMany({ where: { circle_id: circleId } });
  await prisma.contribution.deleteMany({ where: { circle_id: circleId } });
  await prisma.payout.deleteMany({ where: { circle_id: circleId } });
  await prisma.membership.deleteMany({ where: { circle_id: circleId } });
  await prisma.circle.delete({ where: { id: circleId } });
}

async function main() {
  const existing = await prisma.circle.findUnique({
    where: { invite_code: INVITE },
    include: { memberships: { include: { user: true }, orderBy: { slot_number: 'asc' } } },
  });

  if (existing && RESET) {
    await wipe(existing.id);
    console.log('✓ Previous demo circle wiped');
  }

  // ── Phase 2: circle exists — crown the last joiner if it's full ──────────────
  if (existing && !RESET) {
    const dummyPhones = new Set(DUMMIES.map(d => d.phone));
    const joiner = existing.memberships.find(m => !dummyPhones.has(m.user.phone));

    console.log(`Circle "${existing.name}" · ${existing.memberships.length}/${existing.total_slots} members · ${existing.status}`);

    if (!joiner) {
      console.log(`\n⏳ Waiting on you — join from the app with invite code: ${INVITE}`);
      console.log('   Then re-run this script to become first payout recipient.\n');
      await prisma.$disconnect();
      return;
    }

    const dummyIds = existing.memberships
      .filter(m => dummyPhones.has(m.user.phone))
      .map(m => m.user_id);
    const newOrder = [joiner.user_id, ...dummyIds];

    await prisma.circle.update({
      where: { id: existing.id },
      data: { payout_order: newOrder, ...(existing.status === 'PENDING' ? { status: 'ACTIVE' } : {}) },
    });

    console.log(`\n👑 ${joiner.user.name} is now FIRST in the payout order (cycle 1 recipient).`);
    console.log(`   Order: ${joiner.user.name} → ${DUMMIES.map(d => d.name.split(' ')[0]).join(' → ')}`);
    console.log(`   Pot: ₦${((existing.contribution_amount * existing.total_slots) / 100).toLocaleString()} — make sure the master wallet covers it before payout.\n`);
    await prisma.$disconnect();
    return;
  }

  // ── Phase 1: seed 4 dummies + a 5-slot circle awaiting your join ─────────────
  const users = [];
  for (const d of DUMMIES) {
    const user = await prisma.user.upsert({
      where: { phone: d.phone },
      update: { ...SANDBOX_BANK },
      create: { name: d.name, phone: d.phone, reliability_score: 72, ...SANDBOX_BANK },
    });
    users.push(user);
    console.log(`✓ ${user.name}`);
  }

  const circle = await prisma.circle.create({
    data: {
      name:                'Hackathon Demo Circle',
      invite_code:         INVITE,
      contribution_amount: CONTRIBUTION_NAIRA * 100, // kobo
      frequency:           'WEEKLY',
      total_slots:         5,
      payout_order_type:   'MANUAL',  // prevents shuffle on auto-start — script controls order
      start_condition:     'AUTO',    // auto-activates the moment you (slot 5) join
      admin_id:            users[0].id,
      status:              'PENDING',
      payout_order:        users.map(u => u.id),
    },
  });

  for (let i = 0; i < users.length; i++) {
    await prisma.membership.create({
      data: { user_id: users[i].id, circle_id: circle.id, slot_number: i + 1 },
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━ HACKATHON DEMO CIRCLE READY ━━━━━━━━━━━━━━━━');
  console.log(`  INVITE CODE : ${INVITE}`);
  console.log(`  Circle      : ${circle.name} (${circle.id})`);
  console.log(`  Contribution: ₦${CONTRIBUTION_NAIRA.toLocaleString()} weekly · 5 slots (4 filled)`);
  console.log('');
  console.log('  NEXT STEPS:');
  console.log(`  1. In the app: Join Circle → ${INVITE}  (circle auto-starts on your join)`);
  console.log('  2. Re-run this script → you become the FIRST payout recipient.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
