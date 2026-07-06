import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { deriveEmail } from '../utils/email';
import { createCheckoutOrder, deleteTokenizedCard } from '../services/nomba';
import { cardOrderRef, reconcileCardAuthorization } from '../services/cardautopay';

const PUBLIC_URL = process.env.SERVER_PUBLIC_URL ?? 'https://qova-j40s.onrender.com';

const LIVE_STATES = ['PENDING_TOKENIZATION', 'ACTIVE'];

// ─── POST /circles/:id/card-autopay ───────────────────────────────────────────
// "Pay with card & enable AutoPay": the checkout order IS this cycle's contribution
// payment, with tokenizeCard so future cycles charge automatically.

export async function createCardAutopayHandler(req: AuthRequest, res: Response) {
  const circleId = req.params.id;

  const circle = await prisma.circle.findUnique({ where: { id: circleId } });
  if (!circle) throw new AppError('Circle not found', 404);
  if (circle.status !== 'ACTIVE') throw new AppError('Circle is not active yet', 400);

  const membership = await prisma.membership.findFirst({
    where: { user_id: req.userId!, circle_id: circleId },
  });
  if (!membership) throw new AppError('You are not a member of this circle', 403);

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) throw new AppError('User not found', 404);

  const existing = await prisma.cardAuthorization.findUnique({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
  });
  if (existing && existing.status === 'ACTIVE') {
    throw new AppError('Card autopay is already active for this circle', 400);
  }

  // The setup payment covers the current cycle — block if it's already paid
  const currentContribution = await prisma.contribution.findFirst({
    where: { user_id: req.userId!, circle_id: circleId, cycle_number: circle.current_cycle },
  });
  if (currentContribution?.status === 'PAID') {
    throw new AppError('You have already paid this cycle — set up card autopay when your next contribution is due', 400);
  }

  // Fresh order ref per attempt (Nomba order refs are single-use); parser tolerates the suffix
  const orderReference = existing
    ? cardOrderRef(circleId, req.userId!, circle.current_cycle, Date.now())
    : cardOrderRef(circleId, req.userId!, circle.current_cycle);

  const order = await createCheckoutOrder({
    orderReference,
    customerEmail: deriveEmail(user.phone),
    amount:        circle.contribution_amount,
    callbackUrl:   `${PUBLIC_URL}/payments/callback`,
    customerId:    user.id,
    tokenizeCard:  true,
  });

  await prisma.cardAuthorization.upsert({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
    create: {
      user_id:         req.userId!,
      circle_id:       circleId,
      order_reference: order.orderReference,
      status:          'PENDING_TOKENIZATION',
    },
    update: {
      order_reference:  order.orderReference,
      status:           'PENDING_TOKENIZATION',
      token_key:        null,
      card_pan_masked:  null,
      card_type:        null,
      token_expires_at: null,
      failure_count:    0,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      checkout_link:   order.checkoutLink,
      order_reference: order.orderReference,
      amount_kobo:     circle.contribution_amount,
      status:          'PENDING_TOKENIZATION',
    },
    message: 'Complete the card payment to pay this cycle and enable autopay',
  });
}

// ─── GET /circles/:id/card-autopay ────────────────────────────────────────────

export async function getCardAutopayHandler(req: AuthRequest, res: Response) {
  const circleId = req.params.id;

  const auth = await prisma.cardAuthorization.findUnique({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
  });
  if (!auth) throw new AppError('No card autopay found for this circle', 404);

  let status = auth.status;
  if (auth.status === 'PENDING_TOKENIZATION') {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const changed = await reconcileCardAuthorization(auth, user?.phone ?? '').catch((e) => {
      console.error('[CardAutopay] reconcile failed:', e.message);
      return null;
    });
    if (changed) status = changed as typeof auth.status;
  }

  const fresh = status === auth.status ? auth : (await prisma.cardAuthorization.findUnique({ where: { id: auth.id } }))!;

  res.json({
    success: true,
    data: {
      status,
      card_type:        fresh.card_pan_masked ? fresh.card_type : null,
      card_pan_masked:  fresh.card_pan_masked,
      last_charge_at:   fresh.last_charge_at,
      token_expires_at: fresh.token_expires_at,
    },
    message: 'Card autopay status retrieved',
  });
}

// ─── DELETE /circles/:id/card-autopay ─────────────────────────────────────────

export async function deleteCardAutopayHandler(req: AuthRequest, res: Response) {
  const circleId = req.params.id;

  const auth = await prisma.cardAuthorization.findUnique({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
  });
  if (!auth || !LIVE_STATES.includes(auth.status)) {
    throw new AppError('No card autopay found for this circle', 404);
  }

  if (auth.token_key) {
    try {
      await deleteTokenizedCard(auth.token_key);
    } catch (e: any) {
      console.error('[CardAutopay] remote token delete failed:', e.message);
    }
  }

  const updated = await prisma.cardAuthorization.update({
    where: { id: auth.id },
    data: { status: 'REVOKED' },
  });

  res.json({
    success: true,
    data: { status: updated.status },
    message: 'Card autopay turned off for this circle',
  });
}
