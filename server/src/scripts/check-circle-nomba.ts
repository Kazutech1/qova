import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getTransaction } from '../services/nomba';

const prisma = new PrismaClient();

const INVITE_CODE = process.argv[2] ?? 'AJO-SEED-01';

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

async function main() {
  const circle = await prisma.circle.findUnique({
    where: { invite_code: INVITE_CODE },
    include: {
      admin: { select: { name: true } },
      contributions: {
        include: { user: { select: { name: true, phone: true } } },
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!circle) {
    console.error(`No circle found with invite code: ${INVITE_CODE}`);
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(70));
  console.log(`  ${circle.name}  (${INVITE_CODE})`);
  console.log(`  Cycle ${circle.current_cycle}/${circle.total_slots}  |  ${circle.status}`);
  console.log('═'.repeat(70));

  if (circle.contributions.length === 0) {
    console.log('\n  No contributions yet.\n');
    return;
  }

  let nombaTotal = 0;
  let dbTotal    = 0;

  for (const c of circle.contributions) {
    const isReal = c.nomba_reference && !c.nomba_reference.startsWith('seed-ref-') && !c.nomba_reference.startsWith('nomba-sim-');

    console.log(`\n  ${c.user.name} (${c.user.phone})`);
    console.log(`  Cycle ${c.cycle_number}  |  DB status: ${c.status}  |  Amount: ${naira(c.amount)}`);
    console.log(`  Account ref : ${c.nomba_account_ref ?? '—'}`);
    console.log(`  Nomba ref   : ${c.nomba_reference   ?? '—'}`);

    if (c.status === 'PAID') dbTotal += c.amount;

    if (isReal && c.nomba_reference) {
      try {
        const tx = await getTransaction(c.nomba_reference);
        console.log(`  Nomba verify: ${tx.status}  |  ${naira(tx.amount)}  |  "${tx.narration}"`);
        if (tx.status === 'SUCCESSFUL' || tx.status === 'SUCCESS') nombaTotal += tx.amount;
      } catch (err: any) {
        console.log(`  Nomba verify: ERROR — ${err.message}`);
      }
    } else if (c.nomba_reference?.startsWith('seed-ref-')) {
      console.log(`  Nomba verify: skipped (seed/simulated payment)`);
    } else if (c.nomba_reference?.startsWith('nomba-sim-')) {
      console.log(`  Nomba verify: skipped (simulate-payment endpoint)`);
    } else {
      console.log(`  Nomba verify: no reference stored yet`);
    }
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`  DB total (PAID contributions) : ${naira(dbTotal)}`);
  console.log(`  Nomba verified total          : ${naira(nombaTotal)}`);
  console.log('═'.repeat(70) + '\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
