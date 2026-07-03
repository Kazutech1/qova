import crypto from 'crypto';

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

async function fetchJsonPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
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

// ─── Subaccount Balances ──────────────────────────────────────────────────────

export interface SubaccountBalance {
  accountId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balanceKobo: number;
  balanceNaira: string;
  currency: string;
}

function normaliseAccount(a: Record<string, string | number>): SubaccountBalance {
  const rawBalance  = Number(a.balance ?? a.availableBalance ?? a.available_balance ?? 0);
  const balanceKobo = Math.round(rawBalance * 100);
  return {
    accountId:     String(a.accountId      ?? a.account_id      ?? ACCOUNT_ID),
    accountName:   String(a.accountName    ?? a.account_name    ?? ''),
    accountNumber: String(a.accountNumber  ?? a.account_number  ?? ''),
    bankName:      String(a.bankName       ?? a.bank_name       ?? ''),
    balanceKobo,
    balanceNaira:  (balanceKobo / 100).toFixed(2),
    currency:      String(a.currency ?? 'NGN'),
  };
}

export async function getSubaccounts(): Promise<SubaccountBalance[]> {
  // Fetch subaccounts list + main account balance in parallel
  const [listRes, mainRes] = await Promise.all([
    fetchJsonGet<{ code: string; data: { results?: Record<string, string | number>[] } }>('/v1/accounts'),
    fetchJsonGet<{ code: string; data: Record<string, string | number> }>(`/v1/accounts/${ACCOUNT_ID}`).catch(() => null),
  ]);

  const subaccounts = (listRes.data?.results ?? []).map(normaliseAccount);

  // Prepend main account if it returned balance data and isn't already in the list
  if (mainRes?.data && !subaccounts.find(a => a.accountId === ACCOUNT_ID)) {
    subaccounts.unshift(normaliseAccount({ ...mainRes.data, accountId: ACCOUNT_ID }));
  }

  return subaccounts;
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

// ─── Direct Debit Mandates ────────────────────────────────────────────────────

// Maps our Circle.frequency to Nomba's mandate frequency enum
const FREQUENCY_MAP: Record<string, string> = {
  WEEKLY:   'WEEKLY',
  BIWEEKLY: 'EVERY_TWO_WEEKS',
  MONTHLY:  'MONTHLY',
};

export function toNombaFrequency(circleFrequency: string): string {
  return FREQUENCY_MAP[circleFrequency] ?? 'MONTHLY';
}

export type MandateStatusValue =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'FAILED'
  | 'REVOKED'
  | 'EXPIRED';

// Normalize Nomba's free-form mandateStatus string (e.g. "Active") to our enum
function normalizeMandateStatus(raw: string): MandateStatusValue {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('active')) return 'ACTIVE';
  if (s.includes('suspend')) return 'SUSPENDED';
  if (s.includes('delete') || s.includes('revok')) return 'REVOKED';
  if (s.includes('expire')) return 'EXPIRED';
  if (s.includes('reject') || s.includes('fail')) return 'FAILED';
  return 'PENDING_ACTIVATION';
}

export interface CreateMandateResult {
  mandateId: string;
  merchantReference: string;
  activationNote: string;
}

export async function createDirectDebitMandate(params: {
  customerAccountNumber: string;
  bankCode: string;
  customerName: string;
  customerAccountName: string;
  amount: number;            // kobo
  frequency: string;         // Circle.frequency
  merchantReference: string;
  startDate: string;         // ISO date-time
  endDate: string;           // ISO date-time
  customerEmail: string;
  customerPhoneNumber?: string;
  customerAddress?: string;
  narration?: string;
}): Promise<CreateMandateResult> {
  const res = await fetchJson<{ responseCode?: string; code?: string; description?: string; data: Record<string, string> }>(
    '/v1/direct-debits',
    {
      customerAccountNumber: params.customerAccountNumber,
      bankCode:              params.bankCode,
      customerName:          params.customerName,
      customerAccountName:   params.customerAccountName,
      amount:                params.amount / 100, // Nomba uses naira
      frequency:             toNombaFrequency(params.frequency),
      merchantReference:     params.merchantReference,
      startDate:             params.startDate,
      endDate:               params.endDate,
      customerEmail:         params.customerEmail,
      customerPhoneNumber:   params.customerPhoneNumber,
      customerAddress:       params.customerAddress || 'Nigeria', // Nomba requires non-blank
      narration:             params.narration ?? 'Qova Ajo auto-debit mandate',
    }
  );

  if (!res.data) {
    throw new Error(`Nomba mandate create error (code ${res.responseCode ?? res.code}): ${res.description ?? 'no data returned'}`);
  }

  const d = res.data;
  return {
    mandateId:         d.mandateId ?? d.mandate_id ?? '',
    merchantReference: d.merchantReference ?? params.merchantReference,
    activationNote:    d.description ?? '',
  };
}

export interface DebitMandateResult {
  code: string;
  status: string;
  message: string;
}

export async function debitMandate(mandateId: string, amountKobo: number): Promise<DebitMandateResult> {
  const res = await fetchJson<{ code: string; description?: string; data: Record<string, string> }>(
    '/v1/direct-debits/debit-mandate',
    {
      mandateId,
      amount: (amountKobo / 100).toFixed(2), // naira string
    }
  );
  const d = res.data ?? {};
  return {
    code:    res.code ?? '',
    status:  d.status ?? 'UNKNOWN',
    message: d.message ?? res.description ?? '',
  };
}

export interface MandateStatusResult {
  status: MandateStatusValue;
  rawStatus: string;
  rejectionComment: string;
}

export async function getMandateStatus(mandateId: string): Promise<MandateStatusResult> {
  const res = await fetchJsonGet<{ code: string; data: Record<string, string> }>(
    `/v1/direct-debits/status?mandateId=${encodeURIComponent(mandateId)}`
  );
  const d = res.data ?? {};
  const raw = d.mandateStatus ?? '';
  return {
    status:           normalizeMandateStatus(raw),
    rawStatus:        raw,
    rejectionComment: d.rejectionComment ?? '',
  };
}

// action: SUSPEND (pause), ACTIVE (reactivate), DELETE (revoke)
export async function updateMandateStatus(
  mandateId: string,
  action: 'SUSPEND' | 'ACTIVE' | 'DELETE'
): Promise<void> {
  await fetchJsonPut('/v1/direct-debits/update-status', { mandateId, status: action });
}

// ─── Webhook Signature Verification ───────────────────────────────────────────

// Verifies the `nomba-signature` header. Nomba signs a colon-joined string of specific
// payload fields + the `nomba-timestamp` header with HMAC-SHA256 (base64) using the
// signature key configured on the dashboard.
// Docs: https://developer.nomba.com/docs/api-basics/webhook
export function verifyWebhookSignature(
  body: any,
  headers: Record<string, string | string[] | undefined>
): boolean {
  const key = process.env.NOMBA_WEBHOOK_SIGNATURE_KEY;
  if (!key) {
    console.error('[Webhook] NOMBA_WEBHOOK_SIGNATURE_KEY is not set — rejecting all webhooks');
    return false;
  }

  const signature = String(headers['nomba-signature'] ?? '');
  const timestamp = String(headers['nomba-timestamp'] ?? '');
  if (!signature || !timestamp) return false;

  const data     = body?.data ?? {};
  const tx       = data.transaction ?? {};
  const merchant = data.merchant ?? {};

  const signingString = [
    body?.event_type,
    body?.requestId,
    merchant.userId,
    merchant.walletId,
    tx.transactionId,
    tx.type,
    tx.time,
    tx.responseCode,
    timestamp,
  ].join(':');

  const computed = crypto.createHmac('sha256', key).update(signingString).digest('base64');

  // constant-time comparison (avoids leaking timing info)
  const a = Buffer.from(computed);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
