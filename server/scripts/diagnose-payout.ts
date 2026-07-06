import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { getMasterBalance } from '../src/services/nomba';

async function main() {
  const circle = await prisma.circle.findFirst({
    where: { name: 'Test Pay Circle' },
    include: { memberships: { include: { user: true } }, admin: true },
  });
  if (!circle) { console.log('circle not found'); return; }

  console.log(`Circle: ${circle.name} · cycle ${circle.current_cycle} · ₦${circle.contribution_amount / 100}/member`);
  console.log(`Members: ${circle.memberships.length} · pot = ₦${(circle.contribution_amount * circle.memberships.length) / 100}`);
  console.log(`payout_order length: ${circle.payout_order.length}`);

  const recipientId = circle.payout_order[circle.current_cycle - 1];
  console.log(`\nrecipientId for cycle ${circle.current_cycle}: ${recipientId ?? 'MISSING (payout_order empty/short)'}`);

  if (recipientId) {
    const member = circle.memberships.find(m => m.user_id === recipientId);
    console.log(`recipient is a member: ${!!member}`);
    if (member) {
      const u = member.user;
      console.log(`recipient: ${u.name}`);
      console.log(`  bank_account_number: ${u.bank_account_number ?? 'MISSING'}`);
      console.log(`  bank_code: ${u.bank_code ?? 'MISSING'}`);
      console.log(`  bank_name: ${u.bank_name ?? '—'}`);
    }
  }

  const bal = await getMasterBalance();
  console.log(`\nMaster wallet balance right now: ₦${bal?.balanceNaira ?? '?'} (shared account)`);
  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
