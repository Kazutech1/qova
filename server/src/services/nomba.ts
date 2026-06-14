const BASE_URL = process.env.NOMBA_BASE_URL ?? 'https://sandbox.nomba.com';

async function fetchJsonGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const json = await res.json() as T;
  if (!res.ok) throw new Error(`Nomba error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function fetchJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetchJson<{ success: boolean; data: Record<string, string> }>(
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
}

export async function lookupBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<BankLookupResult> {
  const res = await fetchJson<{ success: boolean; data: BankLookupResult }>(
    '/v1/transfers/bank/lookup',
    { accountNumber, bankCode }
  );
  return res.data;
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
  const res = await fetchJson<{ success: boolean; data: Record<string, string> }>(
    '/v1/accounts/virtual',
    params
  );
  console.log('\n[Nomba] ===== VIRTUAL ACCOUNT RAW RESPONSE =====');
  console.log(JSON.stringify(res.data, null, 2));
  console.log('[Nomba] =============================================\n');
  const d = res.data;
  return {
    accountNumber: d.bankAccountNumber ?? d.accountNumber ?? d.account_number ?? '',
    accountName: d.bankAccountName ?? d.accountName ?? d.account_name ?? '',
    bankName: d.bankName ?? d.bank_name ?? '',
    accountRef: d.accountRef ?? d.account_ref ?? params.accountRef,
    expiryDate: d.expiryDate ?? d.expiry_date ?? params.expiryDate,
  };
}
