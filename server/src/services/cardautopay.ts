import crypto from 'crypto';
import prisma from '../utils/prisma';
import { listCheckoutPayments, listTokenizedCards, CheckoutPayment } from './nomba';
import { markContributionPaid } from './contribution';
import { deriveEmail } from '../utils/email';

// ─── Order reference convention ───────────────────────────────────────────────
// Nomba caps order references at 50 chars, so ObjectIds can't be embedded.
// Instead: short random refs (`qova-c-{cycle}-{16 hex}`, ~28 chars) written onto
// the target Contribution's checkout_order_ref — settlement is an exact lookup.

export function newCheckoutOrderRef(cycle: number): string {
  return `qova-c-${cycle}-${crypto.randomBytes(8).toString('hex')}`;
}

// ─── Settlement ───────────────────────────────────────────────────────────────

// Settles the contribution behind a successful card payment by exact ref lookup.
export async function settleCardPayment(payment: CheckoutPayment): Promise<boolean> {
  const contribution = await prisma.contribution.findFirst({
    where: { checkout_order_ref: payment.orderReference },
    include: { circle: true },
  });
  if (!contribution || contribution.status === 'PAID') return false;

  if (payment.amountKobo < contribution.amount) {
    console.warn(`[CardAutopay] Underpayment on ${payment.orderReference}: got ${payment.amountKobo}, expected ${contribution.amount}`);
    return false;
  }

  await markContributionPaid(contribution, {
    nombaReference: payment.reference,
    wasLate: contribution.status === 'LATE',
    paidVia: 'CARD',
  });
  return true;
}

// ─── Authorization reconciliation ─────────────────────────────────────────────

interface AuthRecord {
  id: string;
  user_id: string;
  circle_id: string;
  order_reference: string;
  status: string;
}

// Checks whether a PENDING_TOKENIZATION authorization has completed its checkout:
// prefers the transaction feed (carries tokenKey AND proves payment — settles the
// contribution too), falls back to the tokenized-card list by derived email.
// Returns the new status if it changed, else null.
export async function reconcileCardAuthorization(
  auth: AuthRecord,
  userPhone: string,
  feed?: CheckoutPayment[]
): Promise<string | null> {
  if (auth.status !== 'PENDING_TOKENIZATION') return null;

  const payments = feed ?? await listCheckoutPayments(48);
  const payment = payments.find(p => p.orderReference === auth.order_reference);

  if (payment) {
    const expiry = payment.tokenExpiryYear && payment.tokenExpiryMonth
      ? new Date(Number(payment.tokenExpiryYear), Number(payment.tokenExpiryMonth) - 1, 1)
      : null;

    await prisma.cardAuthorization.update({
      where: { id: auth.id },
      data: {
        token_key:        payment.tokenKey || null,
        card_pan_masked:  payment.cardPanMasked || null,
        card_type:        payment.cardType || null,
        token_expires_at: expiry,
        status:           payment.tokenKey ? 'ACTIVE' : 'FAILED',
      },
    });
    await settleCardPayment(payment);
    return payment.tokenKey ? 'ACTIVE' : 'FAILED';
  }

  // Feed window may have passed — the token list is the durable source
  try {
    const cards = await listTokenizedCards(deriveEmail(userPhone));
    const newest = cards.filter(c => c.tokenKey).pop();
    if (newest) {
      await prisma.cardAuthorization.update({
        where: { id: auth.id },
        data: {
          token_key:        newest.tokenKey,
          card_pan_masked:  newest.cardPanMasked || null,
          card_type:        newest.cardType || null,
          token_expires_at: newest.tokenExpirationDate ? new Date(newest.tokenExpirationDate) : null,
          status:           'ACTIVE',
        },
      });
      return 'ACTIVE';
    }
  } catch (e: any) {
    console.error('[CardAutopay] token list lookup failed:', e.message);
  }

  return null;
}
