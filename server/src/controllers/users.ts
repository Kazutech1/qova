import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getMeHandler(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      name: true,
      phone: true,
      bank_account_number: true,
      bank_code: true,
      bank_name: true,
      reliability_score: true,
      bvn_verified: true,
      created_at: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);

  res.json({ success: true, data: { user }, message: 'Profile retrieved' });
}
