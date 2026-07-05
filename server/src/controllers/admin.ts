import { Request, Response } from 'express';
import { getSubaccounts, getMasterBalance } from '../services/nomba';

// Temporary — inspect raw Nomba responses
async function fetchRawAccounts() {
  const BASE_URL = process.env.NOMBA_BASE_URL ?? 'https://sandbox.nomba.com';
  const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? '';

  const authRes = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: ACCOUNT_ID },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const authJson = await authRes.json() as { data?: { access_token: string } };
  const token = authJson?.data?.access_token ?? '';
  const headers = { Authorization: `Bearer ${token}`, accountId: ACCOUNT_ID, 'Content-Type': 'application/json' };

  const [listRes, mainRes] = await Promise.all([
    fetch(`${BASE_URL}/v1/accounts`, { headers }).then(r => r.json()),
    fetch(`${BASE_URL}/v1/accounts/${ACCOUNT_ID}`, { headers }).then(r => r.json()).catch((e: Error) => ({ error: e.message })),
  ]);

  return { accountId: ACCOUNT_ID, list: listRes, main: mainRes };
}

export async function debugAccountsHandler(_req: Request, res: Response) {
  const raw = await fetchRawAccounts();
  res.json({ success: true, raw });
}

export async function getSubaccountsHandler(_req: Request, res: Response) {
  const [master_wallet, subaccounts] = await Promise.all([getMasterBalance(), getSubaccounts()]);

  const totalKobo = subaccounts.reduce((sum, a) => sum + a.balanceKobo, 0);

  res.json({
    success: true,
    data: {
      master_wallet,
      subaccounts,
      summary: {
        count:        subaccounts.length,
        totalKobo,
        totalNaira:   (totalKobo / 100).toFixed(2),
        currency:     'NGN',
      },
    },
    message: `${subaccounts.length} sub-account(s) retrieved`,
  });
}
