import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOT_USERS = [
  { phone: '2348011111111', name: 'Emeka Okafor',    bank_account_number: '0011111111', bank_code: '058', bank_name: 'GTBank' },
  { phone: '2348022222222', name: 'Amaka Nwosu',     bank_account_number: '0022222222', bank_code: '011', bank_name: 'First Bank' },
  { phone: '2348033333333', name: 'Tunde Balogun',   bank_account_number: '0033333333', bank_code: '057', bank_name: 'Zenith Bank' },
  { phone: '2348044444444', name: 'Ngozi Eze',       bank_account_number: '0044444444', bank_code: '044', bank_name: 'Access Bank' },
  { phone: '2348055555555', name: 'Chidi Obiora',    bank_account_number: '0055555555', bank_code: '033', bank_name: 'UBA' },
  { phone: '2348066666666', name: 'Fatima Aliyu',    bank_account_number: '0066666666', bank_code: '070', bank_name: 'Fidelity Bank' },
  { phone: '2348077777777', name: 'Seun Adeyemi',    bank_account_number: '0077777777', bank_code: '063', bank_name: 'Diamond Bank' },
  { phone: '2348088888888', name: 'Blessing Okonkwo',bank_account_number: '0088888888', bank_code: '032', bank_name: 'Union Bank' },
  { phone: '2348099999999', name: 'Uche Nnamdi',     bank_account_number: '0099999999', bank_code: '215', bank_name: 'Unity Bank' },
];

const CONTRIBUTION_KOBO = 10_000; // ₦100
const CIRCLE_INVITE_CODE = 'AJO-SEED-01';

async function main() {
  // ── 1. Upsert bot users ───────────────────────────────────────────────────
  console.log('Seeding bot users...');
  const users = [];

  for (const u of BOT_USERS) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      create: { phone: u.phone, name: u.name, bank_account_number: u.bank_account_number, bank_code: u.bank_code, bank_name: u.bank_name },
      update:  { name: u.name, bank_account_number: u.bank_account_number, bank_code: u.bank_code, bank_name: u.bank_name },
    });

    // Pre-set OTP 123456 (valid 1 hour) so you can log in without WhatsApp
    await prisma.oTP.deleteMany({ where: { phone: u.phone } });
    await prisma.oTP.create({
      data: { phone: u.phone, code: '123456', expires_at: new Date(Date.now() + 60 * 60 * 1000) },
    });

    users.push(user);
    console.log(`  ✓ ${u.name} — ${u.phone}`);
  }

  // ── 2. Create / reset the seed circle ─────────────────────────────────────
  console.log('\nCreating seed circle...');

  // Clean up previous seed circle (contributions → payouts → memberships → circle)
  const existing = await prisma.circle.findUnique({ where: { invite_code: CIRCLE_INVITE_CODE } });
  if (existing) {
    await prisma.contribution.deleteMany({ where: { circle_id: existing.id } });
    await prisma.payout.deleteMany({ where: { circle_id: existing.id } });
    await prisma.membership.deleteMany({ where: { circle_id: existing.id } });
    await prisma.circle.delete({ where: { id: existing.id } });
    console.log('  ↻ Removed previous seed circle');
  }

  const [admin, ...members] = users;

  const circle = await prisma.circle.create({
    data: {
      name: 'Qova Seed Circle',
      invite_code: CIRCLE_INVITE_CODE,
      admin_id: admin.id,
      contribution_amount: CONTRIBUTION_KOBO,
      frequency: 'WEEKLY',
      total_slots: 10, // 9 bots + 1 slot for you
      status: 'PENDING',
      payout_order_type: 'AUTO',
      start_condition: 'AUTO',
      payout_order: users.map(u => u.id),
      current_cycle: 1,
    },
  });

  // ── 3. Add all bots as members ────────────────────────────────────────────
  await prisma.membership.createMany({
    data: users.map((u, i) => ({ user_id: u.id, circle_id: circle.id, slot_number: i + 1 })),
  });
  console.log(`  ✓ ${users.length} members added`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`
══════════════════════════════════════════
  Circle:      ${circle.name}
  Invite Code: ${circle.invite_code}
  Bots joined: ${users.length}/10
  Status:      PENDING — waiting for you!
  Login OTP:   123456  (valid 1 hr)

  Join with:   POST /circles/join
               { "invite_code": "${circle.invite_code}" }

  Circle auto-activates when you join as
  the 10th member. Then simulate bot
  deposits via POST /contributions/simulate-payment.
══════════════════════════════════════════
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
