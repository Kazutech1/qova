import { Router } from 'express';
import { getSubaccountsHandler, debugAccountsHandler } from '../controllers/admin';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Operational endpoints
 */

/**
 * @swagger
 * /admin/accounts:
 *   get:
 *     summary: List all Nomba subaccounts with live balances
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: All subaccounts with balance in kobo and naira, plus a total summary
 *       500:
 *         description: Nomba API error
 */
router.get('/accounts', getSubaccountsHandler);
router.get('/accounts/raw', debugAccountsHandler);

export default router;
