import prisma from '../utils/prisma';
import { checkAndTriggerPayout } from './payout';

// Sweeps all active circles and triggers payout for any where all members have paid
export async function runPayoutSweep() {
  const activeCircles = await prisma.circle.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  if (activeCircles.length === 0) return;

  console.log(`[Cron] Payout sweep — checking ${activeCircles.length} active circle(s)...`);
  for (const circle of activeCircles) {
    await checkAndTriggerPayout(circle.id).catch(err =>
      console.error(`[Cron] Payout sweep failed for ${circle.name}:`, err.message)
    );
  }
}

// Runs daily — marks overdue contributions LATE and deducts 1 reliability point per day overdue
export async function runDailyContributionCheck() {
  const now = new Date();

  const overdue = await prisma.contribution.findMany({
    where: {
      status: { in: ['PENDING', 'LATE'] },
      due_date: { lt: now },
    },
    include: { user: true },
  });

  if (overdue.length === 0) return;

  console.log(`[Cron] Processing ${overdue.length} overdue contribution(s)...`);

  for (const contribution of overdue) {
    // Mark LATE
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'LATE' },
    });

    // Deduct 1 point per day, floor at 0
    const newScore = Math.max(0, contribution.user.reliability_score - 1);
    await prisma.user.update({
      where: { id: contribution.user_id },
      data: { reliability_score: newScore },
    });

    console.log(`[Cron]  -1 point → ${contribution.user.name} (score: ${newScore})`);
  }
}
