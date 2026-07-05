import prisma from '../utils/prisma';
import { checkAndTriggerPayout } from './payout';
import { debitMandate, getMandateStatus, listVirtualAccountDeposits } from './nomba';
import { markContributionPaid, ensureAutoDebitContribution } from './contribution';
import { sendWhatsAppMessage } from './whatsapp';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const formatNaira = (kobo: number) => `₦${(kobo / 100).toLocaleString('en-NG')}`;

// Fire-and-forget member notification — never let a failed WhatsApp send break a sweep
async function notify(phone: string, message: string) {
  try {
    await sendWhatsAppMessage(phone, message);
  } catch (e: any) {
    console.error('[Notify] WhatsApp send failed:', e.message);
  }
}

// Sweeps all active circles and triggers payout for any where all members have paid
export async function runPayoutSweep() {
  const activeCircles = await prisma.circle.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  if (activeCircles.length === 0) return;

  console.log(`[Cron] Payout sweep — checking ${activeCircles.length} active circle(s)...`);
  for (const circle of activeCircles) {
    await checkAndTriggerPayout(circle.id).catch(err =>
      console.error(`[Cron] Payout sweep failed for ${circle.name}:`, err.message)
    );
  }
}

// Runs daily — marks overdue contributions LATE and deducts 1 reliability point per day overdue
export async function runDailyContributionCheck() {
  const now = new Date();

  const overdue = await prisma.contribution.findMany({
    where: {
      status: { in: ['PENDING', 'LATE'] },
      due_date: { lt: now },
    },
    include: { user: true },
  });

  if (overdue.length === 0) return;

  console.log(`[Cron] Processing ${overdue.length} overdue contribution(s)...`);

  for (const contribution of overdue) {
    // Mark LATE
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'LATE' },
    });

    // Deduct 1 point per day, floor at 0
    const newScore = Math.max(0, contribution.user.reliability_score - 1);
    await prisma.user.update({
      where: { id: contribution.user_id },
      data: { reliability_score: newScore },
    });

    console.log(`[Cron]  -1 point → ${contribution.user.name} (score: ${newScore})`);
  }
}

// ─── Auto-debit engine ────────────────────────────────────────────────────────

const MAX_ATTEMPTS = Number(process.env.AUTO_DEBIT_MAX_ATTEMPTS ?? 3);
let isDebitSweeping = false;

// Iterates ACTIVE mandates, ensures the current cycle's contribution exists, and debits
// it via Nomba when due. The mandate is the enrollment signal — no circle-level flag.
export async function runAutoDebitSweep() {
  if (isDebitSweeping) return; // avoid overlapping runs
  isDebitSweeping = true;
  try {
    const mandates = await prisma.directDebitMandate.findMany({
      where: { status: 'ACTIVE', nomba_mandate_id: { not: null } },
      include: { circle: true, user: true },
    });

    if (mandates.length === 0) return;

    const now = new Date();
    let debited = 0;

    for (const mandate of mandates) {
      const circle = mandate.circle;
      if (circle.status !== 'ACTIVE') continue;

      // Find-or-create the current cycle's obligation row for this member
      const contribution = await ensureAutoDebitContribution(circle, mandate.user_id);

      if (contribution.status === 'PAID') continue;
      if (!contribution.due_date || contribution.due_date > now) continue; // not due yet
      if (contribution.auto_debit_attempts >= MAX_ATTEMPTS) continue;

      // Optimistic lock: stamp the attempt BEFORE calling Nomba so a re-entrant sweep
      // can never double-charge the same contribution.
      await prisma.contribution.update({
        where: { id: contribution.id },
        data: {
          auto_debit_attempts: { increment: 1 },
          auto_debit_last_attempt: new Date(),
        },
      });

      // After this attempt, have we exhausted the retry budget for the cycle?
      const isFinalAttempt = contribution.auto_debit_attempts + 1 >= MAX_ATTEMPTS;

      try {
        const result = await debitMandate(mandate.nomba_mandate_id!, contribution.amount);

        if (result.code === '00') {
          await markContributionPaid(
            { id: contribution.id, user_id: contribution.user_id, circle_id: contribution.circle_id, circle },
            {
              nombaReference: `nomba-debit-${mandate.nomba_mandate_id}-${Date.now()}`,
              wasLate: contribution.status === 'LATE',
              paidVia: 'AUTO_DEBIT',
            }
          );
          await prisma.directDebitMandate.update({
            where: { id: mandate.id },
            data: { last_debit_at: new Date(), failure_count: 0 },
          });
          debited++;
          console.log(`[AutoDebit] Collected ${contribution.amount} kobo — ${circle.name} cycle ${circle.current_cycle} (user ${mandate.user_id})`);
          await notify(
            mandate.user.phone,
            `✅ *Qova Auto-Debit*\n\nCollected ${formatNaira(contribution.amount)} for *${circle.name}* (cycle ${circle.current_cycle}). Thank you!`
          );
        } else {
          await prisma.directDebitMandate.update({
            where: { id: mandate.id },
            data: { failure_count: { increment: 1 } },
          });
          console.warn(`[AutoDebit] Declined (${result.status}) mandate ${mandate.nomba_mandate_id}: ${result.message}`);
          await notify(
            mandate.user.phone,
            `⚠️ *Qova Auto-Debit*\n\nWe couldn't collect your ${formatNaira(contribution.amount)} contribution for *${circle.name}* (cycle ${circle.current_cycle}).\nReason: ${result.message || result.status}.\n\n${isFinalAttempt ? 'This was the final auto-debit attempt for this cycle — please pay manually.' : "We'll retry automatically. Please make sure your account is funded."}`
          );
        }
      } catch (err: any) {
        await prisma.directDebitMandate.update({
          where: { id: mandate.id },
          data: { failure_count: { increment: 1 } },
        });
        console.error(`[AutoDebit] Error debiting mandate ${mandate.nomba_mandate_id}:`, err.message);
        await notify(
          mandate.user.phone,
          `⚠️ *Qova Auto-Debit*\n\nWe hit a temporary problem collecting your ${formatNaira(contribution.amount)} contribution for *${circle.name}* (cycle ${circle.current_cycle}).\n\n${isFinalAttempt ? 'This was the final attempt for this cycle — please pay manually.' : "We'll retry automatically."}`
        );
      }

      await sleep(300); // space calls to respect Nomba rate limits
    }

    if (debited > 0) console.log(`[AutoDebit] Sweep complete — ${debited} contribution(s) collected`);
  } finally {
    isDebitSweeping = false;
  }
}

// Polls PENDING_ACTIVATION mandates and promotes them once Nomba reports the bank
// has authorized them (activation can take up to 72h after the ₦50 validation transfer).
export async function runMandateActivationCheck() {
  const pending = await prisma.directDebitMandate.findMany({
    where: { status: 'PENDING_ACTIVATION', nomba_mandate_id: { not: null } },
    include: { circle: true, user: true },
  });

  if (pending.length === 0) return;

  console.log(`[Mandate] Reconciling ${pending.length} pending mandate(s)...`);

  for (const mandate of pending) {
    try {
      const remote = await getMandateStatus(mandate.nomba_mandate_id!);
      if (remote.status !== 'PENDING_ACTIVATION') {
        await prisma.directDebitMandate.update({
          where: { id: mandate.id },
          data: { status: remote.status },
        });
        console.log(`[Mandate] ${mandate.nomba_mandate_id} → ${remote.status}`);

        if (remote.status === 'ACTIVE') {
          await notify(
            mandate.user.phone,
            `✅ *Qova Auto-Debit Active*\n\nAuto-debit is now set up for *${mandate.circle.name}*. Your ${formatNaira(mandate.amount)} contributions will be collected automatically each cycle.`
          );
        } else if (['FAILED', 'EXPIRED', 'REVOKED'].includes(remote.status)) {
          await notify(
            mandate.user.phone,
            `⚠️ *Qova Auto-Debit*\n\nSetup for *${mandate.circle.name}* didn't complete${remote.rejectionComment ? ` (${remote.rejectionComment})` : ''}. Please set up auto-debit again, or pay manually.`
          );
        }
      }
    } catch (err: any) {
      console.error(`[Mandate] status check failed for ${mandate.nomba_mandate_id}:`, err.message);
    }
    await sleep(300);
  }
}

// ─── Deposit reconciliation (webhook-independent) ─────────────────────────────

const DEPOSIT_LOOKBACK_HOURS = Number(process.env.DEPOSIT_RECONCILE_LOOKBACK_HOURS ?? 48);
let isReconciling = false;

// Webhook delivery is unreliable on the shared merchant account, so we pull Nomba's
// transaction feed and match successful virtual-account deposits to pending
// contributions by our own accountRef. Same completion path as the webhook
// (markContributionPaid), so score, cycle anchoring, and payout triggering all apply.
export async function runDepositReconciliation() {
  if (isReconciling) return; // avoid overlapping runs
  isReconciling = true;
  try {
    const pending = await prisma.contribution.findMany({
      where: {
        status: { in: ['PENDING', 'LATE'] },
        nomba_account_ref: { not: null },
      },
      include: { circle: true },
    });
    if (pending.length === 0) return; // nothing to settle — skip the Nomba call

    const deposits = await listVirtualAccountDeposits(DEPOSIT_LOOKBACK_HOURS);
    if (deposits.length === 0) return;

    const byRef = new Map(deposits.map(d => [d.accountRef, d]));
    let settled = 0;

    for (const contribution of pending) {
      const deposit = byRef.get(contribution.nomba_account_ref!);
      if (!deposit) continue;

      if (deposit.amountKobo < contribution.amount) {
        console.warn(
          `[Reconcile] Underpayment on ${contribution.nomba_account_ref}: ` +
          `got ${deposit.amountKobo} kobo, expected ${contribution.amount} — not marking PAID`
        );
        continue;
      }

      await markContributionPaid(contribution, {
        nombaReference: deposit.reference,
        wasLate: contribution.status === 'LATE',
        paidVia: 'VIRTUAL_ACCOUNT',
      });
      settled++;
      console.log(`[Reconcile] Deposit ${deposit.reference} → contribution ${contribution.id} PAID`);
    }

    if (settled > 0) console.log(`[Reconcile] Sweep complete — ${settled} contribution(s) settled`);
  } finally {
    isReconciling = false;
  }
}
