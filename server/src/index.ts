import 'dotenv/config';
import app from './app';
import { initWhatsApp } from './services/whatsapp';
import { runDailyContributionCheck, runPayoutSweep } from './services/cron';

const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Qova server running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/docs`);
});
