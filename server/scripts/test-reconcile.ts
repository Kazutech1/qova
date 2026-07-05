import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { listVirtualAccountDeposits } from '../src/services/nomba';
import { runDepositReconciliation } from '../src/services/cron';

const APPLY = process.argv.includes('--apply');

async function main() {
  const pending = await prisma.contribution.findMany({
    where: { status: { in: ['PENDING', 'LATE'] }, nomba_account_ref: { not: null } },
    include: { circle: { select: { name: true } }, user: { select: { name: true } } },
  });
  console.log(`Pending/late contributions with VA refs: ${pending.length}`);

  const deposits = await listVirtualAccountDeposits(48);
  console.log(`Qova VA deposits found in Nomba feed (48h): ${deposits.length}\n`);

  const byRef = new Map(deposits.map(d => [d.accountRef, d]));
  let matches = 0;
  for (const c of pending) {
    const d = byRef.get(c.nomba_account_ref!);
    const tag = d
      ? (d.amountKobo >= c.amount ? `✅ MATCH → would mark PAID (₦${d.amountKobo / 100})` : `⚠️ UNDERPAID (got ₦${d.amountKobo / 100}, need ₦${c.amount / 100})`)
      : '— no deposit';
    if (d) matches++;
    console.log(`  ${c.user.name} · ${c.circle.name} · cycle ${c.cycle_number} · ₦${c.amount / 100}`);
    console.log(`    ref ${c.nomba_account_ref}`);
    console.log(`    ${tag}\n`);
  }
  console.log(`Matches: ${matches}`);

  if (APPLY) {
    console.log('\n── APPLYING (runDepositReconciliation) ──');
    await runDepositReconciliation();
    // brief wait so any setImmediate payout trigger logs before we exit
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.log('\nDry run only — re-run with --apply to settle.');
  }

  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
