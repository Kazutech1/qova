import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOT_PHONES = [
  '2348011111111',
  '2348022222222',
  '2348033333333',
  '2348044444444',
  '2348055555555',
  '2348066666666',
  '2348077777777',
  '2348088888888',
  '2348099999999',
];

const CONTRIBUTION_KOBO = 10_000; // ₦100
const INVITE_CODE = 'TEST-PAY-01';

async function main() {
  // ── 1. Fetch the 9 bots (must already exist from npm run seed) ────────────
  const bots = await prisma.user.findMany({
    where: { phone: { in: BOT_PHONES } },
  });

  if (bots.length < 9) {
    console.error(`Only found ${bots.length}/9 bots. Run "npm run seed" first.`);
    process.exit(1);
  }

  const [admin, ...members] = bots;

  // ── 2. Clean up any previous version of this circle ───────────────────────
  const existing = await prisma.circle.findUnique({ where: { invite_code: INVITE_CODE } });
  if (existing) {
    await prisma.contribution.deleteMany({ where: { circle_id: existing.id } });
    await prisma.payout.deleteMany({ where: { circle_id: existing.id } });
    await prisma.membership.deleteMany({ where: { circle_id: existing.id } });
    await prisma.circle.delete({ where: { id: existing.id } });
    console.log('↻ Removed previous test circle');
  }

  // ── 3. Create circle — PENDING so you can join as the 10th ───────────────
  const circle = await prisma.circle.create({
    data: {
      name: 'Test Pay Circle',
      invite_code: INVITE_CODE,
      admin_id: admin.id,
      contribution_amount: CONTRIBUTION_KOBO,
      frequency: 'WEEKLY',
      total_slots: 10,
      status: 'PENDING',
      payout_order_type: 'AUTO',
      start_condition: 'AUTO',
      payout_order: bots.map(b => b.id),
      current_cycle: 1,
    },
  });

  // ── 4. Add 9 bots as members ──────────────────────────────────────────────
  await prisma.membership.createMany({
    data: bots.map((b, i) => ({ user_id: b.id, circle_id: circle.id, slot_number: i + 1 })),
  });

  // ── 5. Pre-seed 9 PAID contributions (directly via Prisma) ───────────────
  const now = new Date();
  for (const bot of bots) {
    await prisma.contribution.create({
      data: {
        user_id: bot.id,
        circle_id: circle.id,
        cycle_number: 1,
        amount: CONTRIBUTION_KOBO,
        status: 'PAID',
        paid_at: now,
        due_date: now,
        nomba_account_ref: `seed-pay-${circle.id}-${bot.id}-cycle1`,
        nomba_reference: `seed-ref-${Date.now()}-${bot.id}`,
      },
    });
    await prisma.user.update({
      where: { id: bot.id },
      data: { reliability_score: { increment: 50 } },
    });
  }

  const botsPot = (CONTRIBUTION_KOBO * bots.length) / 100;

  console.log(`
══════════════════════════════════════════════════════
  Test Pay Circle ready!
  Invite Code : ${INVITE_CODE}
  Bots joined : 9/10  (all 9 already PAID)
  Bots pot    : ₦${botsPot.toLocaleString()} collected
  Status      : PENDING — waiting for you to join

  1. Join  →  POST /circles/join
              { "invite_code": "${INVITE_CODE}" }
              Circle auto-activates when you join.

  2. Pay   →  POST /contributions/pay
              { "circle_id": "<your circle id>" }
              Transfer ₦100 to the virtual account.

  3. Done  →  All 10 paid → payout fires automatically.
══════════════════════════════════════════════════════
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
