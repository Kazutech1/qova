const BASE_URL = process.env.NOMBA_BASE_URL ?? 'https://sandbox.nomba.com';
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? '';

// ─── Auth / Token ─────────────────────────────────────────────────────────────

interface TokenCache {
  value: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accountId': ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID,
      client_secret: process.env.NOMBA_CLIENT_SECRET,
    }),
  });

  const json = await res.json() as {
    code: string;
    description: string;
    data: { access_token: string; refresh_token: string; expiresAt: string };
  };

  if (!res.ok || json.code !== '00') {
    throw new Error(`Nomba auth failed: ${JSON.stringify(json)}`);
  }

  // expiresAt is ISO 8601; subtract 60 s to avoid using a token right at expiry
  const expiresAt = new Date(json.data.expiresAt).getTime() - 60_000;

  cachedToken = { value: json.data.access_token, expiresAt };

  return cachedToken.value;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'accountId': ACCOUNT_ID,
  };
}

async function fetchJsonGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  const json = await res.json() as T;
  if (!res.ok) throw new Error(`Nomba error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function fetchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json() as T;
  if (!res.ok) throw new Error(`Nomba error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

// ─── Bank Transfer ────────────────────────────────────────────────────────────

export interface BankTransferResult {
  transferReference: string;
  status: string;
}

export async function bankTransfer(params: {
  amount: number;        // in kobo
  accountNumber: string;
  accountName: string;
  bankCode: string;
  merchantTxRef: string;
  narration: string;
}): Promise<BankTransferResult> {
  const res = await fetchJson<{ code: string; data: Record<string, string> }>(
    '/v2/transfers/bank',
    {
      amount: params.amount / 100, // Nomba transfers use naira
      accountNumber: params.accountNumber,
      accountName: params.accountName,
      bankCode: params.bankCode,
      merchantTxRef: params.merchantTxRef,
      senderName: 'Qova Savings',
      narration: params.narration,
    }
  );
  const d = res.data;
  return {
    transferReference: d.transferReference ?? d.transfer_reference ?? params.merchantTxRef,
    status: d.status ?? 'PENDING',
  };
}

// ─── Bank Lookup ──────────────────────────────────────────────────────────────

export interface BankLookupResult {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

export async function lookupBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<BankLookupResult> {
  const res = await fetchJson<{ code: string; data: Record<string, string> }>(
    '/v1/transfers/bank/lookup',
    { accountNumber, bankCode }
  );
  const d = res.data;
  return {
    accountName: d.accountName ?? d.account_name ?? '',
    accountNumber: d.accountNumber ?? d.account_number ?? accountNumber,
    bankCode: d.bankCode ?? d.bank_code ?? bankCode,
    bankName: d.bankName ?? d.bank_name ?? '',
  };
}

// ─── Dynamic Virtual Account ──────────────────────────────────────────────────

export interface VirtualAccountResult {
  accountNumber: string;
  accountName: string;
  bankName: string;
  accountRef: string;
  expiryDate: string;
}

export async function createVirtualAccount(params: {
  accountRef: string;
  accountName: string;
  expiryDate: string;
  expectedAmount: string;
}): Promise<VirtualAccountResult> {
  const res = await fetchJson<{ code: string; description?: string; data: Record<string, string> }>(
    '/v1/accounts/virtual',
    params
  );

  if (!res.data) {
    throw new Error(`Nomba virtual account error (code ${res.code}): ${res.description ?? 'no data returned'}`);
  }

  const d = res.data;
  return {
    accountNumber: d.bankAccountNumber ?? d.accountNumber ?? d.account_number ?? '',
    accountName: d.bankAccountName ?? d.accountName ?? d.account_name ?? '',
    bankName: d.bankName ?? d.bank_name ?? '',
    accountRef: d.accountRef ?? d.account_ref ?? params.accountRef,
    expiryDate: d.expiryDate ?? d.expiry_date ?? params.expiryDate,
  };
}

// ─── Banks List ───────────────────────────────────────────────────────────────

export interface Bank {
  code: string;
  name: string;
}

let banksCache: { results: Bank[]; fetchedAt: number } | null = null;
const BANKS_TTL_MS = 24 * 60 * 60 * 1000;

export async function getBanks(): Promise<Bank[]> {
  if (banksCache && Date.now() - banksCache.fetchedAt < BANKS_TTL_MS) {
    return banksCache.results;
  }
  const res = await fetchJsonGet<{ code: string; data: unknown }>(
    '/v1/transfers/banks'
  );
  // Nomba may return data as a direct array or as { results: [...] }
  const results: Bank[] = Array.isArray(res.data)
    ? (res.data as Bank[])
    : ((res.data as { results: Bank[] })?.results ?? []);
  banksCache = { results, fetchedAt: Date.now() };
  return results;
}

// ─── Transaction Lookup ───────────────────────────────────────────────────────

export interface TransactionResult {
  reference: string;
  status: string;
  amount: number;  // in kobo
  narration: string;
}

export async function getTransaction(reference: string): Promise<TransactionResult> {
  const res = await fetchJsonGet<{ code: string; data: Record<string, string | number> }>(
    `/v1/transactions/accounts/single?reference=${encodeURIComponent(reference)}`
  );
  const d = res.data;
  return {
    reference: String(d.reference ?? d.transactionReference ?? reference),
    status: String(d.status ?? 'UNKNOWN'),
    amount: Number(d.amount ?? 0) * 100, // convert naira back to kobo
    narration: String(d.narration ?? ''),
  };
}
