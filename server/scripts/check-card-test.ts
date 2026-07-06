import 'dotenv/config';
import prisma from '../src/utils/prisma';

async function main() {
  const circle = await prisma.circle.findUnique({ where: { invite_code: 'HACK-2026-01' } });
  if (!circle) { console.log('demo circle missing'); return; }
  console.log(`Circle: ${circle.name} · cycle ${circle.current_cycle} · ${circle.status} · ₦${circle.contribution_amount / 100}/cycle`);

  const user = await prisma.user.findUnique({ where: { phone: '+2348140105621' } });
  if (!user) { console.log('user not found'); return; }

  const contrib = await prisma.contribution.findFirst({
    where: { circle_id: circle.id, user_id: user.id, cycle_number: circle.current_cycle },
  });
  console.log(`Your cycle-${circle.current_cycle} contribution: ${contrib?.status ?? 'not created yet'}`);

  const auth = await prisma.cardAuthorization.findUnique({
    where: { user_id_circle_id: { user_id: user.id, circle_id: circle.id } },
  });
  console.log(`Card authorization: ${auth ? `${auth.status} · order ${auth.order_reference} · token ${auth.token_key ?? '—'} · ${auth.card_type ?? ''} ${auth.card_pan_masked ?? ''}` : 'none yet'}`);

  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
