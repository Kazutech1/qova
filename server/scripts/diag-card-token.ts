import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { listCheckoutPayments, listTokenizedCards } from '../src/services/nomba';

async function main() {
  const circle = await prisma.circle.findUnique({ where: { invite_code: 'HACK-2026-01' } });
  const user = await prisma.user.findUnique({ where: { phone: '+2348140105621' } });

  const contrib = await prisma.contribution.findFirst({
    where: { circle_id: circle!.id, user_id: user!.id, cycle_number: 2 },
  });
  console.log('── Contribution (cycle 2) ──');
  console.log('status:', contrib?.status, '· paid_via:', contrib?.paid_via);
  console.log('nomba_reference:', contrib?.nomba_reference);
  console.log('checkout_order_ref:', contrib?.checkout_order_ref);
  console.log('nomba_account_ref:', contrib?.nomba_account_ref);

  console.log('\n── Qova checkout payments in feed (24h) ──');
  const payments = await listCheckoutPayments(24);
  for (const p of payments) {
    console.log(`ref=${p.orderReference} · ₦${p.amountKobo / 100} · token=${p.tokenKey || '—'} · ${p.cardType} ${p.cardPanMasked} · email=${p.customerEmail}`);
  }
  if (payments.length === 0) console.log('(none matching qova- prefix)');

  console.log('\n── Tokenized cards for 2348140105621@qova.ng ──');
  const cards = await listTokenizedCards('2348140105621@qova.ng');
  for (const c of cards) {
    console.log(`token=${c.tokenKey} · ${c.cardType} ${c.cardPanMasked} · expires ${c.tokenExpirationDate}`);
  }
  if (cards.length === 0) console.log('(none)');

  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
