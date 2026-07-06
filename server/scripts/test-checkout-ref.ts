import 'dotenv/config';
import { createCheckoutOrder } from '../src/services/nomba';
import { newCheckoutOrderRef } from '../src/services/cardautopay';

async function main() {
  const ref = newCheckoutOrderRef(2);
  console.log(`ref: ${ref} (${ref.length} chars)`);
  const order = await createCheckoutOrder({
    orderReference: ref,
    customerEmail: '2348140105621@qova.ng',
    amount: 10_000, // ₦100 in kobo
    callbackUrl: 'https://qova-j40s.onrender.com/payments/callback',
    tokenizeCard: true,
  });
  console.log('✅ Nomba accepted the order');
  console.log('checkoutLink:', order.checkoutLink);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
