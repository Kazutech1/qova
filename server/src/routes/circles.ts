import { Router } from 'express';
import {
  createCircleHandler,
  getCircleHandler,
  joinCircleHandler,
  startCircleHandler,
  setPayoutOrderHandler,
  getCircleMembersHandler,
  getCircleHistoryHandler,
} from '../controllers/circles';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Circles
 *   description: Ajo savings circles
 */

/**
 * @swagger
 * /circles:
 *   post:
 *     summary: Create a new Ajo circle
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, contribution_amount, frequency, total_slots]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Lagos Friday Circle"
 *               contribution_amount:
 *                 type: integer
 *                 description: Amount in kobo (e.g. 5000000 = ₦50,000)
 *                 example: 5000000
 *               frequency:
 *                 type: string
 *                 enum: [WEEKLY, BIWEEKLY, MONTHLY]
 *                 example: MONTHLY
 *               total_slots:
 *                 type: integer
 *                 example: 10
 *               payout_order_type:
 *                 type: string
 *                 enum: [AUTO, MANUAL]
 *                 default: AUTO
 *               start_condition:
 *                 type: string
 *                 enum: [AUTO, MANUAL]
 *                 default: AUTO
 *     responses:
 *       201:
 *         description: Circle created — admin auto-joins as slot 1, invite_code returned
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, createCircleHandler);

/**
 * @swagger
 * /circles/join:
 *   post:
 *     summary: Join a circle using an invite code
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invite_code]
 *             properties:
 *               invite_code:
 *                 type: string
 *                 example: "QX-8829-01"
 *     responses:
 *       201:
 *         description: Joined circle successfully
 *       400:
 *         description: Circle full, not active, or already a member
 *       404:
 *         description: Invalid invite code
 */
router.post('/join', authenticate, joinCircleHandler);

/**
 * @swagger
 * /circles/{id}:
 *   get:
 *     summary: Get circle details with total pot and next payout date
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Circle details
 *       404:
 *         description: Circle not found
 */
router.get('/:id', authenticate, getCircleHandler);

/**
 * @swagger
 * /circles/{id}/start:
 *   post:
 *     summary: Admin manually starts the circle (for start_condition=MANUAL)
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Circle started — payout order finalised
 *       403:
 *         description: Not the admin
 *       400:
 *         description: Already started or not enough members
 */
router.post('/:id/start', authenticate, startCircleHandler);

/**
 * @swagger
 * /circles/{id}/payout-order:
 *   post:
 *     summary: Admin sets who gets paid in what order (for payout_order_type=MANUAL)
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payout_order]
 *             properties:
 *               payout_order:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs in desired payout sequence
 *     responses:
 *       200:
 *         description: Payout order saved
 *       403:
 *         description: Not the admin
 *       400:
 *         description: Invalid members or circle uses AUTO order
 */
router.post('/:id/payout-order', authenticate, setPayoutOrderHandler);

/**
 * @swagger
 * /circles/{id}/members:
 *   get:
 *     summary: List members with slot, paid status, and turn indicator
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Members list
 *       404:
 *         description: Circle not found
 */
router.get('/:id/members', authenticate, getCircleMembersHandler);

/**
 * @swagger
 * /circles/{id}/history:
 *   get:
 *     summary: Full contribution and payout history for a circle
 *     tags: [Circles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Combined history sorted by date descending
 *       404:
 *         description: Circle not found
 */
router.get('/:id/history', authenticate, getCircleHistoryHandler);

export default router;
