import prisma from '../utils/prisma';
import { listCheckoutPayments, listTokenizedCards, CheckoutPayment } from './nomba';
import { markContributionPaid } from './contribution';
import { deriveEmail } from '../utils/email';

// ─── Order reference convention ───────────────────────────────────────────────
// qova-card-{circleId}-{userId}-cycle{n}[-a{attempt}]
// Parseable so a checkout payment in the feed can always be traced back to its
// (user, circle, cycle) even if the contribution row was recreated meanwhile.

export function cardOrderRef(circleId: string, userId: string, cycle: number, attempt?: number): string {
  return `qova-card-${circleId}-${userId}-cycle${cycle}${attempt ? `-a${attempt}` : ''}`;
}

const ORDER_REF_RE = /^qova-card-([a-f0-9]{24})-([a-f0-9]{24})-cycle(\d+)(?:-a\d+)?$/;

export function parseCardOrderRef(ref: string): { circleId: string; userId: string; cycle: number } | null {
  const m = ORDER_REF_RE.exec(ref);
  if (!m) return null;
  return { circleId: m[1], userId: m[2], cycle: Number(m[3]) };
}

// ─── Settlement ───────────────────────────────────────────────────────────────

// Settles the (user, circle, cycle) contribution behind a successful card payment.
// Looks the row up by identity, not by ref — resilient to the VA flow having
// created/recreated the row with a virtual-account ref.
export async function settleCardPayment(payment: CheckoutPayment): Promise<boolean> {
  const parsed = parseCardOrderRef(payment.orderReference);
  if (!parsed) return false;

  const contribution = await prisma.contribution.findFirst({
    where: { user_id: parsed.userId, circle_id: parsed.circleId, cycle_number: parsed.cycle },
    include: { circle: true },
  });

  if (contribution) {
    if (contribution.status === 'PAID') return false;
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

  // No row yet (member paid by card before ever opening the VA sheet) — create + settle
  const circle = await prisma.circle.findUnique({ where: { id: parsed.circleId } });
  if (!circle || payment.amountKobo < circle.contribution_amount) return false;

  const created = await prisma.contribution.create({
    data: {
      user_id:           parsed.userId,
      circle_id:         parsed.circleId,
      cycle_number:      parsed.cycle,
      amount:            circle.contribution_amount,
      due_date:          new Date(),
      status:            'PENDING',
      nomba_account_ref: payment.orderReference,
    },
  });
  await markContributionPaid(
    { id: created.id, user_id: created.user_id, circle_id: created.circle_id, circle },
    { nombaReference: payment.reference, wasLate: false, paidVia: 'CARD' },
  );
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
