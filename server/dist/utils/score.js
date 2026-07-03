"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bumpScore = bumpScore;
const prisma_1 = __importDefault(require("./prisma"));
async function bumpScore(userId, delta) {
    const user = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { reliability_score: true } });
    if (!user)
        return;
    const clamped = Math.min(100, Math.max(0, user.reliability_score + delta));
    await prisma_1.default.user.update({ where: { id: userId }, data: { reliability_score: clamped } });
}
//# sourceMappingURL=score.js.map