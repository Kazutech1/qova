"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpHandler = sendOtpHandler;
exports.verifyOtpHandler = verifyOtpHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const otp_1 = require("../services/otp");
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const sendOtpSchema = zod_1.z.object({ phone: zod_1.z.string().min(10) });
const verifyOtpSchema = zod_1.z.object({ phone: zod_1.z.string().min(10), code: zod_1.z.string().length(6) });
async function sendOtpHandler(req, res) {
    const { phone } = sendOtpSchema.parse(req.body);
    await (0, otp_1.sendOTP)(phone);
    res.json({ success: true, data: null, message: 'OTP sent via WhatsApp' });
}
async function verifyOtpHandler(req, res) {
    const { phone, code } = verifyOtpSchema.parse(req.body);
    const valid = await (0, otp_1.verifyOTP)(phone, code);
    if (!valid)
        throw new errorHandler_1.AppError('Invalid or expired OTP', 400);
    const user = await prisma_1.default.user.upsert({
        where: { phone },
        create: { phone, name: '' },
        update: {},
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
        success: true,
        data: { token, user: { id: user.id, phone: user.phone, name: user.name } },
        message: 'Verified successfully',
    });
}
//# sourceMappingURL=auth.js.map