import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { sendOTP, verifyOTP } from '../services/otp';
import { lookupBankAccount, getBanks } from '../services/nomba';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const sendOtpSchema = z.object({ phone: z.string().min(10) });
const verifyOtpSchema = z.object({ phone: z.string().min(10), code: z.string().length(6) });
const completeProfileSchema = z.object({
  bank_account_number: z.string().min(10).max(10),
  bank_code: z.string().min(3),
});

export async function sendOtpHandler(req: Request, res: Response) {
  const { phone } = sendOtpSchema.parse(req.body);
  await sendOTP(phone);
  res.json({ success: true, data: null, message: 'OTP sent via WhatsApp' });
}

export async function verifyOtpHandler(req: Request, res: Response) {
  const { phone, code } = verifyOtpSchema.parse(req.body);

  const valid = await verifyOTP(phone, code);
  if (!valid) throw new AppError('Invalid or expired OTP', 400);

  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone, name: '', reliability_score: 50 },
    update: {},
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

  res.json({
    success: true,
    data: { token, user: { id: user.id, phone: user.phone, name: user.name } },
    message: 'Verified successfully',
  });
}

export async function completeProfileHandler(req: AuthRequest, res: Response) {
  const { bank_account_number, bank_code } = completeProfileSchema.parse(req.body);

  let lookup;
  try {
    lookup = await lookupBankAccount(bank_account_number, bank_code);
  } catch {
    return res.status(400).json({ success: false, data: null, message: 'Bank account not found. Please check your account number and bank.' });
  }

  // Nomba lookup doesn't always return bankName — fall back to the banks list
  let bankName = lookup.bankName;
  if (!bankName) {
    const banks = await getBanks();
    bankName = banks.find(b => b.code === bank_code)?.name ?? '';
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: lookup.accountName,
      bank_account_number,
      bank_code,
      bank_name: bankName,
    },
  });

  res.json({
    success: true,
    data: { user: { id: user.id, phone: user.phone, name: user.name, bank_account_number: user.bank_account_number, bank_name: user.bank_name } },
    message: 'Profile completed',
  });
}
