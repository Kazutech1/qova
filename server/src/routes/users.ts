import { Router } from 'express';
import { getMeHandler } from '../controllers/users';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
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
 *                         name: { type: string }
 *                         phone: { type: string }
 *                         bank_account_number: { type: string }
 *                         bank_code: { type: string }
 *                         bank_name: { type: string }
 *                         reliability_score: { type: number, example: 100 }
 *                         bvn_verified: { type: boolean, example: false }
 *                         created_at: { type: string, format: date-time }
 *                 message: { type: string, example: "Profile retrieved" }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', authenticate, getMeHandler);

export default router;
