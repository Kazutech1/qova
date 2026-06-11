const BASE_URL = process.env.NOMBA_BASE_URL ?? 'https://sandbox.nomba.com';

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
