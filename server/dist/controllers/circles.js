"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCircleHandler = createCircleHandler;
exports.getCircleHandler = getCircleHandler;
exports.getCircleByInviteHandler = getCircleByInviteHandler;
exports.joinCircleHandler = joinCircleHandler;
exports.startCircleHandler = startCircleHandler;
exports.setPayoutOrderHandler = setPayoutOrderHandler;
exports.getCircleMembersHandler = getCircleMembersHandler;
exports.getCircleHistoryHandler = getCircleHistoryHandler;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
function generateInviteCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix = Array.from({ length: 2 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const mid = String(Math.floor(1000 + Math.random() * 9000));
    const suffix = String(Math.floor(10 + Math.random() * 90));
    return `${prefix}-${mid}-${suffix}`;
}
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function nextPayoutDate(frequency, from = new Date()) {
    const d = new Date(from);
    if (frequency === 'WEEKLY')
        d.setDate(d.getDate() + 7);
    else if (frequency === 'BIWEEKLY')
        d.setDate(d.getDate() + 14);
    else
        d.setMonth(d.getMonth() + 1);
    return d;
}
// Activate a circle: shuffle order if AUTO, set status ACTIVE
async function activateCircle(circleId, payout_order_type, memberIds) {
    const finalOrder = payout_order_type === 'AUTO' ? shuffle(memberIds) : memberIds;
    await prisma_1.default.circle.update({
        where: { id: circleId },
        data: { status: 'ACTIVE', payout_order: finalOrder },
    });
    return finalOrder;
}
// ─── Create ──────────────────────────────────────────────────────────────────
const createCircleSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    contribution_amount: zod_1.z.number().int().positive(),
    frequency: zod_1.z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']),
    total_slots: zod_1.z.number().int().min(2).max(50),
    payout_order_type: zod_1.z.enum(['AUTO', 'MANUAL']).default('AUTO'),
    start_condition: zod_1.z.enum(['AUTO', 'MANUAL']).default('AUTO'),
    start_date: zod_1.z.string().datetime().optional(),
});
async function createCircleHandler(req, res) {
    const { name, contribution_amount, frequency, total_slots, payout_order_type, start_condition, start_date } = createCircleSchema.parse(req.body);
    let invite_code = generateInviteCode();
    while (await prisma_1.default.circle.findUnique({ where: { invite_code } })) {
        invite_code = generateInviteCode();
    }
    const circle = await prisma_1.default.circle.create({
        data: {
            name,
            invite_code,
            contribution_amount,
            frequency,
            total_slots,
            payout_order_type,
            start_condition,
            admin_id: req.userId,
            status: 'PENDING',
            payout_order: [req.userId],
            start_date: start_date ? new Date(start_date) : null,
        },
    });
    // Admin auto-joins as slot 1
    await prisma_1.default.membership.create({
        data: { user_id: req.userId, circle_id: circle.id, slot_number: 1 },
    });
    // Single-slot edge case: if admin is the only member and start_condition is AUTO, activate immediately
    if (total_slots === 1) {
        await activateCircle(circle.id, payout_order_type, [req.userId]);
    }
    res.status(201).json({
        success: true,
        data: { circle },
        message: 'Circle created',
    });
}
// ─── Get ─────────────────────────────────────────────────────────────────────
async function getCircleHandler(req, res) {
    const circle = await prisma_1.default.circle.findUnique({
        where: { id: req.params.id },
        include: {
            admin: { select: { id: true, name: true, phone: true } },
            memberships: { select: { user_id: true } },
            contributions: {
                where: { status: 'PAID' },
                select: { amount: true },
            },
        },
    });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    const members_count = circle.memberships.length;
    const total_pot = circle.contributions.reduce((sum, c) => sum + c.amount, 0);
    const next_payout_date = circle.status === 'ACTIVE' ? nextPayoutDate(circle.frequency) : null;
    const { memberships, contributions, ...circleData } = circle;
    res.json({
        success: true,
        data: { circle: { ...circleData, members_count, total_pot, next_payout_date } },
        message: 'Circle retrieved',
    });
}
// ─── Lookup by Invite Code ───────────────────────────────────────────────────
async function getCircleByInviteHandler(req, res) {
    const { invite_code } = req.params;
    const circle = await prisma_1.default.circle.findUnique({
        where: { invite_code },
        include: {
            admin: { select: { id: true, name: true, phone: true } },
            memberships: { select: { user_id: true } },
        },
    });
    if (!circle)
        throw new errorHandler_1.AppError('Invalid invite code', 404);
    const members_count = circle.memberships.length;
    const { memberships, ...circleData } = circle;
    res.json({
        success: true,
        data: { circle: { ...circleData, members_count } },
        message: 'Circle retrieved by invite code',
    });
}
// ─── Join ─────────────────────────────────────────────────────────────────────
const joinCircleSchema = zod_1.z.object({ invite_code: zod_1.z.string().min(1) });
async function joinCircleHandler(req, res) {
    const { invite_code } = joinCircleSchema.parse(req.body);
    const circle = await prisma_1.default.circle.findUnique({
        where: { invite_code },
        include: { memberships: { select: { user_id: true } } },
    });
    if (!circle)
        throw new errorHandler_1.AppError('Invalid invite code', 404);
    if (circle.status === 'COMPLETED')
        throw new errorHandler_1.AppError('Circle has already completed', 400);
    if (circle.status === 'ACTIVE')
        throw new errorHandler_1.AppError('Circle has already started', 400);
    if (circle.memberships.length >= circle.total_slots)
        throw new errorHandler_1.AppError('Circle is full', 400);
    const alreadyMember = circle.memberships.some(m => m.user_id === req.userId);
    if (alreadyMember)
        throw new errorHandler_1.AppError('You are already a member of this circle', 400);
    const slot_number = circle.memberships.length + 1;
    const membership = await prisma_1.default.membership.create({
        data: { user_id: req.userId, circle_id: circle.id, slot_number },
    });
    const allMemberIds = [...circle.memberships.map(m => m.user_id), req.userId];
    const isFull = allMemberIds.length >= circle.total_slots;
    // Auto-start when full if start_condition is AUTO
    if (isFull && circle.start_condition === 'AUTO') {
        await activateCircle(circle.id, circle.payout_order_type, allMemberIds);
    }
    else {
        // Just append to payout_order for now (admin can reorder if MANUAL)
        await prisma_1.default.circle.update({
            where: { id: circle.id },
            data: { payout_order: { push: req.userId } },
        });
    }
    res.status(201).json({
        success: true,
        data: {
            membership,
            circle: { id: circle.id, name: circle.name },
            circle_started: isFull && circle.start_condition === 'AUTO',
        },
        message: isFull && circle.start_condition === 'AUTO'
            ? 'Joined and circle is now active!'
            : 'Joined circle successfully',
    });
}
// ─── Manual Start (admin only) ────────────────────────────────────────────────
async function startCircleHandler(req, res) {
    const circle = await prisma_1.default.circle.findUnique({
        where: { id: req.params.id },
        include: { memberships: { select: { user_id: true } } },
    });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    if (circle.admin_id !== req.userId)
        throw new errorHandler_1.AppError('Only the admin can start the circle', 403);
    if (circle.status !== 'PENDING')
        throw new errorHandler_1.AppError('Circle is not in a startable state', 400);
    if (circle.memberships.length < 2)
        throw new errorHandler_1.AppError('Need at least 2 members to start', 400);
    const memberIds = circle.memberships.map(m => m.user_id);
    const finalOrder = await activateCircle(circle.id, circle.payout_order_type, memberIds);
    res.json({
        success: true,
        data: { payout_order: finalOrder },
        message: 'Circle started',
    });
}
// ─── Set Payout Order (admin only, MANUAL circles) ────────────────────────────
const payoutOrderSchema = zod_1.z.object({
    payout_order: zod_1.z.array(zod_1.z.string()).min(2),
});
async function setPayoutOrderHandler(req, res) {
    const { payout_order } = payoutOrderSchema.parse(req.body);
    const circle = await prisma_1.default.circle.findUnique({
        where: { id: req.params.id },
        include: { memberships: { select: { user_id: true } } },
    });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    if (circle.admin_id !== req.userId)
        throw new errorHandler_1.AppError('Only the admin can set payout order', 403);
    if (circle.payout_order_type !== 'MANUAL')
        throw new errorHandler_1.AppError('Circle uses automatic payout order', 400);
    if (circle.status === 'COMPLETED')
        throw new errorHandler_1.AppError('Circle is already completed', 400);
    const memberIds = new Set(circle.memberships.map(m => m.user_id));
    const invalid = payout_order.find(id => !memberIds.has(id));
    if (invalid)
        throw new errorHandler_1.AppError(`User ${invalid} is not a member of this circle`, 400);
    if (payout_order.length !== memberIds.size)
        throw new errorHandler_1.AppError('Payout order must include all members', 400);
    await prisma_1.default.circle.update({
        where: { id: circle.id },
        data: { payout_order },
    });
    res.json({ success: true, data: { payout_order }, message: 'Payout order updated' });
}
// ─── Members ──────────────────────────────────────────────────────────────────
async function getCircleMembersHandler(req, res) {
    const circle = await prisma_1.default.circle.findUnique({ where: { id: req.params.id } });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    const [members, currentContributions] = await Promise.all([
        prisma_1.default.membership.findMany({
            where: { circle_id: req.params.id },
            orderBy: { slot_number: 'asc' },
            include: {
                user: { select: { id: true, name: true, phone: true, reliability_score: true } },
            },
        }),
        prisma_1.default.contribution.findMany({
            where: { circle_id: req.params.id, cycle_number: circle.current_cycle },
        }),
    ]);
    const paidUserIds = new Set(currentContributions.filter(c => c.status === 'PAID').map(c => c.user_id));
    // Determine turn position from payout_order
    const payoutPosition = new Map(circle.payout_order.map((uid, i) => [uid, i + 1]));
    const enriched = members.map(m => {
        const turn = payoutPosition.get(m.user_id) ?? m.slot_number;
        return {
            ...m,
            turn,
            paid: paidUserIds.has(m.user_id),
            status: turn < circle.current_cycle
                ? 'completed'
                : turn === circle.current_cycle
                    ? 'active'
                    : 'upcoming',
        };
    });
    res.json({ success: true, data: { members: enriched }, message: 'Members retrieved' });
}
// ─── History ──────────────────────────────────────────────────────────────────
async function getCircleHistoryHandler(req, res) {
    const circle = await prisma_1.default.circle.findUnique({ where: { id: req.params.id } });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    const [contributions, payouts] = await Promise.all([
        prisma_1.default.contribution.findMany({
            where: { circle_id: req.params.id, status: 'PAID' },
            orderBy: { paid_at: 'desc' },
            include: { user: { select: { name: true } } },
        }),
        prisma_1.default.payout.findMany({
            where: { circle_id: req.params.id },
            orderBy: { paid_at: 'desc' },
            include: { recipient: { select: { name: true } } },
        }),
    ]);
    const history = [
        ...contributions.map(c => ({
            id: c.id,
            type: 'contribution',
            user: c.user.name,
            amount: c.amount,
            date: c.paid_at,
            status: 'success',
            cycle_number: c.cycle_number,
        })),
        ...payouts.map(p => ({
            id: p.id,
            type: 'payout',
            user: p.recipient.name,
            amount: p.amount,
            date: p.paid_at,
            status: 'success',
            cycle_number: p.cycle_number,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json({ success: true, data: { history }, message: 'History retrieved' });
}
//# sourceMappingURL=circles.js.map