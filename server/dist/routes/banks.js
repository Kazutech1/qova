"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nomba_1 = require("../services/nomba");
const router = (0, express_1.Router)();
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
router.get('/', async (_req, res) => {
    const banks = await (0, nomba_1.getBanks)();
    res.json({ success: true, data: banks, message: 'Banks retrieved successfully' });
});
exports.default = router;
//# sourceMappingURL=banks.js.map