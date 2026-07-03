"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payContributionHandler = payContributionHandler;
exports.webhookHandler = webhookHandler;
exports.simulatePaymentHandler = simulatePaymentHandler;
exports.simulateAllPaymentsHandler = simulateAllPaymentsHandler;
exports.getContributionsHandler = getContributionsHandler;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const nomba_1 = require("../services/nomba");
const score_1 = require("../utils/score");
const payout_1 = require("../services/payout");
// ─── Helpers ──────────────────────────────────────────────────────────────────
function koboCToNaira(kobo) {
    return (kobo / 100).toFixed(2);
}
function frequencyDays(frequency) {
    if (frequency === 'WEEKLY')
        return 7;
    if (frequency === 'BIWEEKLY')
        return 14;
    return 30;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
function formatNombaDate(date) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
}
// Due date for a given cycle based on first payment anchor
function cycleDueDate(cycleStartedAt, frequency, cycleNumber) {
    return addDays(cycleStartedAt, (cycleNumber - 1) * frequencyDays(frequency));
}
// ─── POST /contributions/pay ──────────────────────────────────────────────────
const paySchema = zod_1.z.object({ circle_id: zod_1.z.string() });
async function payContributionHandler(req, res) {
    const { circle_id } = paySchema.parse(req.body);
    const circle = await prisma_1.default.circle.findUnique({ where: { id: circle_id } });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    if (circle.status !== 'ACTIVE')
        throw new errorHandler_1.AppError('Circle is not active yet', 400);
    const membership = await prisma_1.default.membership.findFirst({
        where: { user_id: req.userId, circle_id },
    });
    if (!membership)
        throw new errorHandler_1.AppError('You are not a member of this circle', 403);
    // Return existing unpaid virtual account for this cycle if already created
    const existing = await prisma_1.default.contribution.findFirst({
        where: {
            user_id: req.userId,
            circle_id,
            cycle_number: circle.current_cycle,
        },
    });
    if (existing) {
        if (existing.status === 'PAID')
            throw new errorHandler_1.AppError('You have already paid for this cycle', 400);
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
        await prisma_1.default.contribution.delete({ where: { id: existing.id } });
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
    const virtualAccount = await (0, nomba_1.createVirtualAccount)({
        accountRef,
        accountName: `Qova ${safeCircleName}`,
        expiryDate: formatNombaDate(expiryDate),
        expectedAmount: koboCToNaira(circle.contribution_amount),
    });
    await prisma_1.default.contribution.create({
        data: {
            user_id: req.userId,
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
async function webhookHandler(req, res) {
    // Log full payload so we can confirm Nomba's exact field names on first delivery
    console.log('[Webhook] Nomba payload:', JSON.stringify(req.body, null, 2));
    // Acknowledge immediately so Nomba doesn't retry
    res.json({ success: true });
    // Nomba may send 'event' or 'event_type'
    const eventName = req.body.event ?? req.body.event_type ?? '';
    if (eventName !== 'payment_success')
        return;
    const data = req.body.data ?? {};
    // Try every known field name for the virtual account reference
    const accountRef = data.accountRef ??
        data.account_ref ??
        data.aliasAccountNumber ??
        data.alias_account_number ??
        '';
    if (!accountRef) {
        console.warn('[Webhook] payment_success received but no accountRef found in payload');
        return;
    }
    await processPayment(accountRef);
}
// ─── POST /contributions/simulate-payment ─────────────────────────────────────
const simulateSchema = zod_1.z.object({ account_ref: zod_1.z.string() });
async function simulatePaymentHandler(req, res) {
    const { account_ref } = simulateSchema.parse(req.body);
    const result = await processPayment(account_ref);
    if (!result)
        throw new errorHandler_1.AppError('No pending contribution found for that account ref', 404);
    res.json({ success: true, data: result, message: 'Payment simulated successfully' });
}
// ─── Shared payment processing logic ─────────────────────────────────────────
async function processPayment(accountRef) {
    const contribution = await prisma_1.default.contribution.findUnique({
        where: { nomba_account_ref: accountRef },
        include: { circle: true },
    });
    if (!contribution || contribution.status === 'PAID')
        return null;
    const wasLate = contribution.status === 'LATE';
    const updated = await prisma_1.default.contribution.update({
        where: { id: contribution.id },
        data: {
            status: 'PAID',
            paid_at: new Date(),
            nomba_reference: `nomba-sim-${Date.now()}`,
        },
    });
    // +5 for on-time payment, +2 partial credit for late recovery — capped at 100
    await (0, score_1.bumpScore)(contribution.user_id, wasLate ? 2 : 5);
    // Anchor cycle_started_at on the very first payment in this circle
    if (!contribution.circle.cycle_started_at) {
        await prisma_1.default.circle.update({
            where: { id: contribution.circle_id },
            data: { cycle_started_at: new Date() },
        });
    }
    // Check if all members paid — auto-trigger payout if so
    setImmediate(() => (0, payout_1.checkAndTriggerPayout)(contribution.circle_id).catch(console.error));
    return updated;
}
// ─── POST /contributions/simulate-all ────────────────────────────────────────
const simulateAllSchema = zod_1.z.object({ circle_id: zod_1.z.string() });
async function simulateAllPaymentsHandler(req, res) {
    const { circle_id } = simulateAllSchema.parse(req.body);
    const circle = await prisma_1.default.circle.findUnique({
        where: { id: circle_id },
        include: { memberships: true },
    });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    if (circle.status !== 'ACTIVE')
        throw new errorHandler_1.AppError('Circle is not active', 400);
    const results = [];
    for (const member of circle.memberships) {
        const accountRef = `qova-${circle_id}-${member.user_id}-cycle${circle.current_cycle}`;
        // Ensure a contribution record exists
        const existing = await prisma_1.default.contribution.findUnique({
            where: { nomba_account_ref: accountRef },
        });
        if (!existing) {
            await prisma_1.default.contribution.create({
                data: {
                    user_id: member.user_id,
                    circle_id,
                    cycle_number: circle.current_cycle,
                    amount: circle.contribution_amount,
                    status: 'PENDING',
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
async function getContributionsHandler(req, res) {
    const circle = await prisma_1.default.circle.findUnique({ where: { id: req.params.circleId } });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    const contributions = await prisma_1.default.contribution.findMany({
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
//# sourceMappingURL=contributions.js.map