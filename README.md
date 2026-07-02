# Plutus

Plutus — the consumer's solution to bad credit — is a production-oriented educational credit literacy platform built with Next.js App Router, Prisma, PostgreSQL, NextAuth, Stripe, and OpenAI. (Formerly "Guilded"; renamed after the platform joined the Aegis brand family.)

## Features included

- Tiered SaaS memberships (Apprentice, Journeyman, Master, Hero)
- RBAC middleware + server-side gating for modules and arbitration
- Full LMS (Module, Lesson, Progress) with a six-module curriculum in
  `content/curriculum.ts`: foundations, disputes, collections, bankruptcy,
  arbitration, and a rebuilding capstone — seeded via `npx prisma db seed`
- AI assistant with monthly cap enforcement by tier
- Mandatory educational disclaimer prepended to every AI response
- Subscription checkout + Stripe webhook synchronization
- Strategy session one-time checkout with strict discount eligibility rules
- Consultation tracking with `tierAtPurchase` snapshot + rolling 365-day checks

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS (dark-mode default)
- Prisma ORM + PostgreSQL
- NextAuth
- Stripe (subscriptions + one-time checkout + webhooks)
- OpenAI API
- Zod validation

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate Prisma client and migrate:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
4. Run development server:
   ```bash
   npm run dev
   ```

## Testing

```bash
npm test            # vitest suite (business logic + fixture validation)
npm run typecheck   # tsc --noEmit
```

Synthetic credit report fixtures for testers live in `fixtures/credit-reports/`
(six fictitious personas from clean baseline to bankruptcies and
repossessions). Regenerate with `npm run fixtures:generate`. See
`fixtures/credit-reports/README.md` and `docs/REVIEW.md`.

## Stripe notes

- Set product price IDs via `STRIPE_PRICE_JOURNEYMAN`, `STRIPE_PRICE_MASTER`, and `STRIPE_PRICE_HERO`.
- Webhook endpoint is `POST /api/stripe/webhook` and requires raw-body signature verification.
- Invoice success increments `successfulBillingCount`.
- Failed invoices and `customer.subscription.updated` sync `PAST_DUE` status.
- Subscription deleted event sets user back to Apprentice + canceled status.
- Webhook processing is idempotent: event IDs are recorded in `WebhookEvent`
  so Stripe retries cannot duplicate consultations or billing counts.

## AI guardrails

- Apprentice: no AI access
- Journeyman: 15 messages/month
- Master: 100 messages/month
- Hero: 300 messages/month
- Hard block on cap exceed with upgradeRequired response
- Every answer is prefixed with educational-only disclaimer

## Consultation pricing logic

Base: `$200/hour`.

Discounts available only for eligible users:
- Master: `$150`
- Hero: `$100`

Eligibility requires:
- active subscription
- at least 2 successful billing cycles
- fewer than 4 discounted sessions in last 365 days
- at least 60 days since last discounted session

Pricing is calculated server-side only and persisted on purchase.
