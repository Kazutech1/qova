"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const whatsapp_1 = require("./services/whatsapp");
const cron_1 = require("./services/cron");
const PORT = process.env.PORT || 3000;
(0, whatsapp_1.initWhatsApp)().catch(console.error);
// Daily: mark overdue contributions LATE
setTimeout(() => {
    (0, cron_1.runDailyContributionCheck)().catch(err => console.error('[Cron] Daily check failed:', err.message));
}, 30000);
setInterval(() => {
    (0, cron_1.runDailyContributionCheck)().catch(err => console.error('[Cron] Daily check failed:', err.message));
}, 24 * 60 * 60 * 1000);
// Every 2 min: sweep active circles and trigger any ready payouts
// TODO: increase interval to 30 min before going to production
setInterval(() => {
    (0, cron_1.runPayoutSweep)().catch(err => console.error('[Cron] Payout sweep failed:', err.message));
}, 2 * 60 * 1000);
app_1.default.listen(PORT, () => {
    console.log(`Qova server running on port ${PORT}`);
    console.log(`API docs available at http://localhost:${PORT}/docs`);
});
//# sourceMappingURL=index.js.map