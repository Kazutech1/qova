import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { createVirtualAccount } from '../services/nomba';
import { checkAndTriggerPayout } from '../services/payout';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function koboCToNaira(kobo: number): string {
  return (kobo / 100).toFixed(2);
}

function frequencyDays(frequency: string): number {
  if (frequency === 'WEEKLY') return 7;
  if (frequency === 'BIWEEKLY') return 14;
  return 30;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatNombaDate(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// Due date for a given cycle based on first payment anchor
function cycleDueDate(cycleStartedAt: Date, frequency: string, cycleNumber: number): Date {
  return addDays(cycleStartedAt, (cycleNumber - 1) * frequencyDays(frequency));
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

  const virtualAccount = await createVirtualAccount({
    accountRef,
    accountName: `Qova Ajo - ${circle.name}`,
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
  const { event, data } = req.body;

  // Acknowledge immediately so Nomba doesn't retry
  res.json({ success: true });

  if (event !== 'payment_success') return;

  const accountRef: string = data?.accountRef ?? data?.account_ref;
  if (!accountRef) return;

  await processPayment(accountRef);
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

async function processPayment(accountRef: string) {
  const contribution = await prisma.contribution.findUnique({
    where: { nomba_account_ref: accountRef },
    include: { circle: true },
  });

  if (!contribution || contribution.status === 'PAID') return null;

  const wasLate = contribution.status === 'LATE';

  const updated = await prisma.contribution.update({
    where: { id: contribution.id },
    data: {
      status: 'PAID',
      paid_at: new Date(),
      nomba_reference: `nomba-sim-${Date.now()}`,
    },
  });

  // Restore 5 reliability points if they paid after being marked late
  if (wasLate) {
    await prisma.user.update({
      where: { id: contribution.user_id },
      data: { reliability_score: { increment: 5 } },
    });
  }

  // Anchor cycle_started_at on the very first payment in this circle
  if (!contribution.circle.cycle_started_at) {
    await prisma.circle.update({
      where: { id: contribution.circle_id },
      data: { cycle_started_at: new Date() },
    });
  }

  // Check if all members paid — auto-trigger payout if so
  setImmediate(() => checkAndTriggerPayout(contribution.circle_id).catch(console.error));

  return updated;
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
