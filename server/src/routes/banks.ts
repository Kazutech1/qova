import { Router, Request, Response } from 'express';
import { getBanks } from '../services/nomba';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Banks
 *   description: Supported Nigerian banks
 */

/**
 * @swagger
 * /banks:
 *   get:
 *     summary: Get list of supported banks and their codes
 *     tags: [Banks]
 *     responses:
 *       200:
 *         description: List of banks with code and name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "058"
 *                       name:
 *                         type: string
 *                         example: "Guaranty Trust Bank"
 *                 message:
 *                   type: string
 */
router.get('/', async (_req: Request, res: Response) => {
  const banks = await getBanks();
  res.json({ success: true, data: banks, message: 'Banks retrieved successfully' });
});

export default router;
