import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { checkAndTriggerPayout } from '../services/payout';

// GET /payouts/:circleId — payout history for a circle
export async function getPayoutsHandler(req: AuthRequest, res: Response) {
  const circle = await prisma.circle.findUnique({ where: { id: req.params.circleId } });
  if (!circle) throw new AppError('Circle not found', 404);

  const payouts = await prisma.payout.findMany({
    where: { circle_id: req.params.circleId },
    orderBy: { cycle_number: 'asc' },
    include: {
      recipient: { select: { id: true, name: true, phone: true } },
    },
  });

  res.json({ success: true, data: { payouts }, message: 'Payouts retrieved' });
}

// POST /payouts/simulate-transfer — dev: force-trigger payout check for a circle
const simulateSchema = z.object({ circle_id: z.string() });

export async function simulateTransferHandler(req: Request, res: Response) {
  const { circle_id } = simulateSchema.parse(req.body);
  await checkAndTriggerPayout(circle_id);
  res.json({ success: true, data: null, message: 'Payout check triggered — check server logs' });
}
