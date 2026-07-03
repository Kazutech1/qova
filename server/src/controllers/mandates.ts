import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  createDirectDebitMandate,
  getMandateStatus,
  updateMandateStatus,
  lookupBankAccount,
  MandateStatusValue,
} from '../services/nomba';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// User has no email field — derive a stable placeholder for Nomba's required field
function deriveEmail(phone: string): string {
  return `${phone}@qova.ng`;
}

const ACTIVE_STATES = ['PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED'];
const TERMINAL_STATES = ['REVOKED', 'EXPIRED', 'FAILED'];

// ─── POST /circles/:id/mandate (member authorizes auto-debit) ─────────────────

export async function createMandateHandler(req: AuthRequest, res: Response) {
  const circleId = req.params.id;

  const circle = await prisma.circle.findUnique({ where: { id: circleId } });
  if (!circle) throw new AppError('Circle not found', 404);

  const membership = await prisma.membership.findFirst({
    where: { user_id: req.userId!, circle_id: circleId },
  });
  if (!membership) throw new AppError('You are not a member of this circle', 403);

  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) throw new AppError('User not found', 404);
  if (!user.bank_account_number || !user.bank_code) {
    throw new AppError('Add your bank account details before enabling auto-debit', 400);
  }

  // One mandate per (user, circle). Block if a live one already exists.
  const existing = await prisma.directDebitMandate.findUnique({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
  });
  if (existing && ACTIVE_STATES.includes(existing.status)) {
    throw new AppError('You already have auto-debit set up for this circle', 400);
  }

  // Verify the bank account resolves and capture the canonical account name
  const lookup = await lookupBankAccount(user.bank_account_number, user.bank_code);
  const accountName = lookup.accountName || user.name;

  const startDate = circle.start_date ?? new Date();
  const endDate = addDays(startDate, circle.total_slots * frequencyDays(circle.frequency));
  const merchantReference = `qova-mandate-${circleId}-${req.userId}`;

  const mandate = await createDirectDebitMandate({
    customerAccountNumber: user.bank_account_number,
    bankCode:              user.bank_code,
    customerName:          user.name,
    customerAccountName:   accountName,
    amount:                circle.contribution_amount,
    frequency:             circle.frequency,
    merchantReference,
    startDate:             startDate.toISOString(),
    endDate:               endDate.toISOString(),
    customerEmail:         deriveEmail(user.phone),
    customerPhoneNumber:   user.phone,
    narration:             `Qova auto-debit - ${circle.name}`,
  });

  if (!mandate.mandateId) {
    throw new AppError('Mandate creation did not return an id from Nomba', 502);
  }

  const record = await prisma.directDebitMandate.upsert({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
    create: {
      user_id:             req.userId!,
      circle_id:           circleId,
      nomba_mandate_id:    mandate.mandateId,
      merchant_reference:  merchantReference,
      status:              'PENDING_ACTIVATION',
      bank_account_number: user.bank_account_number,
      bank_code:           user.bank_code,
      bank_account_name:   accountName,
      amount:              circle.contribution_amount,
      frequency:           circle.frequency,
      activation_note:     mandate.activationNote || null,
    },
    update: {
      nomba_mandate_id:    mandate.mandateId,
      merchant_reference:  merchantReference,
      status:              'PENDING_ACTIVATION',
      bank_account_number: user.bank_account_number,
      bank_code:           user.bank_code,
      bank_account_name:   accountName,
      amount:              circle.contribution_amount,
      frequency:           circle.frequency,
      activation_note:     mandate.activationNote || null,
      failure_count:       0,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      mandate_id:      record.id,
      status:          record.status,
      activation_note: record.activation_note,
    },
    message: 'Auto-debit mandate created — complete the ₦50 activation transfer to finish setup',
  });
}

// ─── GET /circles/:id/mandate (member checks status, reconciles with Nomba) ───

export async function getMandateHandler(req: AuthRequest, res: Response) {
  const circleId = req.params.id;

  const mandate = await prisma.directDebitMandate.findUnique({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
  });
  if (!mandate) throw new AppError('No auto-debit mandate found for this circle', 404);

  let status: MandateStatusValue = mandate.status as MandateStatusValue;

  // Reconcile with Nomba while not in a terminal state
  if (mandate.nomba_mandate_id && !TERMINAL_STATES.includes(mandate.status)) {
    try {
      const remote = await getMandateStatus(mandate.nomba_mandate_id);
      if (remote.status !== mandate.status) {
        await prisma.directDebitMandate.update({
          where: { id: mandate.id },
          data: { status: remote.status },
        });
        status = remote.status;
      }
    } catch (e: any) {
      console.error('[Mandate] status reconcile failed:', e.message);
    }
  }

  res.json({
    success: true,
    data: {
      status,
      activation_note: mandate.activation_note,
      last_debit_at:   mandate.last_debit_at,
      amount:          mandate.amount,
    },
    message: 'Mandate status retrieved',
  });
}

// ─── DELETE /circles/:id/mandate (member revokes auto-debit) ──────────────────

export async function deleteMandateHandler(req: AuthRequest, res: Response) {
  const circleId = req.params.id;

  const mandate = await prisma.directDebitMandate.findUnique({
    where: { user_id_circle_id: { user_id: req.userId!, circle_id: circleId } },
  });
  if (!mandate) throw new AppError('No auto-debit mandate found for this circle', 404);

  if (mandate.nomba_mandate_id) {
    try {
      await updateMandateStatus(mandate.nomba_mandate_id, 'DELETE');
    } catch (e: any) {
      console.error('[Mandate] Nomba revoke failed:', e.message);
    }
  }

  const updated = await prisma.directDebitMandate.update({
    where: { id: mandate.id },
    data: { status: 'REVOKED' },
  });

  res.json({
    success: true,
    data: { status: updated.status },
    message: 'Auto-debit turned off for this circle',
  });
}
