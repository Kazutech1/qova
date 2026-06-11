import { Router } from 'express';
import { sendOtpHandler, verifyOtpHandler, completeProfileHandler } from '../controllers/auth';
import { authenticate } from '../middleware/auth';

const router = Router();

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
router.post('/send-otp', sendOtpHandler);

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
router.post('/verify-otp', verifyOtpHandler);

/**
 * @swagger
 * /auth/complete-profile:
 *   post:
 *     summary: Complete user profile by looking up bank account name via Nomba
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bank_account_number, bank_code]
 *             properties:
 *               bank_account_number:
 *                 type: string
 *                 example: "0554772814"
 *               bank_code:
 *                 type: string
 *                 example: "058"
 *     responses:
 *       200:
 *         description: Profile completed — name populated from bank account lookup
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         phone: { type: string }
 *                         name: { type: string, example: "M.A Animashaun" }
 *                         bank_account_number: { type: string }
 *                         bank_name: { type: string }
 *                 message: { type: string, example: "Profile completed" }
 *       400:
 *         description: Invalid bank account or bank code
 *       401:
 *         description: Unauthorized
 */
router.post('/complete-profile', authenticate, completeProfileHandler);

export default router;
