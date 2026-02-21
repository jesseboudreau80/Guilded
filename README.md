# Guilded

Guilded is a production-oriented educational credit literacy platform built with Next.js App Router, Prisma, PostgreSQL, NextAuth, Stripe, and OpenAI.

## Features included

- Tiered SaaS memberships (Apprentice, Journeyman, Master, Hero)
- RBAC middleware + server-side gating for modules and arbitration
- LMS scaffold (Module, Lesson, Progress)
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

## Stripe notes

- Set product price IDs via `STRIPE_PRICE_JOURNEYMAN`, `STRIPE_PRICE_MASTER`, and `STRIPE_PRICE_HERO`.
- Webhook endpoint is `POST /api/stripe/webhook` and requires raw-body signature verification.
- Invoice success increments `successfulBillingCount`.
- Subscription deleted event sets user back to Apprentice + canceled status.

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
