# Plutus (formerly Guilded) — Full Review, Monetization Roadmap, and Naming Decision

_Reviewed July 2026 against commit `15118f8` (post-scaffold merge); naming
decision and curriculum build-out recorded in later updates._

## 1. Where the product actually stands

The core machinery is real and well-shaped: tiered RBAC (`lib/tiers.ts`),
server-side consultation discount rules (`lib/consultation.ts`), AI caps by
tier, Stripe subscription + one-time checkout, and an LMS data model. The
business rules that guard revenue (discount eligibility, cap enforcement,
tier gating) are the strongest part of the codebase and are now covered by
automated tests.

Honest gaps between "scaffold" and "ready to ship":

- **The paid value props are empty pages.** `/dashboard/templates`,
  `/dashboard/journey`, and (mostly) `/dashboard/arbitration` render a
  heading and nothing else. Seeded lesson content is placeholder text.
  Nobody can be charged for this yet — content is the ship-blocker, not code.
- **No subscription self-management.** There is checkout but no Stripe
  billing portal link, so a subscriber cannot cancel, change card, or
  upgrade/downgrade without emailing you. That is a refund/chargeback
  machine.
- **No password reset, no email verification, no transactional email at all.**
- **No rate limiting** on `/api/auth/register` or `/api/ai`.
- **No committed Prisma migrations and no CI.** `prisma/migrations/` does not
  exist; the schema has never been snapshotted.
- **Legal surface:** the app is education-only by design (good — the AI
  disclaimer is enforced server-side), but a product this close to credit
  repair should have TOS/privacy pages and CROA-aware copy reviewed by a
  lawyer before money changes hands.

## 2. What this pass added

**Synthetic credit report test kit** (`fixtures/credit-reports/`,
`types/credit-report.ts`, `scripts/`):
six fictitious personas spanning the full derogatory spectrum — clean
control, scattered lates, collections + charge-off, discharged Chapter 7,
repossession + judgment + tax lien, and a kitchen-sink profile with a
Chapter 13 and foreclosure. Each ships as validated JSON plus a
human-readable tri-bureau-style text report for beta testers. A
deterministic generator (`npm run fixtures:generate`) produces them, and the
schema hard-codes the safety rails (mandatory disclaimer, never-issued
`999-XX-####` SSNs, fictional creditors).

**Test suite** (`npm test`, vitest, 27 tests): tier gating matrix, AI cap
table, all seven consultation-discount eligibility branches, and fixture
validation (schema, summary math, synthetic-data markers).

**Bug fixes:**

| Fix | File | Why it mattered |
| --- | --- | --- |
| Stripe webhook idempotency (`WebhookEvent` model, event-id dedupe) | `app/api/stripe/webhook/route.ts` | Stripe retries webhooks; a replay created duplicate consultations and double-counted billing cycles (which feeds discount eligibility) |
| Handle `customer.subscription.updated` + `invoice.payment_failed` | same | `PAST_DUE` existed in the schema but nothing ever set it; failed payments silently kept full access |
| Atomic AI-cap claim (conditional `updateMany`) with refund on provider error | `app/api/ai/route.ts` | Concurrent requests could exceed the monthly cap; an OpenAI outage returned a raw 500 and still burned quota |
| Malformed request bodies return 400, not 500 | `register`, `progress`, both `checkout` routes, `ai` | `schema.parse` threw unhandled ZodErrors |
| "Sign in" button no longer also submits the register form | `app/page.tsx` | Both handlers fired on every sign-in click |
| Register now surfaces errors and auto-signs-in on success | `app/page.tsx` | Previously registering did nothing visible — dead end at the top of the funnel |

Run `npx prisma migrate dev` after pulling — the `WebhookEvent` model needs a
migration.

## 3. Top monetization moves, in order

1. **Ship the dispute-letter generator as the flagship metered feature.**
   This is what DIY credit-repair customers actually pay for. The credit
   report schema added in this pass is the input format: user enters (or a
   future parser extracts) their tradelines/collections, picks a template,
   and gets a personalized letter. Meter it like AI messages (N letters/month
   per tier). Everything else on this list is optimization; this is product.
2. **Give Apprentice a taste of the AI.** 0 messages means free users never
   experience the thing that sells upgrades. Give 3/month; the cap response
   already returns `upgradeRequired`, so the upsell moment is built.
3. **Show locked content instead of hiding it.** `/api/modules` filters out
   modules above the user's tier, so free users don't know what they're
   missing. Return them with a `locked: true` flag and render them greyed
   out with the unlock price.
4. **Annual plans** (2 months free). One Stripe price per tier, no code
   beyond the price map. Instant LTV and cash-flow lift.
5. **Stripe billing portal + dunning.** Reduces involuntary churn and
   support load; `PAST_DUE` is now tracked so you can gate access and email
   "update your card" instead of losing the subscriber.
6. **One-time "DIY Dispute Toolkit" purchase ($49–$99)** for people who
   won't subscribe. The one-time checkout flow already exists for
   consultations — reuse it, deliver a template pack + mini-course.
7. **Referral/affiliate program aimed at community operators.** You built a
   25k-member group from scratch; the person running it now is your first
   affiliate. Even a simple coupon-code-per-partner scheme monetizes that
   channel without you operating a consumer business.
8. **Progress-triggered email drip.** `Progress` rows already record lesson
   completion; wire completion of the free module to an upgrade email, and
   inactivity to a re-engagement email.
9. **Anchor the strategy session.** The page shows $200/hour flat; render the
   member price crossed-out-vs-discounted and the "2 billing cycles"
   requirement as a countdown — it turns the discount rules you already
   enforce into a retention incentive users can see.
10. **White-label/B2B tier later.** Credit-repair educators and community
    operators (you know dozens) would pay $199–299/mo for this under their
    own brand. Multi-tenant is real work — park it until the consumer funnel
    converts.

## 4. Naming: does "Guilded" fit the Aegis universe?

Short answer: **no — rename it.** Two independent reasons:

1. **Trademark/SEO baggage.** Guilded (guilded.gg) was a major chat platform
   acquired by Roblox for $90M in 2021 and shut down December 19, 2025.
   The mark is recent, famous in software, and almost certainly still
   registered to Roblox. Searching "Guilded" returns a dead gaming product
   and its obituaries — terrible ground to build SEO on, and a real
   confusion/opposition risk for a software product with community features.
2. **Theme mismatch.** "Guilded" + Apprentice/Journeyman/Master is medieval
   guild imagery (internally consistent — except "Hero," which already
   breaks it). None of it connects to Aegis or Greek mythology. If Aegis is
   the umbrella brand, this product reads like it wandered in from a
   different franchise.

**DECIDED: the product is Plutus** — "the consumer's solution to bad
credit" — after the founder's own research beat this doc's original
shield/armor candidates (Aegis Academy, Athena, Panoply, Argus — retired).
Plutus is the Greek god of wealth: aspirational rather than defensive, which
matches what customers are actually buying, and still squarely inside the
Aegis Greek-mythology brand family. The founding-story hook: Zeus blinded
Plutus so wealth would be distributed without regard to merit; Aristophanes'
*Plutus* is about restoring his sight so prosperity reaches the deserving.
"We restore sight to wealth."

Clearance caveat: an active UK fintech named Plutus (plutus.it, crypto
rewards Visa card) has announced US expansion. Different trademark class
(education vs. financial services) and a compound mark ("Plutus Academy" /
"Plutus by Aegis") likely distinguish it — run a real clearance search
before printing anything.

Companion name: **Horkos** — the daimon who punishes broken financial
oaths — was considered for the product and correctly rejected (its energy
points at debtors, i.e., the customers). It is reserved instead as the name
of the dispute-letter **compliance-review engine**: every generated letter
"passes the Horkos check" before a user sees it.

Tier ladder: display labels are centralized in `TIER_LABELS`
(`lib/tiers.ts`) so a rename is a one-file change; currently they remain
Apprentice/Journeyman/Master/Hero pending a decision on a wealth-themed
ladder. Keep the Prisma enum values and Stripe products as-is regardless —
renaming display labels must not require a migration.

## 5. Suggested order of attack

1. Run the migration, wire CI to `npm test` + `tsc --noEmit` (suite is fast).
2. ~~Write/port the actual content: arbitration module, lesson bodies.~~
   **Done:** six-module curriculum in `content/curriculum.ts` (foundations,
   disputes, collections, bankruptcy, arbitration, rebuilding capstone) with
   a lesson viewer, progress tracking, and locked-module upsells. Remaining
   content gap: the Templates library page (letter templates as a browsable,
   fill-in-able library — natural precursor to the generator).
3. Billing portal + password reset + rate limiting.
4. Dispute-letter generator on top of the report schema (monetization #1),
   with the Horkos compliance-review pass.
5. ~~Rebrand before public launch.~~ **Done in-app:** Plutus name, tagline,
   and copy shipped; tier display labels centralized. Still to do outside
   the repo: trademark clearance search, domain, Stripe product names in the
   dashboard, and any social handles.
