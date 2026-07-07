# Qova — 30-Minute Hackathon Demo Plan

**Circle:** `Hackathon Demo Circle` · invite code **`HACK-2026-01`** · ₦100 weekly · 5 slots
**Story:** you join a running Ajo circle as the last member, pay your contribution with a *real bank transfer*, the backend confirms it independently of webhooks, everyone else pays, and the full ₦500 pot lands **in your real bank account** automatically.

---

## ⚠️ Hard prerequisites (do these or the demo fails)

1. **Deploy the latest server code to Render.** The deposit-reconciliation sweep (webhook-independent payment confirmation) only exists locally right now — uncommitted. Without it, your real transfer may sit PENDING forever if Nomba's webhook is slow (it was 12 min late last time).
2. **Master wallet balance ≥ ₦500** (the pot). It's a *shared* hackathon wallet other teams drain — check `GET /admin/accounts` right before the demo; top up by transferring into any Qova virtual account if short.
3. **WhatsApp bot connected** (OTP delivery + payout alerts). Check `/auth/whatsapp` status; reconnect via `/auth/whatsapp/reconnect` if needed.
4. Your demo phone's user has **real bank details** saved (your Opay account) — the payout goes there.

---

## T-30 → T-20 · Setup (10 min)

| Step | Command / Action |
| :--- | :--- |
| Fresh circle (only if re-running) | `cd server && npx tsx scripts/seed-hackathon-demo.ts --reset` |
| Join from the app | Join Circle → `HACK-2026-01` (circle auto-starts — you're slot 5) |
| Crown yourself first payout | `npx tsx scripts/seed-hackathon-demo.ts` (re-run; prints 👑 confirmation) |
| Verify wallet ≥ ₦500 | `GET /admin/accounts` (or `npx tsx scripts/test-balance.ts`) |

## T-20 → T-10 · Full rehearsal (10 min)

Run the exact demo once end-to-end (next section). If anything is off, you have 10 minutes to fix or fall back. After rehearsal, `--reset` + re-join to restore a clean state **only if time allows** — otherwise demo the already-paid state and narrate.

## T-10 → T-0 · The live demo (≈8 min + buffer)

1. **Onboarding (1.5 min)** — enter phone → OTP arrives **via WhatsApp** (Nomba-adjacent wow moment #1: no SMS costs). Log in.
2. **Join the circle (1 min)** — invite code `HACK-2026-01`, show members list: 4 Nigerians already in, you take the last slot, circle auto-activates. Explain Ajo/ROSCA in one sentence.
3. **Pay your contribution (2.5 min)** — tap CONTRIBUTE → app shows a **dynamic Nomba virtual account** created just for you+this cycle. Transfer ₦100 from your real bank app. Talking point while waiting: *"the backend confirms deposits straight from Nomba's transaction ledger — webhook-independent, settles within 60 seconds."* The screen flips to **ROUND CLEARED** on its own (background poll).
4. **Everyone else pays (1 min)** — run: `POST /contributions/simulate-all { "circle_id": "<id>" }` (Swagger, pre-opened) — dummies settle instantly. Narrate: in production these are the other members' real transfers or **auto-debit mandates** (show the toggle in the Admin tab — Nomba Direct Debit API, pending account provisioning).
5. **The payout (2 min)** — the instant the pot completes, the backend fires a **real Nomba bank transfer** of ₦500 to your account (auto-trigger + 2-min sweep). Show the credit alert on your phone / bank app. Close: reliability score went up, cycle advances, next member queues up. *Community finance, reimagined.*

---

## Fallbacks

- **Real transfer slow to confirm** → keep talking through the reliability score screen; reconciliation runs every 60s. Worst case use the dev **"Simulate payment"** link in the deposit sheet.
- **Payout doesn't land** (shared wallet drained mid-demo) → show the `Payout` attempt in `GET /payouts/:circleId` + the WhatsApp admin alert, and narrate: "on a dedicated merchant account this is instant — this wallet is shared by every hackathon team."
- **WhatsApp OTP down** → OTP is logged server-side (`[OTP]` in Render logs); read it from there and keep moving.

## One-liners to have ready

- "Every contribution gets its own **virtual account** — reconciliation is automatic, no 'send proof of payment' screenshots like real Ajo groups."
- "We never trust the client or a single webhook — deposits are verified against **Nomba's transaction ledger**."
- "Payouts are **hands-free**: last payment in, transfer out. The thing Ajo admins get accused of stealing? Removed from the loop."
