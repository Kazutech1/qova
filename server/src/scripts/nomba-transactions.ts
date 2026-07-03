import 'dotenv/config';

const BASE_URL   = process.env.NOMBA_BASE_URL   ?? 'https://api.nomba.com';
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? '';

// Optional: how many to show (default 25), and how many days back (default 60)
const LIMIT     = Number(process.argv[2] ?? 25);
const DAYS_BACK = Number(process.argv[3] ?? 60);

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

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 19); // yyyy-MM-ddTHH:mm:ss (UTC)
}

function pick(obj: Record<string, any>, ...keys: string[]) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

async function main() {
  if (!ACCOUNT_ID) {
    console.error('NOMBA_ACCOUNT_ID is not set in .env');
    process.exit(1);
  }

  console.log(`\nConnecting to Nomba (${BASE_URL})...`);
  const token = await getToken();
  console.log('Authenticated ✓');

  const now  = new Date();
  const from = new Date(now.getTime() - DAYS_BACK * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    limit: String(LIMIT),
    dateFrom: fmtDate(from),
    dateTo: fmtDate(now),
  });

  const url = `${BASE_URL}/v1/transactions/accounts?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      accountId: ACCOUNT_ID,
      'Content-Type': 'application/json',
    },
  });

  const json = await res.json() as {
    code?: string;
    description?: string;
    data?: { results?: Record<string, any>[]; items?: Record<string, any>[]; cursor?: string };
  };

  if (res.status !== 200) {
    console.log(`\nRequest failed (${res.status}): ${JSON.stringify(json)}\n`);
    return;
  }

  const txns = json.data?.results ?? json.data?.items ?? [];

  console.log('\n' + '═'.repeat(72));
  console.log(`  NOMBA TRANSACTIONS  (last ${DAYS_BACK} days, up to ${LIMIT})`);
  console.log('═'.repeat(72));

  if (txns.length === 0) {
    console.log('\n  No transactions found in this window.');
    console.log(`  Raw response: ${JSON.stringify(json)}\n`);
    return;
  }

  console.log('');
  let credits = 0;
  let debits  = 0;

  for (const t of txns) {
    const amount  = Number(pick(t, 'amount', 'transactionAmount', 'value') ?? 0);
    const type    = String(pick(t, 'type', 'transactionType', 'source') ?? '—');
    const status  = String(pick(t, 'status', 'transactionStatus') ?? '—');
    const ref     = String(pick(t, 'reference', 'transactionId', 'id', 'transactionReference') ?? '—');
    const date    = String(pick(t, 'timeCreated', 'time', 'createdAt', 'date') ?? '—');
    const message = String(pick(t, 'narration', 'gatewayMessage', 'description', 'message') ?? '');

    // Direction: use Nomba's authoritative entryType (CREDIT = money in, DEBIT = out)
    const entryType = String(pick(t, 'entryType') ?? '').toUpperCase();
    const isCredit  = entryType === 'CREDIT';

    // Only count successful transactions toward totals
    const ok = /^success/i.test(status) || status === 'PAYMENT_SUCCESSFUL';
    if (ok) { if (isCredit) credits += amount; else debits += amount; }

    console.log(`  ${date}  ${isCredit ? '↓ IN ' : '↑ OUT'}  ${naira(amount).padEnd(14)}  ${status.padEnd(16)}  ${type}`);
    if (message) console.log(`     ${message}`);
    console.log(`     ref: ${ref}`);
  }

  console.log('─'.repeat(72));
  console.log(`  Shown: ${txns.length}  |  In (success): ${naira(credits)}  |  Out (success): ${naira(debits)}`);
  if (json.data?.cursor) console.log(`  More available — next cursor: ${json.data.cursor}`);
  console.log('═'.repeat(72) + '\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
