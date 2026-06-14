import 'dotenv/config';
import app from './app';
import { initWhatsApp } from './services/whatsapp';
import { runDailyContributionCheck } from './services/cron';

const PORT = process.env.PORT || 3000;

initWhatsApp().catch(console.error);

// Run after 30s delay (let DB connection stabilise), then every 24 hours
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

app.listen(PORT, () => {
  console.log(`Qova server running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/docs`);
});
