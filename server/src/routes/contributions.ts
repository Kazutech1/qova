import { Router } from 'express';
import {
  payContributionHandler,
  webhookHandler,
  simulatePaymentHandler,
  simulateAllPaymentsHandler,
  getContributionsHandler,
} from '../controllers/contributions';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Contributions
 *   description: Circle contribution payments
 */

/**
 * @swagger
 * /contributions/pay:
 *   post:
 *     summary: Get a virtual account to pay your contribution into
 *     tags: [Contributions]
 *     security:
 *       - bearerAuth: []
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
 *       201:
 *         description: Virtual account details — transfer to this account to pay
 *       200:
 *         description: Existing unpaid virtual account returned
 *       400:
 *         description: Already paid, circle not active, or not a member
 */
router.post('/pay', authenticate, payContributionHandler);

/**
 * @swagger
 * /contributions/webhook:
 *   post:
 *     summary: Nomba payment_success webhook receiver
 *     tags: [Contributions]
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post('/webhook', webhookHandler);

/**
 * @swagger
 * /contributions/simulate-payment:
 *   post:
 *     summary: Simulate a successful payment (dev only)
 *     tags: [Contributions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account_ref]
 *             properties:
 *               account_ref:
 *                 type: string
 *                 example: "qova-abc123-xyz789-cycle1"
 *     responses:
 *       200:
 *         description: Contribution marked as PAID
 *       404:
 *         description: No pending contribution found for that ref
 */
router.post('/simulate-payment', simulatePaymentHandler);

/**
 * @swagger
 * /contributions/simulate-all:
 *   post:
 *     summary: Simulate all member payments for the current cycle (dev only)
 *     tags: [Contributions]
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
 *         description: All contributions marked as PAID, payout triggered
 */
router.post('/simulate-all', simulateAllPaymentsHandler);

/**
 * @swagger
 * /contributions/{circleId}:
 *   get:
 *     summary: Get all contributions for the current cycle of a circle
 *     tags: [Contributions]
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
 *         description: Current cycle contributions with status per member
 *       404:
 *         description: Circle not found
 */
router.get('/:circleId', authenticate, getContributionsHandler);

export default router;
