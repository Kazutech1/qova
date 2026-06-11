# Qova — AI Agent Instructions & Project Specifications

This file serves as the core instruction guide and source of truth for **all AI agents** working on the **Qova** codebase. It outlines the project specifications, current implementation status, and strict rules regarding file modifications.

---

## 🛑 Critical Agent Behavior Rule: Edits Require Explicit Permission

Before making **any** edit to any source, configuration, or environment file in this repository, you **MUST** ask for and obtain the user's explicit permission.

### How to request permission:
1. Stop before running any file edit tools (e.g., `replace_file_content` or `multi_replace_file_content`).
2. Provide a clear, detailed, and human-friendly explanation containing:
   * **Target File:** The path to the file you want to edit.
   * **The Change:** A summary/diff of the specific code or text you intend to add, modify, or delete.
   * **Rationale:** A clear explanation of *why* this change is necessary, what it achieves, and how it fits into the current task.
3. Wait for the user to reply and give approval before proceeding.

---

## 1. Project Overview

Qova is a mobile-first community finance application for the Nigerian market that digitalizes **Ajo** (traditional rotating savings and credit associations — ROSCAs). 

* **Tagline:** Community Finance, Reimagined.
* **Target Audience:** Nigerians aged 20–45 who already participate in informal Ajo groups.
* **Strategic Event:** Being adapted for submission to the **DevCareer × Nomba Hackathon 2026** (Build Track).

---

## 2. Tech Stack

| Layer | Current Implementation / Architecture |
| :--- | :--- |
| **Mobile Frontend** | React Native (Expo Router) — TypeScript |
| **Backend API** | Node.js + Express — TypeScript |
| **Database & ORM** | **MongoDB** (Prisma client) |
| **Auth Delivery** | Phone number + 6-digit OTP delivered via **WhatsApp bot** (`@whiskeysockets/baileys`) |
| **Payments Infra** | Transitioning from **Paystack** to **Nomba APIs** (Checkout, Virtual Accounts, Transfers, Account Lookup) |

---

## 3. Data Models (Prisma & MongoDB)

The following models are defined in [schema.prisma](file:///c:/Users/HP/Desktop/PHILOTEX/qova/server/prisma/schema.prisma):
* **`User`**: Profile and bank account details, reliability score, and BVN verification status.
* **`Circle`**: ROSCA circle configurations (admin, contribution amount, weekly/biweekly/monthly frequency, slots, payout order list, current cycle).
* **`Membership`**: Connects users to slots inside circles.
* **`Contribution`**: Tracks payment statuses (`PENDING`, `PAID`, `LATE`, `MISSED`) and transaction references per cycle.
* **`Payout`**: Tracks disbursements of collected pots to circle recipients.
* **`SavingsVault`**: Individual lockable savings goals.
* **`OTP`**: Generates and checks OTP expiration and used status.

---

## 4. Current Implementation Status

### Completed
* **Database & ORM Setup**: Prisma Client configured with MongoDB.
* **Server-side Authentication**: 
  * `POST /auth/send-otp` (triggers and records a 6-digit verification code, sends it via WhatsApp).
  * `POST /auth/verify-otp` (verifies code, registers/logs in user via upsert, returns 30-day JWT).
* **WhatsApp Service**: `@whiskeysockets/baileys` client setup with pairing code auth and automatic reconnection.
* **App-side (Expo Client) Onboarding Flow**: 
  * Phone registration screen ([onboarding/phone.tsx](file:///c:/Users/HP/Desktop/PHILOTEX/qova/app/app/onboarding/phone.tsx))
  * Verification input screen ([onboarding/otp.tsx](file:///c:/Users/HP/Desktop/PHILOTEX/qova/app/app/onboarding/otp.tsx))
  * Profile details setup screen ([onboarding/profile.tsx](file:///c:/Users/HP/Desktop/PHILOTEX/qova/app/app/onboarding/profile.tsx))

### Pending / Commented Out
* **Nomba Integration**: Replacing Paystack references to integrate:
  * Nomba Checkout API (`POST /v1/checkout/order`)
  * Nomba Dynamic Virtual Accounts (`POST /v1/accounts/virtual`)
  * Nomba Bank Transfers (`POST /v2/transfers/bank`)
  * Nomba Bank Account Lookup (`POST /v1/transfers/bank/lookup`)
* **Core REST Controllers**: `/circles`, `/contributions`, `/payouts`, `/savings`, and `/users` routes/controllers are sketched but currently disabled or commented out in `server/src/app.ts`.

---

## 5. Coding & Integration Guidelines

* **Currency**: Always store currency amounts in **kobo (integers)**, and format to Naira (NGN) for presentation on the client.
* **Time**: Store dates/times as **UTC** in the database; convert to West Africa Time (WAT / UTC+1) on the client side.
* **API Structure**: Standardized json envelope structure:
  ```json
  {
    "success": true,
    "data": {},
    "message": "User-facing message"
  }
  ```
* **Naming Conventions**: 
  * `camelCase` for TypeScript variables/functions/parameters.
  * `PascalCase` for React components/classes.
  * `snake_case` for database columns/fields (defined in Prisma).
* **Payment Architecture**: Never trust the client side for payment state changes. Rely on Nomba webhooks coupled with direct backend transaction lookup validation (`GET /v1/transactions/accounts/single`).
