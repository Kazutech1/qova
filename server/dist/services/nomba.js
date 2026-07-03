"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankTransfer = bankTransfer;
exports.lookupBankAccount = lookupBankAccount;
exports.createVirtualAccount = createVirtualAccount;
exports.getBanks = getBanks;
exports.getTransaction = getTransaction;
const BASE_URL = process.env.NOMBA_BASE_URL ?? 'https://sandbox.nomba.com';
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID ?? '';
let cachedToken = null;
async function getAccessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt)
        return cachedToken.value;
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
    const json = await res.json();
    if (!res.ok || json.code !== '00') {
        throw new Error(`Nomba auth failed: ${JSON.stringify(json)}`);
    }
    // expiresAt is ISO 8601; subtract 60 s to avoid using a token right at expiry
    const expiresAt = new Date(json.data.expiresAt).getTime() - 60000;
    cachedToken = { value: json.data.access_token, expiresAt };
    return cachedToken.value;
}
// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function authHeaders() {
    const token = await getAccessToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'accountId': ACCOUNT_ID,
    };
}
async function fetchJsonGet(path) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: await authHeaders(),
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(`Nomba error ${res.status}: ${JSON.stringify(json)}`);
    return json;
}
async function fetchJson(path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(`Nomba error ${res.status}: ${JSON.stringify(json)}`);
    return json;
}
async function bankTransfer(params) {
    const res = await fetchJson('/v2/transfers/bank', {
        amount: params.amount / 100, // Nomba transfers use naira
        accountNumber: params.accountNumber,
        accountName: params.accountName,
        bankCode: params.bankCode,
        merchantTxRef: params.merchantTxRef,
        senderName: 'Qova Savings',
        narration: params.narration,
    });
    const d = res.data;
    return {
        transferReference: d.transferReference ?? d.transfer_reference ?? params.merchantTxRef,
        status: d.status ?? 'PENDING',
    };
}
async function lookupBankAccount(accountNumber, bankCode) {
    const res = await fetchJson('/v1/transfers/bank/lookup', { accountNumber, bankCode });
    const d = res.data;
    return {
        accountName: d.accountName ?? d.account_name ?? '',
        accountNumber: d.accountNumber ?? d.account_number ?? accountNumber,
        bankCode: d.bankCode ?? d.bank_code ?? bankCode,
        bankName: d.bankName ?? d.bank_name ?? '',
    };
}
async function createVirtualAccount(params) {
    const res = await fetchJson('/v1/accounts/virtual', params);
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
let banksCache = null;
const BANKS_TTL_MS = 24 * 60 * 60 * 1000;
async function getBanks() {
    if (banksCache && Date.now() - banksCache.fetchedAt < BANKS_TTL_MS) {
        return banksCache.results;
    }
    const res = await fetchJsonGet('/v1/transfers/banks');
    // Nomba may return data as a direct array or as { results: [...] }
    const results = Array.isArray(res.data)
        ? res.data
        : (res.data?.results ?? []);
    banksCache = { results, fetchedAt: Date.now() };
    return results;
}
async function getTransaction(reference) {
    const res = await fetchJsonGet(`/v1/transactions/accounts/single?reference=${encodeURIComponent(reference)}`);
    const d = res.data;
    return {
        reference: String(d.reference ?? d.transactionReference ?? reference),
        status: String(d.status ?? 'UNKNOWN'),
        amount: Number(d.amount ?? 0) * 100, // convert naira back to kobo
        narration: String(d.narration ?? ''),
    };
}
//# sourceMappingURL=nomba.js.map