import { Router } from 'express';
import { getMeHandler, getMyCirclesHandler } from '../controllers/users';
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

/**
 * @swagger
 * /users/me/circles:
 *   get:
 *     summary: Get all circles the user is in — current and past
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns current (PENDING/ACTIVE) and past (COMPLETED) circles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     current:
 *                       type: array
 *                       items:
 *                         type: object
 *                     past:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message: { type: string }
 *       401:
 *         description: Unauthorized
 */
router.get('/me/circles', authenticate, getMyCirclesHandler);

export default router;
