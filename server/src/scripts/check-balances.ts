import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

async function main() {
  const circles = await prisma.circle.findMany({
    include: {
      admin: { select: { name: true, phone: true } },
      memberships: { select: { user_id: true } },
      contributions: {
        where: { status: 'PAID' },
        select: { amount: true, cycle_number: true, user_id: true },
      },
      payouts: {
        select: { amount: true, cycle_number: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  if (circles.length === 0) {
    console.log('No circles found.');
    return;
  }

  let grandTotal = 0;

  console.log('\n' + '═'.repeat(70));
  console.log('  QOVA CIRCLE BALANCES');
  console.log('═'.repeat(70));

  for (const circle of circles) {
    const paidThisCycle = circle.contributions
      .filter(c => c.cycle_number === circle.current_cycle)
      .reduce((sum, c) => sum + c.amount, 0);

    const totalCollected = circle.contributions.reduce((sum, c) => sum + c.amount, 0);
    const totalPaidOut   = circle.payouts.reduce((sum, p) => sum + p.amount, 0);
    const currentPot     = totalCollected - totalPaidOut;
    const expectedPot    = circle.contribution_amount * circle.memberships.length;
    const paidCount      = circle.contributions.filter(c => c.cycle_number === circle.current_cycle).length;
    const memberCount    = circle.memberships.length;

    grandTotal += currentPot;

    console.log(`\n  ${circle.name}`);
    console.log(`  ${'─'.repeat(50)}`);
    console.log(`  Invite Code   : ${circle.invite_code}`);
    console.log(`  Status        : ${circle.status}  |  Cycle ${circle.current_cycle}/${circle.total_slots}`);
    console.log(`  Admin         : ${circle.admin.name} (${circle.admin.phone})`);
    console.log(`  Members       : ${memberCount}/${circle.total_slots}`);
    console.log(`  Per person    : ${naira(circle.contribution_amount)}`);
    console.log(`  Paid this cycle: ${paidCount}/${memberCount} members  (${naira(paidThisCycle)} / ${naira(expectedPot)})`);
    console.log(`  Current pot   : ${naira(currentPot)}`);
    console.log(`  Total paid out: ${naira(totalPaidOut)}  (${circle.payouts.length} payout(s))`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  GRAND TOTAL HELD ACROSS ALL CIRCLES: ${naira(grandTotal)}`);
  console.log('═'.repeat(70) + '\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
