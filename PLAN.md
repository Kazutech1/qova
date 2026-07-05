# Qova — Auto-Debit Feature Plan

**Status:** Proposed (not yet implemented)
**Owner:** Backend
**Last updated:** 2026-07-03

This document is the implementation plan for the **Auto-Debit** feature — letting a
circle automatically collect each member's contribution when it falls due, instead of
requiring every member to manually transfer into a per-cycle virtual account.

---

## 1. Goal & Scope

**Goal:** When a contribution falls due, Qova pulls the amount from the member's bank
account automatically (no manual transfer), then runs the existing "mark PAID → bump
score → trigger payout" flow.

**In scope:**
- Bank-account **Direct Debit Mandates** via Nomba.
- Per-member mandate authorization, per-circle opt-in (admin toggle).
- A scheduled engine that debits due contributions.
- Mandate lifecycle management (create, activate, poll status, suspend/revoke).

**Out of scope (for now):**
- Tokenized-card recurring charges (see §2 — deferred, needs sandbox verification).
- Partial / variable-amount debits beyond the fixed contribution amount.
- Changing the manual virtual-account flow — it stays as the fallback.

---

## 2. Why Direct Debit (not tokenized cards)

Nomba supports **two** auto-debit mechanisms:

| Mechanism | How it works | Verdict |
| :--- | :--- | :--- |
| **Direct Debit Mandate** (bank) | Customer authorizes once (₦50 NIBSS validation transfer, up to 72h to activate). Merchant then silently debits via `mandateId` + `amount`. No OTP per charge. | ✅ **Chosen** |
| **Tokenized card** | Customer pays once via Checkout with `tokenizeCard: true`; merchant later charges the saved `tokenKey`. | ⏸️ Deferred |

**Rationale for Direct Debit:**
- Qova's entire money layer is already **bank-rail based** (virtual accounts, bank
  transfers, account lookup) — no card checkout exists yet.
- Ajo participants transact by bank transfer, not cards.
- Mandates carry a native `frequency` field that maps onto `Circle.frequency`.
- Nomba's docs do **not** confirm that tokenized-card re-charges are silent (no 3DS/OTP),
  so that path needs sandbox proof before we'd trust it for unattended collection.

**Tradeoff we accept:** Mandate activation is **not instant** — the member must send a
₦50 validation transfer and the bank can take up to 72h to activate. So the "Auto-Debit"
toggle is not "flip and it works today"; it needs a `PENDING_ACTIVATION → ACTIVE`
lifecycle, with manual virtual-account payment as the fallback until active.

---

## 3. Nomba API Reference (Direct Debit)

### 3.1 Create mandate — `POST /v1/direct-debits`
Required body: `customerAccountNumber`, `bankCode`, `customerName`,
`customerAccountName`, `amount` (number, **naira**), `frequency` (enum),
`merchantReference`, `startDate` (date-time), `endDate` (date-time), `customerEmail`.
Optional: `customerAddress`, `narration`, `customerPhoneNumber`, `startImmediately`.

Frequency enum: `VARIABLE, WEEKLY, EVERY_TWO_WEEKS, MONTHLY, EVERY_TWO_MONTHS, …,
EVERY_TWELVE_MONTHS`.

Response: `data.mandateId`, `data.merchantReference`, `data.description`.
Activation requires the member to transfer **₦50** to a NIBSS-provided account **from the
same account number** being mandated. Bank activation can take **up to 72h**.

### 3.2 Debit mandate — `POST /v1/direct-debits/debit-mandate`
Body: `mandateId` (string), `amount` (string, **naira**). `accountId` header required.
Response: `code` ("00" = success), `data.status` ("SUCCESS"), `data.amount`, `data.message`.
Only mandates in `ACTIVE` (or `ADVICE_SENT`) status can be debited.

### 3.3 Mandate status — `GET` (check-direct-debit-status)
Used to poll a `PENDING_ACTIVATION` mandate until Nomba reports it active.
Observed status values: `PENDING`, `ADVICE_SENT`, `ACTIVE`, `SUSPENDED`, `DELETED`.

### 3.4 Update status — `PUT` (update-direct-debit-status)
Suspend / reactivate / delete a mandate. Backs the member "turn off auto-debit" action.

> **Verification rule (project standard):** never grant value on a webhook alone. After a
> successful debit response, we still reconcile via transaction lookup before advancing
> circle state — same discipline as the existing payout/contribution flow.

---

## 4. Frequency Mapping

| `Circle.frequency` | Nomba mandate `frequency` | Period (days) |
| :--- | :--- | :--- |
| `WEEKLY` | `WEEKLY` | 7 |
| `BIWEEKLY` | `EVERY_TWO_WEEKS` | 14 |
| `MONTHLY` | `MONTHLY` | 30 |

- Mandate `amount` = `Circle.contribution_amount` (kobo → naira).
- Mandate `startDate` = `circle.start_date ?? now`.
- Mandate `endDate` = `startDate + (total_slots × period)` — covers the circle's full run.
- `merchantReference` = `qova-mandate-{circleId}-{userId}` (unique, idempotent).

---

## 5. Data Model Changes (`schema.prisma`)

### 5.1 New model — `DirectDebitMandate` (one per user per circle)
```prisma
model DirectDebitMandate {
  id                  String        @id @default(auto()) @map("_id") @db.ObjectId
  user_id             String        @db.ObjectId
  circle_id           String        @db.ObjectId
  nomba_mandate_id    String?       @unique
  merchant_reference  String        @unique
  status              MandateStatus @default(PENDING_ACTIVATION)
  bank_account_number String
  bank_code           String
  bank_account_name   String        // verified via lookupBankAccount
  amount              Int           // kobo — per-cycle debit amount
  frequency           String        // Nomba enum snapshot
  activation_note     String?       // ₦50 NIBSS instructions surfaced to member
  last_debit_at       DateTime?
  failure_count       Int           @default(0)
  created_at          DateTime      @default(now())
  updated_at          DateTime      @updatedAt

  user   User   @relation(fields: [user_id], references: [id])
  circle Circle @relation(fields: [circle_id], references: [id])

  @@unique([user_id, circle_id])
}

enum MandateStatus {
  PENDING_ACTIVATION
  ACTIVE
  SUSPENDED
  FAILED
  REVOKED
  EXPIRED
}
```

### 5.2 `Circle` — add mandate relation
```prisma
mandates DirectDebitMandate[]
```
> Auto-debit is **per-member, individual opt-in** — there is no circle-level flag. A
> member's `ACTIVE` mandate is itself the enrollment signal; no admin toggle involved.

### 5.3 `Contribution` — observability + lock
```prisma
paid_via                String?   // "VIRTUAL_ACCOUNT" | "AUTO_DEBIT" | "MANUAL"
auto_debit_attempts     Int       @default(0)
auto_debit_last_attempt DateTime?
```

### 5.4 `User` — back-relation
```prisma
mandates DirectDebitMandate[]
```

> MongoDB via Prisma — apply with `npm run db:push` (additive, non-breaking).

---

## 6. Nomba Service Additions (`services/nomba.ts`)

Follow the existing `fetchJson` / `fetchJsonGet` + `authHeaders` pattern:

- `createDirectDebitMandate(params)` → `POST /v1/direct-debits`; returns
  `{ mandateId, merchantReference, activationNote }`.
- `debitMandate(mandateId, amountKobo)` → `POST /v1/direct-debits/debit-mandate`
  (send amount as naira string); returns `{ status, message, code }`.
- `getMandateStatus(mandateId)` → GET; returns normalized `MandateStatus`.
- `updateMandateStatus(mandateId, action)` → PUT (suspend/reactivate/delete).

All amount conversions kobo↔naira handled inside the service (consistent with
`bankTransfer` / `createVirtualAccount`).

---

## 7. New / Changed Endpoints

Mounted under the existing `/circles` and `/contributions` routers.

| Method & Path | Purpose |
| :--- | :--- |
| `POST /circles/:id/mandate` | Member authorizes auto-debit **for themselves** on this circle. Verifies bank via `lookupBankAccount`, creates Nomba mandate, stores `DirectDebitMandate`, returns ₦50 activation instructions. |
| `GET /circles/:id/mandate` | Member checks their own mandate status (reconciles with Nomba). |
| `DELETE /circles/:id/mandate` | Member revokes their own auto-debit (calls update-status → `REVOKED`). |

All three act only on the caller's own mandate (`req.userId`). No admin involvement.

**Preconditions for `POST /circles/:id/mandate`:**
- Caller is a member of the circle.
- User has `bank_account_number` + `bank_code` (else prompt to add bank details).
- No existing live mandate for (user, circle) — re-auth only allowed after a terminal state.

---

## 8. Auto-Debit Engine (cron sweeps)

Current scheduler is plain `setInterval` in `index.ts`. Add two sweeps in the same style
(candidate for migrating all sweeps to `node-cron` later — see Open Questions).

### 8.1 `runAutoDebitSweep()` — the collector
Runs a few times/day. For each contribution that is:
- `status ∈ { PENDING, LATE }`, `paid_at == null`,
- `due_date` within the debit window (e.g. due today or overdue),
- whose member has a mandate in `ACTIVE` status for that circle (this is the enrollment signal),
- and has not exhausted retries (`auto_debit_attempts < MAX`):

do:
1. Set an in-memory `isDebitSweeping` guard (avoid overlapping runs) **and** stamp
   `auto_debit_last_attempt` / increment `auto_debit_attempts` **before** calling Nomba
   (optimistic lock so a re-entrant sweep can't double-charge the same contribution).
2. Call `debitMandate(mandateId, amount)`.
3. On `code === "00"` → call the shared **`markContributionPaid()`** (see §9) with
   `paid_via = "AUTO_DEBIT"`.
4. On failure → leave `PENDING`, bump `mandate.failure_count`, and if it looks terminal
   (mandate no longer active / insufficient funds N times) alert the member + admin via
   WhatsApp; the existing daily LATE check still applies penalties.
5. Throttle between calls (respect Nomba rate limits — see §10).

### 8.2 `runMandateActivationCheck()` — the poller
Runs a few times/day. For each `DirectDebitMandate` in `PENDING_ACTIVATION`, call
`getMandateStatus()`; promote to `ACTIVE` when Nomba reports it (or `EXPIRED` after a
cutoff). Notify the member on activation. Replaces reliance on a mandate webhook (Nomba's
documented webhook events don't include mandate activation).

---

## 9. Refactor: extract `markContributionPaid()`

Today `processPayment(accountRef)` in `controllers/contributions.ts` looks a contribution
up **by `nomba_account_ref`** (a virtual-account concept) and then does: mark PAID, bump
score, anchor `cycle_started_at`, trigger payout. Auto-debit has **no virtual account**,
so extract the reusable core:

```ts
async function markContributionPaid(
  contribution,
  opts: { nombaReference: string; wasLate: boolean; paidVia: string }
) { /* mark PAID + bump score + anchor cycle + setImmediate(checkAndTriggerPayout) */ }
```

- `processPayment(accountRef)` (webhook / simulate) → finds by `nomba_account_ref`, calls it.
- `runAutoDebitSweep()` → already has the contribution, calls it directly.

This keeps a **single** payment-completion path (score, cycle anchoring, payout trigger)
and avoids drift between manual and auto flows.

---

## 10. Safety, Idempotency & Limits

- **No double-charge:** optimistic lock (increment `auto_debit_attempts` + stamp before
  the Nomba call) + in-memory sweep guard + only-act-on-`PENDING/LATE`.
- **Idempotent mandate creation:** `merchant_reference` and `@@unique([user_id,circle_id])`
  prevent duplicate mandates.
- **Verify after debit:** Nomba's `debit-mandate` is **synchronous** and returns no
  transaction reference, so `code === "00"` is authoritative — there's nothing to look up.
  (The lookup-verify rule still governs the async virtual-account/webhook path.)
- **Rate limits:** Nomba caps some money endpoints (e.g. 5 transfers/min to same recipient).
  Space debit calls in the sweep; cap batch size per run.
- **Retries:** bounded `auto_debit_attempts` (e.g. 3) with backoff across sweep runs; after
  exhaustion, stop auto-retrying and fall back to manual + LATE penalties.
- **Revocation safety:** a `SUSPENDED`/`REVOKED` mandate is skipped by the collector.

---

## 11. Failure & UX Handling

- **Mandate pending:** member sees "Auto-debit activating — complete the ₦50 verification
  transfer." Manual payment stays available meanwhile.
- **Debit failed (insufficient funds):** WhatsApp nudge to fund the account; contribution
  stays `PENDING` → becomes `LATE` on the daily check.
- **Mandate deactivated by bank:** poller flips it out of `ACTIVE`; member re-authorizes.
- **Member turns off auto-debit:** `DELETE /circles/:id/mandate` → mandate `REVOKED`; the
  collector skips it and the member reverts to manual payment.
- **Manual + auto on the same member (MVP caveat):** the collector skips once the
  contribution is `PAID`, but a race between an in-flight virtual-account transfer and a
  mandate debit is theoretically possible. Auto-debit members shouldn't also pay manually;
  hardening (single active payment method per member per cycle) is deferred.

---

## 12. Environment Variables

No new secrets — reuses `NOMBA_CLIENT_ID`, `NOMBA_CLIENT_SECRET`, `NOMBA_ACCOUNT_ID`,
`NOMBA_BASE_URL`. Optional tunables:
- `AUTO_DEBIT_MAX_ATTEMPTS` (default 3)
- `AUTO_DEBIT_SWEEP_INTERVAL_MS`
- `MANDATE_ACTIVATION_TIMEOUT_HOURS` (default 72)

---

## 13. Testing (sandbox first)

1. Unit-test the service functions against `https://sandbox.nomba.com` (mandate create,
   debit, status) — mirror `__tests__/contributions.test.ts` mocking style.
2. Integration: seed a circle with `auto_debit_enabled`, create a mandate, simulate
   activation, run `runAutoDebitSweep()`, assert contribution → PAID via `markContributionPaid`
   and that payout still triggers when all members are collected.
3. Idempotency: run the sweep twice back-to-back; assert a single debit per contribution.
4. Failure path: force a non-"00" debit; assert PENDING retained + `failure_count` bumped.

---

## 14. Implementation Checklist (phased)

**Phase A — Data & service** ✅ code applied (pending `db:push`)
- [x] `schema.prisma`: add `DirectDebitMandate`, `MandateStatus`, `Circle.auto_debit_enabled`,
      `Contribution.paid_via`/attempt fields, `User.mandates`. → run `db:push` to sync indexes.
- [x] `services/nomba.ts`: `createDirectDebitMandate`, `debitMandate`, `getMandateStatus`,
      `updateMandateStatus` (+ `fetchJsonPut` helper, frequency map, kobo↔naira).

**Phase B — Endpoints** ✅ code applied
- [x] `POST /circles/:id/mandate`, `GET`, `DELETE` — new `controllers/mandates.ts`,
      wired into the circles router with Swagger docs. **Per-member, individual opt-in;
      no admin gate** (config endpoint + `Circle.auto_debit_enabled` were removed).
- Note: `User` has no email field; mandate create derives `{phone}@qova.ng` for Nomba's
  required `customerEmail`. Swap the `deriveEmail` helper if real emails are added.

**Phase C — Engine** ✅ code applied
- [x] Extract `markContributionPaid()` into `services/contribution.ts` (+ shared
      `frequencyDays`/`addDays`/`cycleDueDate` + `ensureAutoDebitContribution`);
      refactored `processPayment` to delegate to it (`paid_via: "VIRTUAL_ACCOUNT"`).
- [x] `runAutoDebitSweep()` (mandate-driven, lazy-creates the cycle obligation,
      optimistic lock, retry cap, failure counting, rate-limit spacing) +
      `runMandateActivationCheck()` (poller) in `services/cron.ts`.
- [x] Wired into `index.ts`: activation check every 2h (+ one 45s post-boot run),
      debit sweep every 6h (no startup run). Both intervals env-configurable.

**Phase D — Hardening** ✅ code applied
- [x] ~~Post-debit transaction verification~~ — **N/A for mandate debits.** Nomba's
      `debit-mandate` response returns no transaction reference to look up, so the
      synchronous `code === "00"` is the source of truth. (Lookup-verify still applies to
      the virtual-account/webhook path, which has references.)
- [x] Retry cap + failure counting + WhatsApp member notifications (activation success,
      activation failure/re-auth, debit success receipt, debit decline/final-attempt).
- [x] Unit tests for the engine — `__tests__/autodebit.test.ts` (7 tests: due gating,
      optimistic lock, retry cap, decline handling, circle-not-active skip, activation
      transitions). Full suite green (20/20).

---

## 15. Open Questions

1. ~~**Mandate granularity**~~ — ✅ **Resolved: per (user, circle).** Members set up
   auto-debit individually per circle; enforced by `@@unique([user_id, circle_id])`.
2. **Scheduler** — keep `setInterval`, or migrate all sweeps to `node-cron` for real
   cron expressions? (Render dyno restarts reset `setInterval` timing.)
3. **Debit timing** — debit exactly on `due_date`, or N hours before, to leave room for
   retries within the cycle?
4. **Card fallback** — do we still want tokenized-card auto-debit for members without a
   supported bank, pending sandbox verification of silent re-charge?
