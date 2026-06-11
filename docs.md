# Nomba API Integration Reference & Setup Guide

This document is compiled from the official Nomba Developer documentation ([Welcome to Nomba](https://developer.nomba.com/docs/introduction/welcome-to-nomba)). It summarizes the prerequisites, environments, core concepts, and product requirements needed to integrate Nomba's payment infrastructure into **Qova**.

---

## 1. Credentials Checklist (What We Need to Get Started)

For sandbox prototyping, **no sign-up, no client credentials, no bearer tokens, and no accountId are required.** We can start testing API calls instantly. 

For full environment deployment and production execution, we must register a merchant account on the [Nomba Dashboard](https://nomba.com) and retrieve the following credentials from the **Developer → API Keys** section:

1. **`accountId`**: A unique UUID identifying our parent merchant account. This must be passed in the headers of **every** live/verified API request.
2. **`clientId`**: Used as the username in the OAuth2 client credentials token generation.
3. **`clientSecret`**: Used as the password to verify token requests. Keep this secret and secure.
4. **`Webhook Signature Key`**: Configured in the dashboard to verify the authenticity of webhook payloads sent to our server.

---

## 2. API Environments & Instant Testing

Nomba provides two distinct environments, alongside an instant-testing mechanism:

| Environment | Base URL | Usage | Credentials Needed |
| :--- | :--- | :--- | :--- |
| **Instant Sandbox** | `https://sandbox.nomba.com` | Instant testing without sign-up. | None (omit `Authorization` and `accountId` headers) |
| **Merchant Sandbox** | `https://sandbox.nomba.com` | Full sandbox simulation using merchant credentials. | Sandbox Client Keys |
| **Production** | `https://api.nomba.com` | Live monetary transactions. Requires completed business verification. | Production Client Keys |

### 🚀 Instant Sandbox Testing (No Account Required)
Nomba enables developers to test key product APIs (**Transfers, Virtual Accounts, and Checkout**) instantly without registration.
* **How to test via Curl / Code:** Simply send requests to the Sandbox Base URL (`https://sandbox.nomba.com`) and **omit** the `Authorization` (Bearer token) and `accountId` headers. The sandbox will dynamically process inputs and return valid mock responses.
* **How to test via Docs:** Navigate to the Nomba API Reference, choose an endpoint (like *Create Virtual Account* or *Create Checkout Order*), click **"Try it"**, select **"Sandbox"** from the base URL dropdown, leave all auth/accountId fields blank, and click **Send**.

---

## 3. KYB (Know Your Business) Verification

To transition from Sandbox to Production and begin moving real money (collecting contributions and sending bank payouts), Nomba requires Know Your Business verification based on our corporate registration status.

### Supported Business Categories & Requirements:
* **Private or Public Limited Company (LTD/PLC)**
* **Business Name**
* **Registered Partnership**
* **Incorporated Trustees**

### Primary Documents Required:
1. **Certificate of Incorporation** (issued by the Corporate Affairs Commission - CAC in Nigeria).
2. **Corporate Profile/Documents** (e.g. CAC Status Report, Form CAC 1.1 or equivalent showing directors and shareholding).
3. **Director Verification Details** (Bank Verification Number - BVN, valid government-issued ID card like NIN, Voter Card, or Passport).
4. **Business Information** (Physical address, contact email, and estimated monthly revenue/volume).

Verification is completed in two key review cycles: **Pre-Approval** (enabling collection limits) and **Post-Approval** (enabling full payouts and higher limits).

---

## 4. API Core Concepts & Integration Rules

### A. Authentication Flow
Nomba uses OAuth2 bearer tokens. Access tokens typically expire after **30 minutes (1800 seconds)**. 

1. **Token Issuance:** Call `POST /v1/auth/token/issue` to obtain the first token pair.
2. **Token Refreshing:** Instead of repeatedly calling the token issuance endpoint from scratch, use the `refresh_token` via `/v1/auth/token/refresh` to fetch a new `access_token` when it expires.
3. **Headers Required for All API Calls:**
   ```http
   Authorization: Bearer <access_token>
   accountId: <parent_account_id>
   Content-Type: application/json
   ```

### B. Rate Limiting
Nomba enforces a **Fixed Window Rate Limit Strategy** to maintain platform stability.
* **Monitoring headers** returned in every response:
  * `X-Rate-Limit-Limit`: Maximum requests permitted in the window.
  * `X-Rate-Limit-Remaining`: Number of requests left for the current window.
  * `X-Rate-Limit-Window`: The duration/reset cycle of the rate limit window in milliseconds.
* **Special limits:** Bank Transfer endpoints enforce strict rate-limiting. For example, you can perform a maximum of **5 bank transfers to the same recipient account per minute**. The backend must queue payouts if multiple retries or rapid payouts occur.

### C. Pagination
All list-fetching endpoints (such as transaction listings and virtual account queries) return paginated data.
* Nomba uses **limit-based** and **cursor-based** pagination parameters.
* Make sure to pass the `limit` query parameter (e.g. `?limit=20`) to regulate response sizes.

### D. Webhooks & Verification
Webhooks are essential for verifying payment completion asynchronously.
* **Configuration:** Input the server webhook URL (e.g. `https://api.qova.app/contributions/verify`) and choose event types in the Nomba Dashboard.
* **Events to Subscribe:**
  * `payment_success`: Fires when a user completes a Checkout payment or transfers money to a Dynamic Virtual Account.
  * `payment_failed`: Fires when checkout payment fails.
  * `payout_success`: Fires when an automated pot payout transfer completes successfully.
  * `payout_failed`: Fires if a pot transfer fails at the recipient's bank.
* **Verification Rule:** Never rely solely on webhooks to grant value. Always query Nomba's single transaction lookup endpoint (`GET /v1/transactions/accounts/single` or using the order/transfer reference) from our backend to verify the transaction status before updating database states.
* **Webhook Debugging:** The Nomba Dashboard provides logs to inspect delivery payloads and manually trigger retries for failed callbacks. Programmatic queries are supported via `/v1/webhooks/event-logs`.

---

## 5. Qova Implementation Requirements (Product Matrix)

| Nomba Product API | Qova Backend Use Case | Sandbox Integration Endpoint |
| :--- | :--- | :--- |
| **Nomba Checkout** | Individual contribution payments via debit cards, bank transfers, or USSD codes. | `POST /v1/checkout/order` |
| **Virtual Accounts** | Creating cycle-specific dynamic virtual bank accounts to allow direct bank transfer contributions. | `POST /v1/accounts/virtual` |
| **Transfers API** | Automatic distribution of the cycle's collected pot to the slot recipient. | `POST /v2/transfers/bank` |
| **Account Lookup** | Validating members' bank details before they join a circle or receive payouts. | `POST /v1/transfers/bank/lookup` |
