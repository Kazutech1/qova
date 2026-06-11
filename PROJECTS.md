# Qova — Project Context for AI Agents

> This file is the source of truth for all agents working on Qova.
> Read this before starting any task. Do not assume context not listed here.

---

## What Is Qova

Qova is a mobile-first community finance app for Nigerians. It digitalises **Ajo** — a traditional rotating savings and credit association (ROSCA) where a group of people contribute a fixed amount regularly and one member receives the full pot each cycle.

The app removes the friction of managing Ajo manually (WhatsApp groups, spreadsheets, handshakes) by providing a digital circle with contribution tracking, automated payouts, reminders, and a trust/reputation system.

**Tagline:** Community Finance, Reimagined.  
**Owner:** Philotex Group  
**Stage:** Pre-MVP (active development)  
**Target Market:** Nigeria first, pan-Africa later  
**Primary Users:** Regular Nigerians aged 20–45 who already participate in Ajo groups

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile Frontend | React Native (Expo) | iOS + Android from one codebase |
| Backend | Node.js + Express | REST API |
| Database | PostgreSQL | Relational — users, circles, transactions |
| Payments | Paystack | Collections, bank transfers, USSD |
| Auth | Phone number + OTP | Via Termii SMS API |
| Push Notifications | Firebase Cloud Messaging (FCM) | |
| SMS Reminders | Termii | Payment reminders |
| Error Monitoring | Sentry | |
| Hosting | Ubuntu VPS | Same infra pattern as other Philotex projects |

**No blockchain. No crypto. No on-chain logic.** Everything is off-chain, NGN only.

---

## Repository Structure

```
qova/
├── app/                        # React Native (Expo) frontend
│   ├── src/
│   │   ├── screens/            # One folder per screen
│   │   ├── components/         # Shared UI components
│   │   ├── navigation/         # React Navigation config
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API calls to backend
│   │   ├── store/              # State management (Zustand)
│   │   └── utils/              # Helpers, formatters
│   └── assets/
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── routes/             # API route definitions
│   │   ├── controllers/        # Business logic
│   │   ├── models/             # DB models / queries
│   │   ├── middleware/         # Auth, error handling
│   │   ├── services/           # Paystack, Termii, FCM integrations
│   │   └── utils/
│   └── prisma/                 # Prisma schema + migrations
├── PROJECTS.md                 # This file
└── .env.example
```

---

## Data Models

### User
```
id, name, phone (unique), bank_account_number, bank_code, bank_name,
reliability_score (0–100, default 100), bvn_verified (bool),
created_at, updated_at
```

### Circle
```
id, name, admin_id (→ User), contribution_amount (NGN),
frequency (WEEKLY | BIWEEKLY | MONTHLY), total_slots,
status (ACTIVE | COMPLETED | PAUSED), payout_order (array of user_ids),
current_cycle, created_at
```

### Membership
```
id, user_id (→ User), circle_id (→ Circle),
slot_number, has_received_payout (bool), joined_at
```

### Contribution
```
id, user_id, circle_id, cycle_number,
amount, paid_at, status (PENDING | PAID | LATE | MISSED),
paystack_reference
```

### Payout
```
id, circle_id, recipient_id (→ User), cycle_number,
amount, paid_at, paystack_transfer_code
```

### SavingsVault
```
id, user_id, goal_name, target_amount, current_amount,
locked (bool), target_date, created_at
```

---

## API Endpoints

### Auth
```
POST /auth/request-otp        { phone }
POST /auth/verify-otp         { phone, otp }
POST /auth/complete-profile   { name, bank_account_number, bank_code }
```

### Circles
```
POST   /circles                Create a new circle
GET    /circles/:id            Get circle details
POST   /circles/:id/join       Join a circle via invite
GET    /circles/:id/members    List members + payment status
GET    /circles/:id/history    Full contribution + payout history
```

### Contributions
```
POST /contributions/pay        Initiate Paystack payment for a contribution
POST /contributions/verify     Paystack webhook — verify and record payment
```

### Payouts
```
POST /payouts/trigger/:circleId   Admin triggers payout for current cycle
```

### Savings
```
POST   /savings                Create a savings vault
POST   /savings/:id/deposit    Deposit into vault
POST   /savings/:id/withdraw   Withdraw from vault
GET    /savings/:id            Get vault details
```

### Users
```
GET  /users/me                 Get current user profile
GET  /users/:id/score          Get reliability score
```

---

## Key Business Logic

### Reliability Score
- Starts at 100 for every user
- Deducted when a contribution is LATE (-5) or MISSED (-15)
- Restored partially when a missed payment is eventually made (+5)
- Visible to all members of a circle
- Used by admins to decide whether to accept a new member

### Contribution Flow
1. Reminder sent 24hrs before due date (FCM + SMS)
2. Reminder sent 1hr before due date
3. Member opens app and taps "Pay Now"
4. Paystack payment initiated
5. Paystack webhook fires → backend verifies → contribution marked PAID
6. If no payment after due date → marked LATE
7. After grace period (48hrs) → marked MISSED, score deducted

### Payout Flow
1. All contributions for current cycle must be PAID
2. Admin confirms payout (or auto-trigger if all paid)
3. Backend calls Paystack Transfer API → sends to recipient's bank account
4. Payout record created, cycle incremented
5. Next recipient in `payout_order` is set for next cycle

### Circle Completion
- Circle completes when every member has received one payout
- Status set to COMPLETED
- All members notified

---

## MVP Feature Checklist

These are the only things that must work for MVP launch:

- [ ] Phone + OTP registration
- [ ] Complete profile with bank account
- [ ] Create a circle (name, amount, frequency, slots)
- [ ] Invite members via shareable link
- [ ] Pay contribution via Paystack
- [ ] Paystack webhook verification
- [ ] 24hr and 1hr payment reminders (FCM + SMS)
- [ ] Admin dashboard — who paid, who hasn't, next recipient
- [ ] Payout to recipient's bank account via Paystack Transfers
- [ ] Transaction history per circle
- [ ] Reliability score update after each cycle
- [ ] Individual savings vault (deposit + withdraw)

Do NOT build anything outside this list until all boxes are checked.

---

## Post-MVP Features (Do Not Build Yet)

**V2**
- BVN verification for higher trust tier
- Reputation badges (Bronze / Silver / Gold)
- Circle member reviews after cycle completion
- P2P lending within circles
- Yield on idle funds (partner with licensed Nigerian FI)
- Bill splitting within circles

**V3**
- Group wallet
- Credit report export
- Business circles for SMEs and cooperatives

---

## Environment Variables

```env
# Server
PORT=
DATABASE_URL=
JWT_SECRET=

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=

# Termii (SMS + OTP)
TERMII_API_KEY=
TERMII_SENDER_ID=

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Sentry
SENTRY_DSN=
```

---

## Coding Conventions

- **Language:** TypeScript everywhere (frontend + backend)
- **Formatting:** Prettier, 2-space indent
- **API responses:** Always `{ success: boolean, data: any, message: string }`
- **Error handling:** Centralised error middleware on the backend
- **Auth:** JWT in Authorization header (`Bearer <token>`)
- **Dates:** Store as UTC in DB, format to WAT (UTC+1) for display
- **Currency:** Store amounts in kobo (integer), display in Naira
- **Naming:** camelCase for variables/functions, PascalCase for components/classes, snake_case for DB columns

---

## Paystack Integration Notes

- Use **Paystack Inline** for payment collection on mobile (via WebView or SDK)
- Use **Paystack Transfers** for bank payouts — requires recipient code creation first
- Webhook endpoint: `POST /contributions/verify` — verify signature with `PAYSTACK_SECRET_KEY`
- Always verify payment server-side before marking as PAID — never trust client

---

## What Agents Should Know

- This is a **Nigerian product** — all amounts are in NGN (Naira), stored in kobo
- The word **"Ajo"** refers to the traditional ROSCA practice — use this term in comments and UI copy
- **Do not add features not listed in MVP checklist** without explicit instruction
- **Paystack is the only payment provider** — do not suggest Stripe, Flutterwave, or others
- When in doubt about a business logic decision, **ask before implementing**
- The developer (Kaz) is a React Native specialist — frontend code should be idiomatic RN/Expo
- Backend follows a standard MVC pattern — keep controllers thin, logic in services

---

*Last updated: April 2026 | Philotex Group*
