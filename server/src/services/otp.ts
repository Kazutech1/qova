import prisma from '../utils/prisma';
import { sendWhatsAppMessage } from './whatsapp';

const OTP_TTL_MINUTES = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string) {
  const code = generateCode();
  const expires_at = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.oTP.create({ data: { phone, code, expires_at } });

  await sendWhatsAppMessage(phone, `Your Qova verification code is *${code}*. It expires in ${OTP_TTL_MINUTES} minutes.`);
}

export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const record = await prisma.oTP.findFirst({
    where: {
      phone,
      code,
      used: false,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: 'desc' },
  });

  if (!record) return false;

  await prisma.oTP.update({ where: { id: record.id }, data: { used: true } });
  return true;
}
