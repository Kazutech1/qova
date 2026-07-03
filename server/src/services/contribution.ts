import prisma from '../utils/prisma';
import { bumpScore } from '../utils/score';
import { checkAndTriggerPayout } from './payout';

// ─── Shared cycle/date helpers ────────────────────────────────────────────────

export function frequencyDays(frequency: string): number {
  if (frequency === 'WEEKLY') return 7;
  if (frequency === 'BIWEEKLY') return 14;
  return 30;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Due date for a given cycle based on the circle's first-payment anchor
export function cycleDueDate(cycleStartedAt: Date, frequency: string, cycleNumber: number): Date {
  return addDays(cycleStartedAt, (cycleNumber - 1) * frequencyDays(frequency));
}

// ─── Single payment-completion path ───────────────────────────────────────────

interface PayableContribution {
  id: string;
  user_id: string;
  circle_id: string;
  circle: { cycle_started_at: Date | null };
}

// Shared by manual (virtual account / webhook) and auto-debit flows:
// mark PAID → award reliability points → anchor the circle's first-payment date →
// trigger payout if everyone has now paid.
export async function markContributionPaid(
  contribution: PayableContribution,
  opts: { nombaReference: string; wasLate: boolean; paidVia: string }
) {
  const updated = await prisma.contribution.update({
    where: { id: contribution.id },
    data: {
      status: 'PAID',
      paid_at: new Date(),
      nomba_reference: opts.nombaReference,
      paid_via: opts.paidVia,
    },
  });

  // +5 on-time, +2 partial credit for late recovery — capped at 100 inside bumpScore
  await bumpScore(contribution.user_id, opts.wasLate ? 2 : 5);

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

// ─── Lazy contribution creation for auto-debit ────────────────────────────────

interface CycleCircle {
  id: string;
  frequency: string;
  current_cycle: number;
  contribution_amount: number;
  cycle_started_at: Date | null;
  start_date: Date | null;
}

// Auto-debit members never call POST /contributions/pay, so the obligation row for the
// current cycle may not exist yet. Find-or-create it using the same deterministic ref
// convention the manual and simulate flows use, so nothing double-creates.
export async function ensureAutoDebitContribution(circle: CycleCircle, userId: string) {
  const accountRef = `qova-${circle.id}-${userId}-cycle${circle.current_cycle}`;

  const existing = await prisma.contribution.findUnique({
    where: { nomba_account_ref: accountRef },
  });
  if (existing) return existing;

  const dueDate = circle.cycle_started_at
    ? cycleDueDate(circle.cycle_started_at, circle.frequency, circle.current_cycle)
    : circle.start_date ?? addDays(new Date(), frequencyDays(circle.frequency));

  return prisma.contribution.create({
    data: {
      user_id:           userId,
      circle_id:         circle.id,
      cycle_number:      circle.current_cycle,
      amount:            circle.contribution_amount,
      due_date:          dueDate,
      status:            'PENDING',
      nomba_account_ref: accountRef,
    },
  });
}
