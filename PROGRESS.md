# Qova — Development Progress

> Last updated: June 13, 2026

---

## ✅ Completed

### Infrastructure & Setup
- [x] MongoDB database connected via Prisma ORM (`Qova` database on Atlas)
- [x] Node.js + Express server with TypeScript
- [x] Environment variables configured (`.env`)
- [x] Swagger API docs at `/docs` (configured for `localhost:5000`)
- [x] Request logger middleware with timestamps and colour-coded status codes
- [x] Centralised error handler middleware
- [x] JWT authentication middleware (`authenticate`)
- [x] CORS + Helmet security headers

### Database Schema (Prisma)
- [x] `User` model — name, phone, bank details, reliability score, BVN flag
- [x] `Circle` model — name, invite code, contribution amount, frequency, slots, payout order, start condition, status
- [x] `Membership` model — user ↔ circle join table with slot number
- [x] `Contribution` model — per-cycle payment tracking with Nomba reference
- [x] `Payout` model — disbursement records with Nomba transfer reference
- [x] `SavingsVault` model — individual savings goals
- [x] `OTP` model — phone-indexed, expiry-aware codes
- [x] Enums: `Frequency`, `CircleStatus` (PENDING/ACTIVE/COMPLETED/PAUSED), `PayoutOrderType`, `StartCondition`, `ContributionStatus`

### Authentication (`/auth`)
- [x] `POST /auth/send-otp` — generates 6-digit OTP and sends via WhatsApp (Baileys)
- [x] `POST /auth/verify-otp` — verifies OTP, upserts user, returns 30-day JWT
- [x] `POST /auth/complete-profile` — takes bank account number + bank code, calls Nomba Bank Lookup to auto-populate user's name, saves bank details

### WhatsApp Bot
- [x] Baileys client initialised with pairing code auth
- [x] Auto-reconnect with exponential backoff (capped at 60s)
- [x] `keepAliveIntervalMs: 30000` to prevent silent disconnects
- [x] `defaultQueryTimeoutMs: undefined` to prevent init query timeouts

### Nomba Integration (`/services/nomba.ts`)
- [x] Sandbox-ready HTTP client (no auth headers needed for sandbox)
- [x] `lookupBankAccount(accountNumber, bankCode)` — resolves account holder name

### Users (`/users`)
- [x] `GET /users/me` — full profile (name, phone, bank details, reliability score, join date)
- [x] `GET /users/me/circles` — returns `current` (PENDING/ACTIVE) and `past` (COMPLETED) circles with slot number

### Circles (`/circles`)
- [x] `POST /circles` — create circle with name, amount, frequency, slots, payout order type (AUTO/MANUAL), start condition; generates unique invite code (e.g. `QX-8829-01`); admin auto-joins as slot 1; circle starts as PENDING
- [x] `POST /circles/join` — join via invite code; validates not full, not started, not already a member; auto-activates circle if `start_condition=AUTO` and last slot fills
- [x] `GET /circles/:id` — circle details with `members_count`, `total_pot` (kobo), `next_payout_date`
- [x] `GET /circles/:id/members` — members list with slot, `turn`, `paid` (current cycle), and `status` (upcoming/active/completed)
- [x] `GET /circles/:id/history` — combined contributions + payouts sorted by date descending
- [x] `POST /circles/:id/start` — admin manually starts a PENDING circle (for `start_condition=MANUAL`)
- [x] `POST /circles/:id/payout-order` — admin sets custom payout sequence (for `payout_order_type=MANUAL`)
- [x] Random draw (Fisher-Yates shuffle) applied to payout order when `payout_order_type=AUTO` on circle activation

### Dev Tooling
- [x] Seed script (`npm run seed`) — creates 10 Nigerian users with OTP `123456` valid for 1 hour

---

## ⏳ Pending

### Phase 3 — Contributions via Nomba

- [ ] `POST /contributions/pay` — create Nomba Checkout order or Dynamic Virtual Account for a member's contribution; return `checkoutLink` or virtual account details to mobile app
- [ ] `POST /contributions/verify` — Nomba webhook receiver; verify transaction via `GET /v1/transactions/accounts/single` before marking contribution as PAID
- [ ] Contribution status auto-update to `LATE` after due date passes with no payment
- [ ] Contribution status auto-update to `MISSED` after 48hr grace period; deduct reliability score (-15)
- [ ] Partial restoration of reliability score (+5) when a missed payment is eventually made
- [ ] `GET /contributions/:circleId` — list contributions for the current cycle (admin view)

### Phase 4 — Payouts

- [ ] `POST /payouts/trigger/:circleId` — admin or auto-trigger that calls Nomba Bank Transfer API (`POST /v2/transfers/bank`) to send pot to current cycle recipient
- [ ] Payout webhook handler (`payout_success` / `payout_failed`) — confirm transfer and record result
- [ ] Auto-advance cycle after successful payout (`current_cycle++`, set next recipient)
- [ ] Circle auto-complete when all members have received a payout (status → COMPLETED)
- [ ] Transfer failure handling and retry queue

### Phase 5 — Notifications & Reminders

- [ ] 24hr payment reminder (FCM push notification)
- [ ] 1hr payment reminder (FCM push notification)
- [ ] Payout received notification to recipient
- [ ] Circle full / circle started notification to all members

### Phase 6 — Savings Vaults

- [ ] `POST /savings` — create a savings vault (goal name, target amount, optional target date)
- [ ] `POST /savings/:id/deposit` — deposit into vault via Nomba Checkout
- [ ] `POST /savings/:id/withdraw` — withdraw from unlocked vault via Nomba Transfer
- [ ] `GET /savings/:id` — vault details with current amount and progress
- [ ] `GET /savings` — list all vaults for authenticated user

### Phase 7 — Polish & Submission

- [ ] Nomba production credentials + KYB verification (CAC documents)
- [ ] Switch `NOMBA_BASE_URL` from sandbox to `https://api.nomba.com`
- [ ] Nomba OAuth2 token caching + refresh flow (for production)
- [ ] Webhook signature verification using Nomba Webhook Signature Key
- [ ] Sentry error monitoring integration
- [ ] Demo video recording for hackathon submission (due July 18, 2026)

---

## 🗂 Reference

| Doc | Purpose |
|---|---|
| `PROJECTS.md` | Original MVP spec and API blueprint |
| `research.md` | Nomba hackathon research + API payloads |
| `docs.md` | Nomba API reference (auth, webhooks, rate limits, KYB) |
| `DESIGN.md` | Visual identity — colors, typography, components |
| `CLAUDE.md` | AI agent instructions and coding rules |
