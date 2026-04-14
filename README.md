# Guilded — Credit Literacy SaaS Platform

> **Educational Platform Disclaimer:** Guilded is an educational credit literacy platform. It is NOT a credit repair organization and does not perform credit repair services. All content is provided for educational purposes only. Results vary and nothing constitutes a guarantee of credit score improvement.

## Overview

Guilded is a production-ready, tier-based SaaS membership platform for credit education, featuring:

- **Structured LMS** — Tier-gated learning modules and lessons
- **AI Assistant** — Monthly-capped, educational AI with usage tracking
- **Arbitration Module** — Advanced consumer rights education (Master+)
- **Strategy Sessions** — Stripe one-time checkout with rolling eligibility rules
- **Stripe Subscriptions** — Full webhook handler, billing portal integration

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS (dark mode default) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | NextAuth v5 (JWT + Credentials + Google) |
| Payments | Stripe (Subscriptions + One-time) |
| AI | OpenAI GPT-4o-mini |
| Validation | Zod |
| Access Control | Middleware RBAC |

---

## Membership Tiers

| Tier | Price | AI Messages/mo | Key Features |
|---|---|---|---|
| Apprentice | Free | 0 | Intro modules, limited templates |
| Journeyman | $9/mo | 15 | Full LMS, templates, AI access |
| Master | $39/mo | 100 | + Arbitration module, $150 sessions |
| Hero | $79/mo | 300 | Everything unlocked, $100 sessions |

---

## Consultation Discount Rules

To qualify for discounted strategy session pricing:

1. Active Master or Hero subscription
2. >= 2 successful billing cycles
3. <= 3 prior discounted sessions in rolling 365-day window
4. >= 60 days since last discounted session

**All pricing is determined server-side.** Client code never determines price.

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Stripe account
- OpenAI API key

### Installation

```bash
# Clone and install
git clone <repo>
cd guilded
npm install

# Configure environment
cp .env.example .env
# Fill in all values in .env

# Set up database
npm run db:generate
npm run db:push

# Start development
npm run dev
```

### Stripe Configuration

1. Create 3 subscription products in Stripe Dashboard:
   - Journeyman: $9/month
   - Master: $39/month
   - Hero: $79/month

2. Add price IDs to `.env`

3. Configure webhook endpoint:
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events: `customer.subscription.*`, `invoice.payment_*`, `checkout.session.completed`

4. Enable Stripe Billing Portal in Dashboard settings

### Stripe Local Testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## Project Structure

```
guilded/
├── app/
│   ├── (auth)/              # Login, Register pages
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── journey/         # Progress tracker
│   │   ├── modules/         # LMS modules + lessons
│   │   ├── templates/       # Document templates
│   │   ├── arbitration/     # Master+ exclusive content
│   │   ├── ai-assistant/    # AI chat interface
│   │   ├── strategy-session/ # Consultation booking
│   │   ├── account/         # Account settings
│   │   └── upgrade/         # Pricing / upgrade page
│   ├── api/
│   │   ├── auth/            # NextAuth + registration
│   │   ├── ai/              # Chat + usage endpoints
│   │   ├── stripe/          # Checkout, portal, webhook
│   │   ├── consultations/   # Eligibility + booking
│   │   ├── lms/             # Modules, lessons, progress
│   │   └── user/            # User profile
│   ├── layout.tsx
│   └── page.tsx             # Landing page
├── components/
│   ├── ai/                  # AI chat UI
│   ├── dashboard/           # Sidebar, cards, modals
│   ├── lms/                 # Lesson components
│   └── ui/                  # Button, Card, Badge, Input
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client singleton
│   ├── stripe.ts            # Stripe client
│   ├── openai.ts            # OpenAI client + disclaimer
│   ├── ai-usage.ts          # Usage checking/incrementing
│   ├── consultation.ts      # Eligibility logic
│   ├── tier.ts              # Tier comparison utilities
│   └── utils.ts             # Utility functions
├── prisma/
│   └── schema.prisma        # Full database schema
├── types/
│   └── index.ts             # Shared types, constants
├── middleware.ts             # RBAC route protection
└── .env.example
```

---

## Security

- **RBAC Middleware** — All dashboard routes protected by session + tier checks
- **Server-side pricing** — Consultation and subscription prices are NEVER determined client-side
- **Stripe signature verification** — All webhook events validated with stripe-signature header
- **Idempotent webhook processing** — Stripe events stored to prevent duplicate processing
- **Content gating** — Locked module content never returned from API
- **Zod validation** — All API inputs validated at the boundary
- **No client-side tier enforcement** — All access decisions made server-side

---

## Phase 2 Roadmap

- Admin analytics dashboard
- AI usage charts per tier
- Rate limiting middleware
- Credit report PDF upload + parsing
- Smart dispute sequencing engine
- Feature flags system
- Email notifications

---

## License

Proprietary. All rights reserved.
