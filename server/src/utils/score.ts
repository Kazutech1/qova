import prisma from './prisma';

export async function bumpScore(userId: string, delta: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { reliability_score: true } });
  if (!user) return;
  const clamped = Math.min(100, Math.max(0, user.reliability_score + delta));
  await prisma.user.update({ where: { id: userId }, data: { reliability_score: clamped } });
}
