"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTP = sendOTP;
exports.verifyOTP = verifyOTP;
const prisma_1 = __importDefault(require("../utils/prisma"));
const whatsapp_1 = require("./whatsapp");
const OTP_TTL_MINUTES = 5;
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendOTP(phone) {
    const code = generateCode();
    const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await prisma_1.default.oTP.create({ data: { phone, code, expires_at } });
    console.log(`\n======================================================`);
    console.log(`[OTP] Generated verification code for ${phone}: ${code}`);
    console.log(`======================================================\n`);
    try {
        await (0, whatsapp_1.sendWhatsAppMessage)(phone, `Your Qova verification code is *${code}*. It expires in ${OTP_TTL_MINUTES} minutes.`);
    }
    catch (err) {
        console.error(`[WhatsApp] Failed to send OTP to ${phone}:`, err.message);
        console.log(`[OTP] Note: Falling back to console-only OTP delivery.`);
    }
}
async function verifyOTP(phone, code) {
    const record = await prisma_1.default.oTP.findFirst({
        where: {
            phone,
            code,
            used: false,
            expires_at: { gt: new Date() },
        },
        orderBy: { created_at: 'desc' },
    });
    if (!record)
        return false;
    await prisma_1.default.oTP.update({ where: { id: record.id }, data: { used: true } });
    return true;
}
//# sourceMappingURL=otp.js.map