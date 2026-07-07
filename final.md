# Qova

**Community Finance, Reimagined.**

Qova is a mobile-first platform that digitalizes Ajo, Nigeria's traditional rotating savings and credit associations (ROSCAs), on top of Nomba's payment infrastructure. Members join savings circles, contribute on a fixed schedule, and take turns receiving the full pot. Qova removes the human middleman from the money flow entirely: contributions reconcile automatically, payouts fire the instant a pot completes, and no person ever holds the group's money.

Built for the **DevCareer x Nomba Hackathon 2026** (Build Track) by Philotex Group.

> The full loop, real bank transfer in, automatic verification, real bank payout out, has been proven end to end with real money in production. Twice.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [What Has Been Proven](#3-what-has-been-proven)
4. [Product Walkthrough](#4-product-walkthrough)
5. [System Architecture](#5-system-architecture)
6. [The Mobile App](#6-the-mobile-app)
7. [The Server](#7-the-server)
8. [Data Models](#8-data-models)
9. [API Reference](#9-api-reference)
10. [Background Engines](#10-background-engines)
11. [Payment Integrity Principles](#11-payment-integrity-principles)
12. [Nomba Integration Deep Dive](#12-nomba-integration-deep-dive)
13. [Security](#13-security)
14. [Reliability Scoring](#14-reliability-scoring)
15. [Testing and Quality](#15-testing-and-quality)
16. [Deployment and Operations](#16-deployment-and-operations)
17. [Honest Status: Known Limitations](#17-honest-status-known-limitations)
18. [Roadmap](#18-roadmap)
19. [Demo Guide](#19-demo-guide)

---

## 1. The Problem

Millions of Nigerians save through Ajo (also called Esusu or Adashe): informal rotating savings groups where every member contributes a fixed amount each cycle and members take turns collecting the entire pot. It is one of the most successful grassroots financial systems in the world, and it runs almost entirely on trust.

That trust is the weakness:

- **A human collector holds the money.** "The Ajo admin ran off with the pot" is a story every participant has heard, and many have lived.
- **Record keeping is notebooks and WhatsApp screenshots.** Disputes about who paid and who did not are constant.
- **Collection is manual.** Someone has to chase every member, every cycle.
- **Reputation is not portable.** Ten years of perfect Ajo payments earn you nothing outside your own group.

## 2. The Solution

Qova keeps everything people love about Ajo (the discipline, the community, the guaranteed lump sum) and replaces everything fragile about it with payment infrastructure:

| Traditional Ajo | Qova |
| :--- | :--- |
| Collector holds the cash | Money flows through Nomba accounts; no person holds the pot |
| Proof of payment by screenshot | Every contribution gets its own virtual account; deposits reconcile automatically against Nomba's ledger |
| Admin pays the recipient by hand | Payout fires automatically the moment the last member pays |
| Chasing members for payment | Members opt in to automatic collection by saved card or bank direct debit mandate |
| Trust is word of mouth | On-chain style reliability score built from actual payment history |
| Records in a notebook | Full transaction history per circle, per member, in the app |

## 3. What Has Been Proven

These are not planned features. They have executed in production with real money:

1. **A real member joined a circle with an invite code**, was placed in the payout rotation, and paid a real ₦100 bank transfer into a dynamically created Nomba virtual account.
2. **The deposit was confirmed automatically within 60 seconds** by the reconciliation engine reading Nomba's transaction ledger, with the real transaction reference stored. No webhook was involved (webhook delivery is not available on the shared hackathon account, which is exactly why the engine exists).
3. **The instant the pot completed, the payout engine fired a real ₦500 bank transfer** to the cycle's recipient via Nomba's Transfers API, credited reliability points to every contributor, and advanced the circle to the next cycle.
4. **The next cycle then ran the same loop again**, proving the rotation: new contributions, new settlement, a second real ₦500 payout to the next member in the order.
5. **WhatsApp OTP login, payment receipts, and payout alerts** delivered throughout.

## 4. Product Walkthrough

**Onboarding.** A user enters their phone number. A 6-digit OTP arrives on WhatsApp (not SMS: cheaper, and it is where Nigerian users already live). After verification they add their name and bank account, which is validated in real time against Nomba's account lookup, so payouts never bounce on a typo.

**Home.** A dashboard of the user's circles: current cycle, pot size, next payout date, and their reliability score.

**Creating a circle.** Name, contribution amount, frequency (weekly, biweekly, monthly), and number of slots. The creator gets an invite code to share. Payout order can be automatic (shuffled at start) or manually arranged by the admin.

**Joining a circle.** Enter an invite code, preview the circle, take a slot. When the last slot fills, the circle activates automatically.

**Contributing.** Tap CONTRIBUTE. The app shows a dynamic virtual account created by Nomba specifically for this member, this circle, this cycle, with the exact amount and expiry. The member transfers from any bank app. The screen flips to ROUND CLEARED on its own when the backend confirms the deposit. Alternatively, the member taps PAY BY CARD and completes a card payment on Nomba's secure checkout inside the app; the card is tokenized in the same step, enabling automatic collection for every future cycle.

**Payout.** Nothing to do. When the last contribution lands, the recipient gets the full pot as a bank transfer and a WhatsApp alert. The circle advances.

**Circle management.** Members list with paid/pending badges and turn order. Full contribution and payout history. An admin console for editing turn order. Personal auto-pay controls: enable or disable card autopay and bank direct debit per circle.

## 5. System Architecture

```
┌─────────────────────┐
│   Mobile App        │  React Native (Expo Router), TypeScript
│   iOS / Android     │  OTA updates via EAS Update
└─────────┬───────────┘
          │ HTTPS, Bearer JWT
┌─────────▼───────────┐
│   REST API          │  Node.js + Express, TypeScript
│   (Render)          │  Swagger docs at /docs
├─────────────────────┤
│  Background Engines │  Reconciliation (60s) · Payout sweep (2m)
│                     │  Card charge sweep (6h) · Mandate sweeps
├──────────┬──────────┤
│  Prisma  │ Baileys  │
└────┬─────┴────┬─────┘
     │          │
┌────▼────┐ ┌───▼──────┐   ┌──────────────────────────────┐
│ MongoDB │ │ WhatsApp │   │  Nomba APIs                  │
│ (Atlas) │ │ (OTP +   │   │  Virtual Accounts · Checkout │
└─────────┘ │ alerts)  │   │  Tokenized Cards · Transfers │
            └──────────┘   │  Direct Debit · Transactions │
                           └──────────────────────────────┘
```

| Layer | Technology |
| :--- | :--- |
| Mobile | React Native 0.81, Expo SDK 54, Expo Router 6, TypeScript |
| API | Node.js, Express 4, TypeScript, express-async-errors, helmet, zod |
| Database | MongoDB Atlas via Prisma 5 |
| Payments | Nomba (production API) |
| Messaging | WhatsApp via @whiskeysockets/baileys |
| Auth | Phone + WhatsApp OTP, 30-day JWT |
| Hosting | Render (API), EAS (app builds and OTA updates) |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |

**Conventions enforced across the codebase:** all money stored in kobo as integers, formatted to naira only at the presentation layer; all times stored UTC; every API response uses the envelope `{ success, data, message }`.

## 6. The Mobile App

### Structure

```
app/
├── app/                        # Expo Router file-based routes
│   ├── onboarding/             # phone → otp → profile
│   ├── (tabs)/                 # home · discover · savings · activity · profile
│   ├── (circle)/[id]/          # per-circle: overview · members · chat · history · admin
│   ├── create-circle.tsx
│   ├── join-circle.tsx
│   └── _layout.tsx             # root stack + OTA update hook
└── src/
    ├── services/api.ts         # single typed API client
    ├── hooks/useOTAUpdates.ts  # over-the-air update check on cold start
    ├── components/common/      # Text, Button, Input, OTPInput, BottomSheet
    └── theme/                  # colors, typography, spacing
```

### The API client

One module (`src/services/api.ts`) owns every server interaction: token persistence (AsyncStorage with an in-memory/localStorage fallback), automatic Bearer header injection, envelope unwrapping, and typed methods for every endpoint. Screens never touch `fetch` directly.

### Payment UX engineering

The hardest UX problem in the app is that bank transfers are asynchronous. Qova handles it with layered confirmation:

- While the deposit sheet is open, a background poll checks the contribution status every 5 seconds; a confirmed deposit flips the UI to a success state without any user action.
- "I have sent the money" runs an active 40-second verification loop and tells the user honestly if the transfer has not landed yet.
- Card checkout opens inside the app (react-native-webview) restricted to the card form only, auto-closes when Nomba redirects to the callback URL, then runs a 90-second confirm loop that also nudges the backend to reconcile immediately.
- The WebView is loaded defensively: on builds whose native binary predates the dependency, the app falls back to the system browser sheet instead of crashing, so the payment flow degrades gracefully rather than breaking.

### Over-the-air updates

`expo-updates` is wired to the EAS project with `runtimeVersion` policy `appVersion` and channels for preview and production. JS and asset fixes ship instantly to installed builds without a store release: exactly what a hackathon-week product needs.

## 7. The Server

### Structure

```
server/src/
├── app.ts                  # Express wiring, helmet, CORS, Swagger, callback page
├── index.ts                # boot + background engine scheduling
├── routes/                 # auth · users · circles · contributions · payouts · banks · admin
├── controllers/            # request handlers (zod-validated)
│   ├── circles.ts          # create/join/start/order/members/history
│   ├── contributions.ts    # pay (virtual account) · webhook · simulate (dev)
│   ├── mandates.ts         # bank direct debit enrollment (per member, per circle)
│   ├── cardautopay.ts      # card tokenization autopay (per member, per circle)
│   └── payouts.ts / users.ts / auth.ts / admin.ts
├── services/
│   ├── nomba.ts            # ALL Nomba API access: auth token cache, transfers,
│   │                       #   virtual accounts, lookup, checkout, tokenized cards,
│   │                       #   direct debits, transaction feed, webhook signature
│   ├── contribution.ts     # markContributionPaid: the single payment-completion path
│   ├── payout.ts           # pot-complete detection + real bank transfer + cycle advance
│   ├── cardautopay.ts      # card settlement + token activation reconciliation
│   ├── cron.ts             # every background engine
│   └── whatsapp.ts         # Baileys client: OTP delivery + notifications
├── middleware/             # JWT auth · error envelope · request logging
└── utils/                  # prisma client · reliability score · derived email
```

### The single payment-completion path

Every way money can arrive (virtual account webhook, ledger reconciliation, simulated dev payment, card charge) converges on one function: `markContributionPaid`. It marks the contribution PAID with the real Nomba reference and the collection method, awards reliability points, anchors the circle's cycle clock on the first payment, and triggers the payout check. One code path means the manual and automatic rails can never drift apart.

### The payout engine

When every member of a cycle has paid, `checkAndTriggerPayout` fires a real bank transfer of the full pot to the member whose turn it is (validated bank details, Nomba Transfers API), records the payout, marks the membership as received, credits +10 reliability to every contributor, and either advances the cycle or completes the circle. Failures alert the circle admin on WhatsApp and are retried by a sweep every 2 minutes.

## 8. Data Models

MongoDB via Prisma. All amounts in kobo, all timestamps UTC.

| Model | Purpose | Key fields |
| :--- | :--- | :--- |
| **User** | Member profile | phone (unique), name, bank account + code (Nomba-validated), reliability_score, bvn_verified |
| **Circle** | A savings circle | admin, contribution_amount, frequency (WEEKLY/BIWEEKLY/MONTHLY), total_slots, invite_code, payout_order[], current_cycle, cycle_started_at (anchors all due dates), status (PENDING/ACTIVE/COMPLETED) |
| **Membership** | User ⇄ circle | slot_number, has_received_payout |
| **Contribution** | One member's payment for one cycle | amount, due_date, status (PENDING/PAID/LATE/MISSED), nomba_reference (real transaction id), nomba_account_ref (virtual account key), virtual account details, checkout_order_ref (card ref), paid_via (VIRTUAL_ACCOUNT/CARD/AUTO_DEBIT/MANUAL), auto_debit_attempts + last_attempt (double-charge locks) |
| **Payout** | A pot disbursement | recipient, cycle_number, amount, nomba_transfer_reference |
| **DirectDebitMandate** | Bank auto-debit authorization, one per (user, circle) | nomba_mandate_id, status (PENDING_ACTIVATION/ACTIVE/SUSPENDED/FAILED/REVOKED/EXPIRED), bank details, activation_note (₦50 NIBSS instruction), failure_count |
| **CardAuthorization** | Card autopay, one per (user, circle) | token_key, masked PAN, card type, token_expires_at, status (PENDING_TOKENIZATION/ACTIVE/REVOKED/FAILED/EXPIRED), order_reference, last_charge_at |
| **SavingsVault** | Individual goal savings (roadmap: interest-bearing) | goal_name, target_amount, current_amount, locked, target_date |
| **OTP** | Login codes | phone, code, expires_at, used |

Compound uniqueness (`user_id + circle_id`) is enforced at the database level for both mandates and card authorizations: a member can never hold two live auto-pay enrollments for the same circle.

## 9. API Reference

Interactive documentation lives at `/docs` (Swagger). All endpoints return `{ success, data, message }`. 🔒 = Bearer JWT required.

**Auth**
| Method | Path | Description |
| :--- | :--- | :--- |
| POST | /auth/send-otp | Send a 6-digit code via WhatsApp |
| POST | /auth/verify-otp | Verify code, upsert user, return 30-day JWT |
| POST | /auth/complete-profile 🔒 | Save name + bank details (validated via Nomba lookup) |
| POST | /auth/whatsapp/reconnect | Ops: re-pair the WhatsApp bot |

**Users**
| Method | Path | Description |
| :--- | :--- | :--- |
| GET | /users/me 🔒 | Profile |
| GET | /users/me/circles 🔒 | Current and past circles |
| GET | /users/me/reliability 🔒 | Score, label, and breakdown |

**Circles**
| Method | Path | Description |
| :--- | :--- | :--- |
| POST | /circles 🔒 | Create (admin auto-joins slot 1) |
| POST | /circles/join 🔒 | Join by invite code (auto-starts when full) |
| GET | /circles/by-invite/{code} 🔒 | Pre-join preview |
| GET | /circles/{id} 🔒 | Details + pot + next payout date |
| POST | /circles/{id}/start 🔒 | Admin manual start |
| POST | /circles/{id}/payout-order 🔒 | Admin sets turn order (MANUAL circles) |
| GET | /circles/{id}/members 🔒 | Members with paid status and turn |
| GET | /circles/{id}/history 🔒 | Combined contribution + payout history |

**Auto-collection (per member, per circle)**
| Method | Path | Description |
| :--- | :--- | :--- |
| POST | /circles/{id}/mandate 🔒 | Enroll bank direct debit (returns ₦50 NIBSS activation instructions) |
| GET | /circles/{id}/mandate 🔒 | Mandate status (live-reconciled with Nomba) |
| DELETE | /circles/{id}/mandate 🔒 | Revoke |
| POST | /circles/{id}/card-autopay 🔒 | Pay this cycle by card + tokenize (returns checkout link, card-only page) |
| GET | /circles/{id}/card-autopay 🔒 | Card autopay status (reconciles token while pending) |
| DELETE | /circles/{id}/card-autopay 🔒 | Revoke + best-effort remote token deletion |

**Contributions & Payouts**
| Method | Path | Description |
| :--- | :--- | :--- |
| POST | /contributions/pay 🔒 | Get a dynamic virtual account for the current cycle |
| GET | /contributions/{circleId} 🔒 | Current-cycle contribution statuses |
| POST | /contributions/webhook | Nomba webhook receiver (HMAC-SHA256 verified) |
| GET | /payouts/{circleId} 🔒 | Payout history |

**Platform**
| Method | Path | Description |
| :--- | :--- | :--- |
| GET | /banks | Nigerian bank list + codes (cached 24h) |
| GET | /admin/accounts | Master wallet + sub-account balances |
| GET | /health | Liveness |
| GET | /payments/callback | Post-checkout landing page |

Dev-only simulation endpoints (`/contributions/simulate-payment`, `/contributions/simulate-all`, `/payouts/simulate-transfer`) exist for demos and are slated to be gated before public launch (see §17).

## 10. Background Engines

All engines run on schedules inside the API process. Money-moving sweeps deliberately do not run at boot, so a deploy can never trigger a charge.

| Engine | Interval | What it does |
| :--- | :--- | :--- |
| **Deposit reconciliation** | 60s (+ once at boot) | Reads Nomba's transaction ledger; settles virtual-account deposits by account reference and card payments by order reference; captures card tokens and activates pending card authorizations; skips the API call entirely when nothing is pending |
| **Payout sweep** | 2 min | Fires any payout whose pot completed (safety net behind the instant trigger) |
| **Card charge sweep** | 6h | Charges saved cards for due contributions: due-date gating, 3-attempt cap, 1-hour retry cooldown, token-expiry handling, and settlement only after the payment is verified in the ledger |
| **Mandate activation check** | 2h (+ once at boot) | Polls NIBSS mandate status; activates and notifies members |
| **Auto-debit sweep** | 6h | Debits active bank mandates for due contributions (same locking discipline as cards) |
| **Daily contribution check** | 24h | Marks overdue contributions LATE and deducts reliability points |

Every sweep uses an in-process overlap guard and an optimistic lock (the attempt is recorded **before** the external call), so re-entrant runs can never double-charge a member.

## 11. Payment Integrity Principles

These rules are enforced in code, not convention:

1. **Never trust the client.** No payment state changes from app input. The app only ever reads status.
2. **Never trust a single async signal.** Webhooks are verified by HMAC signature, and even then value is granted by the same path used by ledger reconciliation. When webhooks are absent entirely (the reality on a shared merchant account), the system loses nothing but latency.
3. **Verify before granting value.** Card charge responses are treated as advisory; a contribution becomes PAID only when the payment is visible in Nomba's transaction ledger with a sufficient amount. Underpayments are logged and never credited.
4. **One completion path.** Every rail converges on `markContributionPaid`, so scoring, cycle anchoring, and payout triggering can never diverge between manual and automatic collection.
5. **Idempotency everywhere.** Deterministic references for virtual accounts, database-level uniqueness for enrollments, status guards on settlement, optimistic locks on charges.

## 12. Nomba Integration Deep Dive

| Nomba product | Endpoint(s) | How Qova uses it |
| :--- | :--- | :--- |
| OAuth | POST /v1/auth/token/issue | Cached access tokens with 60s expiry margin |
| Dynamic Virtual Accounts | POST /v1/accounts/virtual | One account per member per cycle, with expected amount and expiry |
| Transaction feed | GET /v1/transactions/accounts | The backbone of reconciliation: cursor-paginated, filtered for Qova's own references |
| Bank Transfers | POST /v2/transfers/bank | Automatic pot payouts |
| Account Lookup | POST /v1/transfers/bank/lookup | Bank detail validation at onboarding and before payouts |
| Banks | GET /v1/transfers/banks | Bank picker (cached 24h) |
| Checkout | POST /v1/checkout/order | Card payment + tokenization (`tokenizeCard: true`, card-only page via `allowedPaymentMethods: ['Card']`) |
| Tokenized cards | GET/DELETE /v1/checkout/tokenized-card-data, POST /v1/checkout/tokenized-card-payment | Token retrieval by derived customer email, recurring charges, revocation |
| Direct Debit | POST /v1/direct-debits, /debit-mandate, GET /status, PUT /update-status | Bank-rail auto-collection via NIBSS e-mandates |
| Balances | GET /v1/accounts/balance, /v1/accounts | Master wallet and sub-account monitoring |
| Webhooks | nomba-signature headers | HMAC-SHA256 verification of payment events |

### Battle scars (real API behavior the docs did not mention)

Every one of these was diagnosed against the live production API and resolved or designed around:

- **`customerAddress` is required** for direct debit mandates despite being documented optional.
- **Phone numbers must be local format** (`080...`) for NIBSS, not international format.
- **`subscriberCode`**: an undocumented NIBSS biller-provisioning requirement that blocks direct debit until Nomba enables it per merchant account. The error field does not exist anywhere in Nomba's documentation.
- **Order references are capped at 50 characters**, which forced a redesign from parseable ID-embedded references to short random references stored on the contribution record.
- **Nomba may replace a custom order reference with its own UUID** in the create response, so Qova matches ledger entries by exact stored reference rather than by prefix.
- **The parent-balance endpoint is not `/v1/accounts/{id}`** (403) but `/v1/accounts/balance`.
- **Webhook signing** covers a colon-joined field string plus timestamp, not the raw body.

## 13. Security

- **Authentication**: phone + WhatsApp OTP (codes expire and are single-use), 30-day JWT, Bearer on every protected route.
- **Webhook**: HMAC-SHA256 signature verification with constant-time comparison; unsigned or tampered events are rejected with 401 before any processing; fail-closed if the signature key is unset.
- **Card data**: never touches Qova. Entry happens on Nomba's PCI-compliant hosted page; Qova stores only the token, masked PAN, and card type.
- **Transport and headers**: HTTPS everywhere, helmet on the API.
- **Validation**: zod schemas on request bodies; Prisma parameterization throughout.
- **Money movement**: no boot-time sweeps, optimistic locks, attempt caps, cooldowns.

Known gaps are listed honestly in §17.

## 14. Reliability Scoring

Every member carries a score (0 to 100, starts at 50) that moves with real behavior:

| Event | Points |
| :--- | :--- |
| Contribution paid on time | +5 |
| Late contribution recovered | +2 |
| Every member, when a pot completes | +10 |
| Each day a contribution is overdue | −1 |

The score is surfaced on the profile and home screens today. In the roadmap it becomes the trust layer for discovering and joining public circles: portable savings reputation, earned ₦100 at a time.

## 15. Testing and Quality

- **32 automated tests across 6 suites** (Jest + Supertest), covering the highest-risk surfaces: webhook signature verification (valid, tampered, wrong key, replayed timestamp, missing headers), the auto-debit engine (due gating, optimistic locking, retry caps, decline handling, activation transitions), the card charge engine (verified settlement, cooldowns, token expiry), and contribution flows.
- **Strict TypeScript on both app and server**: zero compile errors is the enforced baseline.
- **Live API documentation** generated from the code (Swagger) and served in production.
- **Real-money verification**: the payment, reconciliation, and payout paths were validated against Nomba's production API with actual bank transfers, not just mocks.

## 16. Deployment and Operations

**API on Render.** Build runs `prisma generate && tsc` (the generate step exists because Render caches node_modules; a stale Prisma client once broke a deploy and the build was hardened in response). Start is `node dist/index.js`. Push-to-deploy from `main`.

**App via EAS.** Development, preview, and production build profiles; preview and production are wired to OTA update channels. JS-level changes ship over the air; native dependency changes require a rebuild (the build must postdate the dependency list).

**Environment variables**

| Variable | Purpose |
| :--- | :--- |
| DATABASE_URL | MongoDB Atlas connection |
| JWT_SECRET | Token signing |
| NOMBA_BASE_URL / NOMBA_ACCOUNT_ID / NOMBA_CLIENT_ID / NOMBA_CLIENT_SECRET | Nomba API access |
| NOMBA_WEBHOOK_SIGNATURE_KEY | Webhook HMAC verification (fail-closed) |
| WHATSAPP_PHONE | Bot pairing number |
| SERVER_PUBLIC_URL | Checkout callback base |
| PORT | HTTP port |
| AUTO_DEBIT_MAX_ATTEMPTS, DEPOSIT_RECONCILE_INTERVAL_MS, CARD_CHARGE_SWEEP_INTERVAL_MS, MANDATE_CHECK_INTERVAL_MS, AUTO_DEBIT_SWEEP_INTERVAL_MS | Engine tuning |

## 17. Honest Status: Known Limitations

A pitch is stronger when it is honest. Current state:

- **Bank direct debit is code-complete but not live.** Mandate creation is blocked by an undocumented NIBSS `subscriberCode` provisioning requirement on the shared hackathon merchant account. The moment Nomba enables the product, the feature works with zero code changes (verified as far as the provisioning wall allows).
- **The card silent-charge proof is pending.** The full card path (checkout, tokenization, verified settlement, scheduled recurring charge) is built and tested at the unit level; the final end-to-end proof with a real card is the last outstanding live test.
- **Demo simulation endpoints are currently open** on the deployed API. They exist so the full loop can be demonstrated without five real people paying; they will be gated behind authentication before any public launch, along with the balance endpoint.
- **Savings, Chat, Discover, and Activity screens are visual previews.** Their backends are the roadmap (§18); the SavingsVault data model already exists.
- **Shared merchant account.** All hackathon teams transact on one Nomba account, so wallet balances and the transaction feed are shared. Qova isolates its own activity by reference matching; a dedicated account (and per-circle sub-accounts) is the production path.

## 18. Roadmap

**Discover: public circles and community growth.** A browsable directory of public circles searchable by amount, frequency, and interest. Reliability scores become the trust layer that makes saving with strangers possible: circles set minimum score requirements, and strong payment history unlocks higher-value pools. Qova grows from a tool for existing Ajo groups into a network where reputation earns opportunity.

**Interest-bearing savings vaults.** Individual, goal-based savings with lock periods that earn interest through a licensed banking partner. Members set a target, choose a lock duration, and watch the balance grow, with automatic top-ups riding the payment rails already built. Idle circle pots can earn yield between cycles, so the community's money works even while it waits.

**Near term**
- Bank direct debit activation the moment merchant provisioning lands
- BVN verification for identity-backed accounts and higher limits
- In-circle chat: reminders, payout celebrations, group coordination
- Dedicated merchant account with per-circle sub-accounts for clean fund isolation
- Hardening pass: gate demo endpoints, admin authentication, rate limiting

**Long term.** Every informal savings group in Nigeria running on rails they can trust, with a reputation score that follows members from their first ₦1,000 circle to their first loan.

## 19. Demo Guide

A timed 30-minute run-of-show (setup, rehearsal, live demo, fallbacks) is maintained in [DEMO.md](DEMO.md). The short version:

1. Seed the demo circle (`server/scripts/seed-hackathon-demo.ts`), join it from the app with the invite code, and re-run the script to take first payout position.
2. Live: onboard with WhatsApp OTP, join the circle, pay the contribution with a real transfer or card, and watch the screen confirm itself.
3. Complete the pot with the simulation endpoint, and watch a real ₦500 payout land in a real bank account, hands-free.

---

*Qova: the discipline of Ajo, the safety of infrastructure. Community finance, reimagined.*
