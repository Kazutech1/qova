import 'dotenv/config';
import jwt from 'jsonwebtoken';
import prisma from '../src/utils/prisma';

const INVITE = 'AUTOD-0001-01';

// Nomba sandbox account shared by all test users (same as seed-test-circle.ts)
const SANDBOX_BANK = {
  bank_account_number: '8157012422',
  bank_code: '305',
  bank_name: 'Paycom (Opay)',
};

async function main() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in .env — cannot mint a test token.');
  }

  // ── Users: "you" + 2 dummies, all with sandbox bank details
  const people = [
    { name: 'You (Test)',     phone: '+2349000000099' },
    { name: 'Test Member A',  phone: '+2349000000097' },
    { name: 'Test Member B',  phone: '+2349000000098' },
  ];

  const users = [];
  for (const p of people) {
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: { ...SANDBOX_BANK },
      create: { name: p.name, phone: p.phone, reliability_score: 50, ...SANDBOX_BANK },
    });
    users.push(user);
  }
  const you = users[0];

  // ── Clean up any prior run of this test circle (Mongo has no cascade)
  const prior = await prisma.circle.findUnique({ where: { invite_code: INVITE } });
  if (prior) {
    await prisma.directDebitMandate.deleteMany({ where: { circle_id: prior.id } });
    await prisma.contribution.deleteMany({ where: { circle_id: prior.id } });
    await prisma.payout.deleteMany({ where: { circle_id: prior.id } });
    await prisma.membership.deleteMany({ where: { circle_id: prior.id } });
    await prisma.circle.delete({ where: { id: prior.id } });
    console.log('✓ Cleared previous test circle');
  }

  // ── Fresh ACTIVE circle with you as admin + slot 1
  const circle = await prisma.circle.create({
    data: {
      name:                'Auto-Debit Test Circle',
      invite_code:         INVITE,
      contribution_amount: 100_000,        // ₦1,000 in kobo
      frequency:           'WEEKLY',
      total_slots:         3,
      payout_order_type:   'AUTO',
      start_condition:     'AUTO',
      admin_id:            you.id,
      status:              'ACTIVE',
      payout_order:        users.map(u => u.id),
      current_cycle:       1,
      cycle_started_at:    new Date(),      // anchors cycle-1 due date to now → due immediately
    },
  });

  for (let i = 0; i < users.length; i++) {
    await prisma.membership.create({
      data: { user_id: users[i].id, circle_id: circle.id, slot_number: i + 1 },
    });
  }

  const token = jwt.sign({ userId: you.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━ AUTO-DEBIT TEST READY ━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Circle ID : ${circle.id}`);
  console.log(`  Your user : ${you.name} (${you.id})`);
  console.log(`  Status    : ACTIVE · ₦1,000 weekly · you are slot 1`);
  console.log('\n  JWT (paste into Swagger “Authorize”, or use as Bearer token):');
  console.log(`\n${token}\n`);
  console.log('  Next: POST /circles/' + circle.id + '/mandate   → enables auto-debit');
  console.log('        GET  /circles/' + circle.id + '/mandate   → check activation status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
