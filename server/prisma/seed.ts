import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const users = [
  { phone: '2348011111111', name: 'Emeka Okafor' },
  { phone: '2348022222222', name: 'Amaka Nwosu' },
  { phone: '2348033333333', name: 'Tunde Balogun' },
  { phone: '2348044444444', name: 'Ngozi Eze' },
  { phone: '2348055555555', name: 'Chidi Obiora' },
  { phone: '2348066666666', name: 'Fatima Aliyu' },
  { phone: '2348077777777', name: 'Seun Adeyemi' },
  { phone: '2348088888888', name: 'Blessing Okonkwo' },
  { phone: '2348099999999', name: 'Uche Nnamdi' },
  { phone: '2348100000000', name: 'Kemi Fashola' },
];

async function main() {
  console.log('Seeding users...');

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      create: { phone: u.phone, name: u.name },
      update: { name: u.name },
    });

    // Pre-set OTP 123456 valid for 1 hour so you can log in without WhatsApp
    await prisma.oTP.deleteMany({ where: { phone: u.phone } });
    await prisma.oTP.create({
      data: {
        phone: u.phone,
        code: '123456',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    console.log(`  ✓ ${u.name} — ${u.phone}`);
  }

  console.log('\nDone. Log in with any number above using OTP: 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
