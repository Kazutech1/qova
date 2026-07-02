import 'dotenv/config';
import prisma from '../src/utils/prisma';

async function main() {
  // ── Dummy users (all share the same sandbox bank account for easy payout verification)
  const dummies = [
    { name: 'Adaeze Okonkwo', phone: '+2340000000001' },
    { name: 'Emeka Nwosu',    phone: '+2340000000002' },
    { name: 'Fatima Bello',   phone: '+2340000000003' },
  ];

  const createdUsers = [];
  for (const d of dummies) {
    const user = await prisma.user.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        name: d.name,
        phone: d.phone,
        bank_account_number: '8157012422',
        bank_code: '305',
        bank_name: 'Paycom (Opay)',
        reliability_score: 50,
      },
    });
    createdUsers.push(user);
    console.log(`✓ User: ${user.name} (${user.id})`);
  }

  // ── Circle: 4 slots, 1 left for the real user to join
  const circle = await prisma.circle.create({
    data: {
      name:                'Test Ajo Circle',
      invite_code:         'TEST-0001-42',
      contribution_amount: 100_000,          // 1000 NGN in kobo
      frequency:           'WEEKLY',
      total_slots:         4,
      payout_order_type:   'AUTO',
      start_condition:     'AUTO',           // auto-starts when slot 4 fills
      admin_id:            createdUsers[0].id,
      status:              'PENDING',
      payout_order:        createdUsers.map(u => u.id),
    },
  });
  console.log(`\n✓ Circle created: ${circle.name} (${circle.id})`);

  // ── Add all 3 dummies as members
  for (let i = 0; i < createdUsers.length; i++) {
    await prisma.membership.upsert({
      where: { id: `placeholder-${i}` },
      update: {},
      create: {
        user_id:    createdUsers[i].id,
        circle_id:  circle.id,
        slot_number: i + 1,
      },
    }).catch(async () => {
      // upsert by compound isn't available — just create
      await prisma.membership.create({
        data: { user_id: createdUsers[i].id, circle_id: circle.id, slot_number: i + 1 },
      });
    });
    console.log(`  ↳ ${createdUsers[i].name} → slot ${i + 1}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  INVITE CODE : ${circle.invite_code}`);
  console.log(`  Circle ID   : ${circle.id}`);
  console.log(`  Slot 4 is waiting for you — join to auto-start the circle.`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await prisma.$disconnect();
}

main().catch(console.error);
