"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Phone number authentication via WhatsApp OTP
 */
/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     summary: Send OTP to a phone number via WhatsApp
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: "null" }
 *                 message: { type: string, example: "OTP sent via WhatsApp" }
 *       400:
 *         description: Invalid phone number
 *       500:
 *         description: WhatsApp not connected or server error
 */
router.post('/send-otp', auth_1.sendOtpHandler);
/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP and receive a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "+2348012345678"
 *               code:
 *                 type: string
 *                 example: "483920"
 *     responses:
 *       200:
 *         description: Verified — returns JWT and user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         phone: { type: string }
 *                         name: { type: string }
 *                 message: { type: string, example: "Verified successfully" }
 *       400:
 *         description: Invalid or expired OTP
 */
router.post('/verify-otp', auth_1.verifyOtpHandler);
exports.default = router;
//# sourceMappingURL=auth.js.map