"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpHandler = sendOtpHandler;
exports.verifyOtpHandler = verifyOtpHandler;
exports.whatsappStatusHandler = whatsappStatusHandler;
exports.whatsappReconnectHandler = whatsappReconnectHandler;
exports.completeProfileHandler = completeProfileHandler;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const otp_1 = require("../services/otp");
const whatsapp_1 = require("../services/whatsapp");
const nomba_1 = require("../services/nomba");
const prisma_1 = __importDefault(require("../utils/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const sendOtpSchema = zod_1.z.object({ phone: zod_1.z.string().min(10) });
const verifyOtpSchema = zod_1.z.object({ phone: zod_1.z.string().min(10), code: zod_1.z.string().length(6) });
const completeProfileSchema = zod_1.z.object({
    bank_account_number: zod_1.z.string().min(10).max(10),
    bank_code: zod_1.z.string().min(3),
});
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
        create: { phone, name: '', reliability_score: 50 },
        update: {},
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
        success: true,
        data: { token, user: { id: user.id, phone: user.phone, name: user.name } },
        message: 'Verified successfully',
    });
}
async function whatsappStatusHandler(_req, res) {
    const status = (0, whatsapp_1.getWhatsAppStatus)();
    res.json({ success: true, data: status, message: status.ready ? 'WhatsApp connected' : 'WhatsApp not ready' });
}
async function whatsappReconnectHandler(_req, res) {
    res.json({ success: true, data: null, message: 'Reconnecting WhatsApp...' });
    (0, whatsapp_1.reconnectWhatsApp)().catch(err => console.error('[WhatsApp] Manual reconnect failed:', err));
}
async function completeProfileHandler(req, res) {
    const { bank_account_number, bank_code } = completeProfileSchema.parse(req.body);
    let lookup;
    try {
        lookup = await (0, nomba_1.lookupBankAccount)(bank_account_number, bank_code);
    }
    catch {
        return res.status(400).json({ success: false, data: null, message: 'Bank account not found. Please check your account number and bank.' });
    }
    // Nomba lookup doesn't always return bankName — fall back to the banks list
    let bankName = lookup.bankName;
    if (!bankName) {
        const banks = await (0, nomba_1.getBanks)();
        bankName = banks.find(b => b.code === bank_code)?.name ?? '';
    }
    const user = await prisma_1.default.user.update({
        where: { id: req.userId },
        data: {
            name: lookup.accountName,
            bank_account_number,
            bank_code,
            bank_name: bankName,
        },
    });
    res.json({
        success: true,
        data: { user: { id: user.id, phone: user.phone, name: user.name, bank_account_number: user.bank_account_number, bank_name: user.bank_name } },
        message: 'Profile completed',
    });
}
//# sourceMappingURL=auth.js.map