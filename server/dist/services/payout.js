"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndTriggerPayout = checkAndTriggerPayout;
const prisma_1 = __importDefault(require("../utils/prisma"));
const nomba_1 = require("./nomba");
const whatsapp_1 = require("./whatsapp");
const score_1 = require("../utils/score");
async function checkAndTriggerPayout(circleId) {
    const circle = await prisma_1.default.circle.findUnique({
        where: { id: circleId },
        include: {
            memberships: { include: { user: true } },
            admin: true,
        },
    });
    if (!circle || circle.status !== 'ACTIVE')
        return;
    // Check all members have paid this cycle
    const contributions = await prisma_1.default.contribution.findMany({
        where: { circle_id: circleId, cycle_number: circle.current_cycle, status: 'PAID' },
    });
    if (contributions.length < circle.memberships.length)
        return; // not everyone paid yet
    // Get recipient from payout_order (0-indexed by cycle)
    const recipientId = circle.payout_order[circle.current_cycle - 1];
    if (!recipientId)
        return;
    const recipient = circle.memberships.find(m => m.user_id === recipientId)?.user;
    if (!recipient)
        return;
    if (!recipient.bank_account_number || !recipient.bank_code) {
        await alertAdmin(circle.admin.phone, circle.name, recipient.name, 'missing bank details');
        return;
    }
    const totalPot = circle.contribution_amount * circle.memberships.length;
    const merchantTxRef = `qova-payout-${circleId}-cycle${circle.current_cycle}-${Date.now()}`;
    try {
        console.log(`[Payout] Triggering cycle ${circle.current_cycle} payout → ${recipient.name}`);
        const transfer = await (0, nomba_1.bankTransfer)({
            amount: totalPot,
            accountNumber: recipient.bank_account_number,
            accountName: recipient.name,
            bankCode: recipient.bank_code,
            merchantTxRef,
            narration: `Ajo Circle Payout - ${circle.name} Cycle ${circle.current_cycle}`,
        });
        // Record the payout
        await prisma_1.default.payout.create({
            data: {
                circle_id: circleId,
                recipient_id: recipientId,
                cycle_number: circle.current_cycle,
                amount: totalPot,
                nomba_transfer_reference: transfer.transferReference,
            },
        });
        // Mark recipient's membership as received
        await prisma_1.default.membership.updateMany({
            where: { circle_id: circleId, user_id: recipientId },
            data: { has_received_payout: true },
        });
        // +10 reliability for every member who contributed this cycle
        await Promise.all(contributions.map(c => (0, score_1.bumpScore)(c.user_id, 10)));
        const isLastCycle = circle.current_cycle >= circle.total_slots;
        if (isLastCycle) {
            await prisma_1.default.circle.update({
                where: { id: circleId },
                data: { status: 'COMPLETED' },
            });
            console.log(`[Payout] Circle ${circle.name} completed — all members have received payouts`);
        }
        else {
            await prisma_1.default.circle.update({
                where: { id: circleId },
                data: { current_cycle: { increment: 1 } },
            });
            console.log(`[Payout] Advanced to cycle ${circle.current_cycle + 1}`);
        }
    }
    catch (err) {
        console.error(`[Payout] Transfer failed for circle ${circle.name}:`, err.message);
        await alertAdmin(circle.admin.phone, circle.name, recipient.name, `transfer failed: ${err.message}`);
    }
}
async function alertAdmin(adminPhone, circleName, recipientName, reason) {
    const message = `⚠️ *Qova Payout Alert*\n\n` +
        `Circle: *${circleName}*\n` +
        `Recipient: *${recipientName}*\n` +
        `Issue: ${reason}\n\n` +
        `Please log in to the Qova admin panel to resolve this.`;
    try {
        await (0, whatsapp_1.sendWhatsAppMessage)(adminPhone, message);
    }
    catch (e) {
        console.error('[Payout] Failed to send WhatsApp alert to admin:', e);
    }
}
//# sourceMappingURL=payout.js.map