"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payouts_1 = require("../controllers/payouts");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Payouts
 *   description: Circle pot disbursements
 */
/**
 * @swagger
 * /payouts/{circleId}:
 *   get:
 *     summary: Get payout history for a circle
 *     tags: [Payouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: circleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of payouts per cycle with recipient details
 *       404:
 *         description: Circle not found
 */
router.get('/:circleId', auth_1.authenticate, payouts_1.getPayoutsHandler);
/**
 * @swagger
 * /payouts/simulate-transfer:
 *   post:
 *     summary: Dev — force-trigger payout check for a circle
 *     tags: [Payouts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [circle_id]
 *             properties:
 *               circle_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payout check triggered
 */
router.post('/simulate-transfer', payouts_1.simulateTransferHandler);
exports.default = router;
//# sourceMappingURL=payouts.js.map