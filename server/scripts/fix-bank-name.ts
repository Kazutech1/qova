import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { getBanks } from '../src/services/nomba';

async function main() {
  const all = await prisma.user.findMany({
    where: { bank_account_number: { not: null } },
    select: { id: true, bank_code: true, bank_name: true },
  });

  const needsFix = all.filter(u => !u.bank_name && u.bank_code);
  console.log(`${needsFix.length} user(s) need bank_name fix.`);
  if (needsFix.length === 0) { await prisma.$disconnect(); return; }

  const banks = await getBanks();

  for (const user of needsFix) {
    const bankName = banks.find(b => b.code === user.bank_code)?.name ?? '';
    await prisma.user.update({ where: { id: user.id }, data: { bank_name: bankName } });
    console.log(`✓ ${user.id} → "${bankName}"`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
