"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeHandler = getMeHandler;
exports.getReliabilityScoreHandler = getReliabilityScoreHandler;
exports.getMyCirclesHandler = getMyCirclesHandler;
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
async function getMeHandler(req, res) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: req.userId },
        select: {
            id: true,
            name: true,
            phone: true,
            bank_account_number: true,
            bank_code: true,
            bank_name: true,
            reliability_score: true,
            bvn_verified: true,
            created_at: true,
        },
    });
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    res.json({ success: true, data: { user }, message: 'Profile retrieved' });
}
async function getReliabilityScoreHandler(req, res) {
    const userId = req.userId;
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { reliability_score: true },
    });
    if (!user)
        throw new errorHandler_1.AppError('User not found', 404);
    const memberships = await prisma_1.default.membership.findMany({
        where: { user_id: userId },
        select: { circle_id: true },
    });
    const circleIds = memberships.map(m => m.circle_id);
    const [contributionsPaid, lateOrMissed, potsCompleted] = await Promise.all([
        prisma_1.default.contribution.count({ where: { user_id: userId, status: 'PAID' } }),
        prisma_1.default.contribution.count({ where: { user_id: userId, status: { in: ['LATE', 'MISSED'] } } }),
        prisma_1.default.payout.count({ where: { circle_id: { in: circleIds } } }),
    ]);
    const score = user.reliability_score;
    const label = score >= 91 ? 'Excellent' :
        score >= 71 ? 'Very Good' :
            score >= 51 ? 'Good' :
                score >= 31 ? 'Fair' : 'Poor';
    res.json({
        success: true,
        data: {
            score,
            label,
            breakdown: {
                contributions_paid: contributionsPaid,
                late_or_missed: lateOrMissed,
                pots_completed: potsCompleted,
            },
        },
        message: 'Reliability score retrieved',
    });
}
async function getMyCirclesHandler(req, res) {
    const memberships = await prisma_1.default.membership.findMany({
        where: { user_id: req.userId },
        include: {
            circle: {
                include: {
                    admin: { select: { id: true, name: true } },
                    _count: { select: { memberships: true } },
                },
            },
        },
        orderBy: { joined_at: 'desc' },
    });
    const current = memberships
        .filter(m => m.circle.status === 'PENDING' || m.circle.status === 'ACTIVE')
        .map(m => ({ ...m.circle, slot_number: m.slot_number, joined_at: m.joined_at }));
    const past = memberships
        .filter(m => m.circle.status === 'COMPLETED')
        .map(m => ({ ...m.circle, slot_number: m.slot_number, joined_at: m.joined_at }));
    res.json({ success: true, data: { current, past }, message: 'Circles retrieved' });
}
//# sourceMappingURL=users.js.map