"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayoutsHandler = getPayoutsHandler;
exports.simulateTransferHandler = simulateTransferHandler;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const payout_1 = require("../services/payout");
// GET /payouts/:circleId — payout history for a circle
async function getPayoutsHandler(req, res) {
    const circle = await prisma_1.default.circle.findUnique({ where: { id: req.params.circleId } });
    if (!circle)
        throw new errorHandler_1.AppError('Circle not found', 404);
    const payouts = await prisma_1.default.payout.findMany({
        where: { circle_id: req.params.circleId },
        orderBy: { cycle_number: 'asc' },
        include: {
            recipient: { select: { id: true, name: true, phone: true } },
        },
    });
    res.json({ success: true, data: { payouts }, message: 'Payouts retrieved' });
}
// POST /payouts/simulate-transfer — dev: force-trigger payout check for a circle
const simulateSchema = zod_1.z.object({ circle_id: zod_1.z.string() });
async function simulateTransferHandler(req, res) {
    const { circle_id } = simulateSchema.parse(req.body);
    await (0, payout_1.checkAndTriggerPayout)(circle_id);
    res.json({ success: true, data: null, message: 'Payout check triggered — check server logs' });
}
//# sourceMappingURL=payouts.js.map