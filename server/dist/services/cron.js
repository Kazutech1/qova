"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPayoutSweep = runPayoutSweep;
exports.runDailyContributionCheck = runDailyContributionCheck;
const prisma_1 = __importDefault(require("../utils/prisma"));
const payout_1 = require("./payout");
// Sweeps all active circles and triggers payout for any where all members have paid
async function runPayoutSweep() {
    const activeCircles = await prisma_1.default.circle.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
    });
    if (activeCircles.length === 0)
        return;
    console.log(`[Cron] Payout sweep — checking ${activeCircles.length} active circle(s)...`);
    for (const circle of activeCircles) {
        await (0, payout_1.checkAndTriggerPayout)(circle.id).catch(err => console.error(`[Cron] Payout sweep failed for ${circle.name}:`, err.message));
    }
}
// Runs daily — marks overdue contributions LATE and deducts 1 reliability point per day overdue
async function runDailyContributionCheck() {
    const now = new Date();
    const overdue = await prisma_1.default.contribution.findMany({
        where: {
            status: { in: ['PENDING', 'LATE'] },
            due_date: { lt: now },
        },
        include: { user: true },
    });
    if (overdue.length === 0)
        return;
    console.log(`[Cron] Processing ${overdue.length} overdue contribution(s)...`);
    for (const contribution of overdue) {
        // Mark LATE
        await prisma_1.default.contribution.update({
            where: { id: contribution.id },
            data: { status: 'LATE' },
        });
        // Deduct 1 point per day, floor at 0
        const newScore = Math.max(0, contribution.user.reliability_score - 1);
        await prisma_1.default.user.update({
            where: { id: contribution.user_id },
            data: { reliability_score: newScore },
        });
        console.log(`[Cron]  -1 point → ${contribution.user.name} (score: ${newScore})`);
    }
}
//# sourceMappingURL=cron.js.map