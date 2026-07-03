import 'dotenv/config';
import crypto from 'crypto';
import prisma from '../src/utils/prisma';

const KEY = process.env.NOMBA_WEBHOOK_SIGNATURE_KEY;
const URL = 'http://localhost:5000/contributions/webhook';

function sign(body: any, timestamp: string): string {
  const tx = body.data.transaction, m = body.data.merchant;
  const s = [body.event_type, body.requestId, m.userId, m.walletId,
    tx.transactionId, tx.type, tx.time, tx.responseCode, timestamp].join(':');
  return crypto.createHmac('sha256', KEY!).update(s).digest('base64');
}

async function post(body: any, headers: Record<string, string>) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

async function main() {
  if (!KEY) throw new Error('NOMBA_WEBHOOK_SIGNATURE_KEY not loaded');

  const circle = await prisma.circle.findUnique({ where: { invite_code: 'AUTOD-0001-01' } });
  const user = await prisma.user.findUnique({ where: { phone: '+2349000000099' } });
  if (!circle || !user) throw new Error('Run setup-autodebit-test.ts first');

  // Fresh PENDING contribution the webhook will settle
  const ref = `qova-${circle.id}-${user.id}-cycle1`;
  await prisma.contribution.upsert({
    where: { nomba_account_ref: ref },
    update: { status: 'PENDING', paid_at: null, nomba_reference: null, paid_via: null },
    create: {
      user_id: user.id, circle_id: circle.id, cycle_number: 1, amount: 100_000,
      status: 'PENDING', nomba_account_ref: ref, due_date: new Date(),
    },
  });
  console.log('Contribution ready (PENDING):', ref);

  const timestamp = String(Date.now());
  const payload = {
    event_type: 'payment_success',
    requestId: 'req-test-1',
    data: {
      merchant: { userId: 'm-user', walletId: 'm-wallet' },
      transaction: {
        transactionId: 'txn-test-1', type: 'vact_transfer', time: '2026-07-03T12:00:00Z',
        responseCode: '00', aliasAccountReference: ref, transactionAmount: 1000,
      },
    },
  };
  const goodSig = sign(payload, timestamp);

  console.log('\n[1] Tampered signature → expect 401:');
  console.log('   ', await post(payload, { 'nomba-signature': goodSig + 'x', 'nomba-timestamp': timestamp }));

  console.log('\n[2] No signature headers → expect 401:');
  console.log('   ', await post(payload, {}));

  console.log('\n[3] Valid signature → expect 200:');
  console.log('   ', await post(payload, { 'nomba-signature': goodSig, 'nomba-timestamp': timestamp }));

  await new Promise(r => setTimeout(r, 1000)); // let async processPayment finish
  const after = await prisma.contribution.findUnique({ where: { nomba_account_ref: ref } });
  console.log('\n[4] Contribution after valid webhook:');
  console.log('    status  :', after?.status);
  console.log('    paid_via:', after?.paid_via);
  console.log('    ref     :', after?.nomba_reference);

  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
