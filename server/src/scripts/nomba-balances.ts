import 'dotenv/config';

const BASE_URL   = process.env.NOMBA_BASE_URL   ?? 'https://api.nomba.com';
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? '';

function naira(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
}

async function getToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accountId: ACCOUNT_ID },
    body: JSON.stringify({
      grant_type:    'client_credentials',
      client_id:     process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });
  const json = await res.json() as { data?: { access_token: string } };
  const token = json?.data?.access_token;
  if (!token) throw new Error(`Auth failed: ${JSON.stringify(json)}`);
  return token;
}

async function main() {
  if (!ACCOUNT_ID) {
    console.error('NOMBA_ACCOUNT_ID is not set in .env');
    process.exit(1);
  }

  console.log(`\nConnecting to Nomba (${BASE_URL})...`);
  const token = await getToken();
  console.log('Authenticated ✓');

  // Fetch parent (main) wallet balance — /v1/accounts/balance
  const res = await fetch(`${BASE_URL}/v1/accounts/balance`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accountId: ACCOUNT_ID,
      'Content-Type': 'application/json',
    },
  });

  const json = await res.json() as {
    code?: string;
    description?: string;
    data?: { amount?: string; currency?: string; timeCreated?: string };
  };

  console.log('\n' + '═'.repeat(50));
  console.log('  NOMBA MAIN WALLET');
  console.log('═'.repeat(50));

  if (res.status === 200 && json.data?.amount != null) {
    const balanceNaira = Number(json.data.amount);
    console.log(`  Balance    : ${naira(balanceNaira)}`);
    console.log(`  In kobo    : ${Math.round(balanceNaira * 100).toLocaleString()}`);
    console.log(`  Currency   : ${json.data.currency ?? 'NGN'}`);
    console.log(`  As of      : ${json.data.timeCreated ?? '—'}`);
  } else {
    console.log(`  Failed (${res.status}): ${JSON.stringify(json)}`);
  }

  console.log('═'.repeat(50) + '\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
