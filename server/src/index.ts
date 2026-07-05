import 'dotenv/config';
import app from './app';
import { initWhatsApp } from './services/whatsapp';
import {
  runDailyContributionCheck,
  runPayoutSweep,
  runAutoDebitSweep,
  runMandateActivationCheck,
  runDepositReconciliation,
} from './services/cron';

const PORT = process.env.PORT || 3000;

const MANDATE_CHECK_INTERVAL_MS = Number(process.env.MANDATE_CHECK_INTERVAL_MS ?? 2 * 60 * 60 * 1000);
const AUTO_DEBIT_SWEEP_INTERVAL_MS = Number(process.env.AUTO_DEBIT_SWEEP_INTERVAL_MS ?? 6 * 60 * 60 * 1000);
const DEPOSIT_RECONCILE_INTERVAL_MS = Number(process.env.DEPOSIT_RECONCILE_INTERVAL_MS ?? 60 * 1000);

initWhatsApp().catch(console.error);

// Daily: mark overdue contributions LATE
setTimeout(() => {
  runDailyContributionCheck().catch(err =>
    console.error('[Cron] Daily check failed:', err.message)
  );
}, 30_000);
setInterval(() => {
  runDailyContributionCheck().catch(err =>
    console.error('[Cron] Daily check failed:', err.message)
  );
}, 24 * 60 * 60 * 1000);

// Every 2 min: sweep active circles and trigger any ready payouts
// TODO: increase interval to 30 min before going to production
setInterval(() => {
  runPayoutSweep().catch(err =>
    console.error('[Cron] Payout sweep failed:', err.message)
  );
}, 2 * 60 * 1000);

// Reconcile pending mandate activations — also runs once shortly after boot (read-only)
setTimeout(() => {
  runMandateActivationCheck().catch(err =>
    console.error('[Cron] Mandate activation check failed:', err.message)
  );
}, 45_000);
setInterval(() => {
  runMandateActivationCheck().catch(err =>
    console.error('[Cron] Mandate activation check failed:', err.message)
  );
}, MANDATE_CHECK_INTERVAL_MS);

// Debit due contributions for members with an ACTIVE mandate.
// Intentionally NOT run at startup — avoids money movement on every deploy/restart.
setInterval(() => {
  runAutoDebitSweep().catch(err =>
    console.error('[Cron] Auto-debit sweep failed:', err.message)
  );
}, AUTO_DEBIT_SWEEP_INTERVAL_MS);

// Webhook-independent: match Nomba virtual-account deposits to pending contributions.
// Runs shortly after boot too, so deposits that landed while we were down get settled.
setTimeout(() => {
  runDepositReconciliation().catch(err =>
    console.error('[Cron] Deposit reconciliation failed:', err.message)
  );
}, 20_000);
setInterval(() => {
  runDepositReconciliation().catch(err =>
    console.error('[Cron] Deposit reconciliation failed:', err.message)
  );
}, DEPOSIT_RECONCILE_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`Qova server running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/docs`);
});
