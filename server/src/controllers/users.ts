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

export async function getMyCirclesHandler(req: AuthRequest, res: Response) {
  const memberships = await prisma.membership.findMany({
    where: { user_id: req.userId },
    include: {
      circle: {
        include: {
          admin: { select: { id: true, name: true } },
          _count: { select: { memberships: true } },
        },
      },
    },
    orderBy: { joined_at: 'desc' },
  });

  const current = memberships
    .filter(m => m.circle.status === 'PENDING' || m.circle.status === 'ACTIVE')
    .map(m => ({ ...m.circle, slot_number: m.slot_number, joined_at: m.joined_at }));

  const past = memberships
    .filter(m => m.circle.status === 'COMPLETED')
    .map(m => ({ ...m.circle, slot_number: m.slot_number, joined_at: m.joined_at }));

  res.json({ success: true, data: { current, past }, message: 'Circles retrieved' });
}
