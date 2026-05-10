# Guilded

Production-oriented educational credit literacy platform.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Prisma · NextAuth · Stripe · OpenAI

---

## Bootstrap (PostgreSQL — recommended)

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local install or Docker)
- Stripe account with test mode enabled
- OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random 32-byte string: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `STRIPE_SECRET_KEY` | Stripe test secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen --forward-to` output |
| `STRIPE_PRICE_JOURNEYMAN` | Stripe Price ID for $9/mo recurring price |
| `STRIPE_PRICE_MASTER` | Stripe Price ID for $39/mo recurring price |
| `STRIPE_PRICE_HERO` | Stripe Price ID for $79/mo recurring price |
| `OPENAI_API_KEY` | OpenAI API key |

### 3. Create and migrate the database

```bash
npx prisma migrate dev --name init
```

This creates all tables including `StripeEvent` for webhook idempotency.

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Seed initial LMS content

```bash
npm run prisma:seed
```

### 6. Start the dev server

```bash
npm run dev
```

### 7. Forward Stripe webhooks (separate terminal)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET` in `.env` and restart the server.

---

## Bootstrap (SQLite — no PostgreSQL required)

Use this path for GitHub Codespaces or machines without a PostgreSQL instance.

> **Note:** The SQLite schema uses string columns for enums. The generated Prisma
> client API is identical, but the client binary differs. Do **not** mix
> migration history between providers.

### 1–2. Install and configure environment (same as above)

Set this value in `.env`:

```env
DATABASE_URL="file:./dev.db"
```

All other variables remain the same.

### 3. Push schema to SQLite (no migration history)

```bash
npm run db:push:sqlite
```

### 4. Generate Prisma client for SQLite schema

```bash
npm run db:generate:sqlite
```

### 5. Seed (same command)

```bash
npm run prisma:seed
```

### 6–7. Start dev server and forward Stripe webhooks (same as PostgreSQL)

---

## Stripe Price Setup

In the Stripe Dashboard (test mode):

1. Create a **Product** called "Guilded Membership"
2. Add three **recurring monthly prices**:
   - $9.00/month → copy Price ID to `STRIPE_PRICE_JOURNEYMAN`
   - $39.00/month → copy Price ID to `STRIPE_PRICE_MASTER`
   - $79.00/month → copy Price ID to `STRIPE_PRICE_HERO`
3. Enable the following webhook events on your endpoint:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`

---

## Membership Tiers

| Tier | Price | AI Messages/mo | Arbitration Content |
|---|---|---|---|
| Apprentice | Free | None | No |
| Journeyman | $9/mo | 15 | No |
| Master | $39/mo | 100 | Yes |
| Hero | $79/mo | 300 | Yes |

---

## Consultation Pricing

Base rate: **$200/hour**

Discount eligibility (all conditions required):
- Active subscription
- At least 2 successful billing cycles
- Fewer than 4 discounted sessions in the past 365 days
- At least 60 days since the last discounted session
- Tier is Master or Hero

| Tier | Discounted Rate |
|---|---|
| Master | $150/hour |
| Hero | $100/hour |

Pricing is always computed server-side. The client never sends or determines a price.

---

## Key Security Properties

**Tier never in JWT.** Every request that needs tier access fetches the user
record live from the database. Subscription changes take effect immediately
on the next API call.

**AI rate limiting is atomic.** The counter check and increment happen in a
single `updateMany WHERE aiUsageCount < limit` database operation. Two
concurrent requests cannot both bypass a full cap.

**Webhook idempotency.** Each event is processed inside a Prisma transaction.
The first step inserts the Stripe event ID (`evt_xxx`) as a primary key. A
duplicate delivery fails that insert, rolls back the transaction, and returns
200 without re-applying business logic.

**Locked content never returned.** `GET /api/lessons/[id]` returns 403 with
no content if the user's tier is insufficient. The modules listing returns only
metadata — never lesson body text.

**Progress marking is tier-verified.** `POST /api/progress` fetches the lesson
and its parent module from the database and checks `canAccess(user.tier,
module.requiredTier)` before upserting. A lower-tier user cannot mark a
locked lesson complete by calling the API directly.

---

## API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | None | Create account |
| `/api/auth/[...nextauth]` | GET/POST | None | NextAuth handlers |
| `/api/ai` | POST | JWT | AI query (tier + monthly cap enforced) |
| `/api/modules` | GET | JWT | Tier-filtered module list (no content) |
| `/api/lessons/[id]` | GET | JWT | Full lesson content (tier-gated) |
| `/api/progress` | POST | JWT | Mark lesson complete (tier-verified) |
| `/api/consultations/eligibility` | GET | JWT | Pricing and discount eligibility |
| `/api/consultations/checkout` | POST | JWT | Create consultation Stripe session |
| `/api/stripe/checkout` | POST | JWT | Create subscription Stripe session |
| `/api/stripe/webhook` | POST | Stripe sig | Webhook handler (idempotent) |
