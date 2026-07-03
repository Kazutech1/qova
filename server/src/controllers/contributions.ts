import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { createVirtualAccount, verifyWebhookSignature } from '../services/nomba';
import {
  markContributionPaid,
  frequencyDays,
  addDays,
  cycleDueDate,
} from '../services/contribution';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function koboCToNaira(kobo: number): string {
  return (kobo / 100).toFixed(2);
}

function formatNombaDate(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// ─── POST /contributions/pay ──────────────────────────────────────────────────

const paySchema = z.object({ circle_id: z.string() });

export async function payContributionHandler(req: AuthRequest, res: Response) {
  const { circle_id } = paySchema.parse(req.body);

  const circle = await prisma.circle.findUnique({ where: { id: circle_id } });
  if (!circle) throw new AppError('Circle not found', 404);
  if (circle.status !== 'ACTIVE') throw new AppError('Circle is not active yet', 400);

  const membership = await prisma.membership.findFirst({
    where: { user_id: req.userId!, circle_id },
  });
  if (!membership) throw new AppError('You are not a member of this circle', 403);

  // Return existing unpaid virtual account for this cycle if already created
  const existing = await prisma.contribution.findFirst({
    where: {
      user_id: req.userId!,
      circle_id,
      cycle_number: circle.current_cycle,
    },
  });

  if (existing) {
    if (existing.status === 'PAID') throw new AppError('You have already paid for this cycle', 400);
    // If account number was saved correctly, return it
    if (existing.virtual_account_number) {
      return res.json({
        success: true,
        data: {
          account_number: existing.virtual_account_number,
          bank_name: existing.virtual_account_bank,
          account_ref: existing.nomba_account_ref,
          amount_kobo: existing.amount,
          due_date: existing.due_date,
        },
        message: 'Use this account to complete your contribution',
      });
    }
    // Account number was null — delete and recreate
    await prisma.contribution.delete({ where: { id: existing.id } });
  }

  // Calculate due date
  const dueDate = circle.cycle_started_at
    ? cycleDueDate(circle.cycle_started_at, circle.frequency, circle.current_cycle)
    : circle.start_date ?? addDays(new Date(), frequencyDays(circle.frequency));

  // Unique ref per user + circle + cycle
  const accountRef = `qova-${circle_id}-${req.userId}-cycle${circle.current_cycle}`;

  // Expiry = due date + 24hr grace
  const expiryDate = addDays(dueDate, 1);

  // Nomba rejects special characters in account names
  const safeCircleName = circle.name.replace(/[^a-zA-Z0-9 ]/g, '').trim();

  const virtualAccount = await createVirtualAccount({
    accountRef,
    accountName: `Qova ${safeCircleName}`,
    expiryDate: formatNombaDate(expiryDate),
    expectedAmount: koboCToNaira(circle.contribution_amount),
  });

  await prisma.contribution.create({
    data: {
      user_id: req.userId!,
      circle_id,
      cycle_number: circle.current_cycle,
      amount: circle.contribution_amount,
      due_date: dueDate,
      status: 'PENDING',
      nomba_account_ref: accountRef,
      virtual_account_number: virtualAccount.accountNumber,
      virtual_account_bank: virtualAccount.bankName,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      account_number: virtualAccount.accountNumber,
      account_name: virtualAccount.accountName,
      bank_name: virtualAccount.bankName,
      account_ref: accountRef,
      amount_kobo: circle.contribution_amount,
      due_date: dueDate,
    },
    message: 'Transfer to this account to complete your contribution',
  });
}

// ─── POST /contributions/webhook ──────────────────────────────────────────────

export async function webhookHandler(req: Request, res: Response) {
  // Log full payload so we can confirm Nomba's exact field names on first delivery
  console.log('[Webhook] Nomba payload:', JSON.stringify(req.body, null, 2));

  // Reject anything not signed by Nomba before doing any work
  if (!verifyWebhookSignature(req.body, req.headers)) {
    console.warn('[Webhook] Invalid or missing signature — rejected');
    return res.status(401).json({ success: false, data: null, message: 'Invalid signature' });
  }

  // Acknowledge immediately so Nomba doesn't retry
  res.json({ success: true });

  const eventName: string = req.body.event_type ?? req.body.event ?? '';
  if (eventName !== 'payment_success') return;

  const data = req.body.data ?? {};
  const tx = data.transaction ?? {};

  // The virtual-account reference we set at creation is echoed as aliasAccountReference
  const accountRef: string =
    tx.aliasAccountReference ??
    data.aliasAccountReference ??
    data.accountRef ??
    data.account_ref ??
    '';

  if (!accountRef) {
    console.warn('[Webhook] payment_success received but no accountRef found in payload');
    return;
  }

  // Store Nomba's real transaction id for reconciliation (fallback handled downstream)
  const reference: string | undefined = tx.transactionId ?? data.transactionId ?? undefined;

  await processPayment(accountRef, reference);
}

// ─── POST /contributions/simulate-payment ─────────────────────────────────────

const simulateSchema = z.object({ account_ref: z.string() });

export async function simulatePaymentHandler(req: Request, res: Response) {
  const { account_ref } = simulateSchema.parse(req.body);
  const result = await processPayment(account_ref);
  if (!result) throw new AppError('No pending contribution found for that account ref', 404);
  res.json({ success: true, data: result, message: 'Payment simulated successfully' });
}

// ─── Shared payment processing logic ─────────────────────────────────────────

async function processPayment(accountRef: string, nombaReference?: string) {
  const contribution = await prisma.contribution.findUnique({
    where: { nomba_account_ref: accountRef },
    include: { circle: true },
  });

  if (!contribution || contribution.status === 'PAID') return null;

  const wasLate = contribution.status === 'LATE';

  return markContributionPaid(contribution, {
    nombaReference: nombaReference ?? `nomba-sim-${Date.now()}`,
    wasLate,
    paidVia: 'VIRTUAL_ACCOUNT',
  });
}

// ─── POST /contributions/simulate-all ────────────────────────────────────────

const simulateAllSchema = z.object({ circle_id: z.string() });

export async function simulateAllPaymentsHandler(req: Request, res: Response) {
  const { circle_id } = simulateAllSchema.parse(req.body);

  const circle = await prisma.circle.findUnique({
    where: { id: circle_id },
    include: { memberships: true },
  });
  if (!circle) throw new AppError('Circle not found', 404);
  if (circle.status !== 'ACTIVE') throw new AppError('Circle is not active', 400);

  const results = [];

  for (const member of circle.memberships) {
    const accountRef = `qova-${circle_id}-${member.user_id}-cycle${circle.current_cycle}`;

    // Ensure a contribution record exists
    const existing = await prisma.contribution.findUnique({
      where: { nomba_account_ref: accountRef },
    });

    if (!existing) {
      await prisma.contribution.create({
        data: {
          user_id:          member.user_id,
          circle_id,
          cycle_number:     circle.current_cycle,
          amount:           circle.contribution_amount,
          status:           'PENDING',
          nomba_account_ref: accountRef,
        },
      });
    }

    if (existing?.status === 'PAID') {
      results.push({ user_id: member.user_id, status: 'already_paid' });
      continue;
    }

    await processPayment(accountRef);
    results.push({ user_id: member.user_id, status: 'simulated' });
  }

  res.json({ success: true, data: { results }, message: 'All payments simulated' });
}

// ─── GET /contributions/:circleId ─────────────────────────────────────────────

export async function getContributionsHandler(req: AuthRequest, res: Response) {
  const circle = await prisma.circle.findUnique({ where: { id: req.params.circleId } });
  if (!circle) throw new AppError('Circle not found', 404);

  const contributions = await prisma.contribution.findMany({
    where: { circle_id: req.params.circleId, cycle_number: circle.current_cycle },
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { created_at: 'asc' },
  });

  res.json({
    success: true,
    data: { cycle: circle.current_cycle, contributions },
    message: 'Contributions retrieved',
  });
}
