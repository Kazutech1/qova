import 'dotenv/config';

const BASE_URL = process.env.NOMBA_BASE_URL ?? 'https://sandbox.nomba.com';
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? '';

async function token(): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: ACCOUNT_ID },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const j = await res.json();
  return j.data.access_token;
}

async function main() {
  console.log('BASE_URL:', BASE_URL);
  const t = await token();

  const now = new Date();
  const end = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const body = {
    customerAccountNumber: '8157012422',
    bankCode: '305',
    customerName: 'CHIBUIKE EMMANUEL UMEH',
    customerAccountName: 'CHIBUIKE EMMANUEL UMEH',
    amount: 1000,
    frequency: 'WEEKLY',
    merchantReference: `qova-mandate-debug-${Date.now()}`,
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    customerEmail: '2349000000099@qova.ng',
    customerPhoneNumber: '08073345562',
    customerAddress: 'Lagos, Nigeria',
    narration: 'Qova auto-debit debug',
  };

  console.log('\n── POST /v1/direct-debits ──');
  console.log('BODY:', JSON.stringify(body, null, 2));
  const res = await fetch(`${BASE_URL}/v1/direct-debits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t}`,
      accountId: ACCOUNT_ID,
    },
    body: JSON.stringify(body),
  });
  console.log('HTTP status:', res.status);
  const text = await res.text();
  console.log('RAW RESPONSE:', text);
}

main().catch(console.error);
