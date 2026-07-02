# Plutus (formerly Guilded) — Pre-Launch Audit
*Read-only audit · July 2, 2026 · Launching Friday July 4 to a 25k-member DIY credit repair Facebook group*

---

## 1. FEATURE INVENTORY

All features below were verified against actual routes, components, and backend endpoints. The deployed frontend is `web/` (confirmed via `start.sh:18,151-154`, `exec-web.sh:3`); the root-level `app/` + `prisma/` tree is a **legacy, non-deployed** app.

### Working end-to-end

| Feature | Frontend | Backend | Notes |
|---|---|---|---|
| **Signup / login / invite codes** | `/` (HomePageClient) | `POST /api/auth/register`, `/login`, `GET /me` | NextAuth JWT, bcrypt hashing, optional beta invite-code gating |
| **Password reset** | `/forgot-password`, `/reset-password` | `POST /forgot-password`, `/reset-password` | 1h single-use tokens + email template — **exists only in uncommitted code** (see Blockers) |
| **Credit report audit** | `/dashboard/audit/start` → `verify` → `snapshot` → `results` | 8 endpoints in `api/app/domains/audit/` | Real pipeline: pdfplumber OCR → regex PII scan & redaction (SSN, DOB, acct #s) → GPT-4o-mini account extraction with per-account confidence scores → risk score + tiered recommendations. 20MB limit, raw PDF deleted after extraction, "safety receipt" shows user what PII was masked |
| **Account verification/correction** | `/dashboard/audit/[id]/verify` | `PATCH .../accounts/{id}` | User can edit OCR mistakes before analysis; edits tracked |
| **Dispute letter drafting** | `/dashboard/disputes`, `/disputes/[id]` | `POST /api/dispute/generate` | Real AI generation (not templates): 4 strategies (validation, goodwill, FCRA dispute, pay-for-delete), 8 context flags (identity theft, already paid, medical, military…), per-bureau targeting, FCRA §611 / FDCPA §809(b) citations. User views/edits/downloads and mails it themselves |
| **Academy (7 modules)** | `/dashboard/academy`, `/academy/[slug]` | modules/lessons/progress endpoints | Tier-gated curriculum, audit-findings→module recommendations (e.g., collections found → dispute-process module), completion tracking |
| **XP / ranks / command center** | `/dashboard/command-center` | `academy/xp/*` | XP events (audit 100, dispute 75, module 50), rank progression, badges, activity timeline. Idempotent awards |
| **Guild Counsel AI chat** | `/dashboard/ai` + slide-out drawer | `POST /api/ai` | Tier caps enforced server-side with row-level locking (5/20/100/300 msgs), usage meter, upgrade modal on cap |
| **Billing** | `/dashboard/upgrade`, `/dashboard/account` | Stripe checkout + webhook | Subscriptions (Journeyman/Master), one-time Founders Pass (grants lifetime Master), promo codes, idempotent signature-verified webhooks, cancel→downgrade (lifetime protected) |
| **Strategy session booking** | `/dashboard/strategy-session` | `/api/consultations/*` | Server-side pricing ($200 base; $150 Master / $100 Hero loyalty rate with strict eligibility rules), Stripe one-time checkout |
| **Loot Ledger (net worth)** | `/dashboard/loot-ledger` | 7 `/api/ledger/*` endpoints | Accounts + transactions + assets-vs-debts summary. Works, but not in sidebar nav (out of beta scope per BETA_NOTES) |
| **Templates library** | `/dashboard/templates` | static | Educational explanations of the 4 letter strategies |
| **Support + feedback** | `/dashboard/support`, `/support` | `POST /api/feedback` | Feedback widget with rating + notes |
| **Admin dashboard** | `/dashboard/admin` | 14+ `/api/admin/*` endpoints | Stats, conversion funnel, AI cost estimates, at-risk users, OCR correction analytics, webhook health, invite-code management, test-email sender. Email-whitelist gated |
| **Transactional email** | — | Resend (console fallback) | Welcome, verification, password reset, audit complete, onboarding milestone, support confirmation |
| **Legal/compliance pages** | `/terms`, `/privacy`, `/ai-disclaimer`, `/security` | static | Solid CROA-conscious language throughout |

### Partial / half-built (be honest about these)

- **Bankruptcy tracker** — backend case CRUD + step tracking fully built (`api/app/domains/bankruptcy/`), but the UI at `/dashboard/bankruptcy` still says *"Case tracking functionality is coming soon"* (`bankruptcy/page.tsx:94`). Educational Ch. 7/13 content works.
- **`/preview/*` routes** — 6 demo pages rendering hardcoded `demo-data.ts` content, including a **fake-testimonials "social proof" page**, publicly reachable (middleware only protects `/dashboard/*`). Demo data is otherwise fully isolated from production paths.
- **Arbitration page** — `/dashboard/arbitration` is a blurred teaser that upsells Master; the real content is Academy module 7. Works as designed, but it's a paywall page, not a feature.

---

## 2. MARKETING BULLETS

*CROA-safe: self-help framing only, verified against what actually ships. No score claims, no removal claims, no guarantees.*

- 📄 **Upload your credit report, get it decoded.** Plutus reads your report PDF and lays out every account, balance, and status in plain English — with your SSN and account numbers automatically masked before any analysis happens.
- 🔍 **Know where to start.** The AI review flags items on your report that may be worth a closer look and organizes them by priority — so you spend your energy where it matters, not staring at 40 pages of bureau-speak.
- ✍️ **The paperwork, done in minutes — by you, for you.** Draft your own dispute, debt-validation, goodwill, and pay-for-delete letters with the correct FCRA/FDCPA citations built in. You review it, you sign it, you mail it. Plutus never sends anything on your behalf.
- 🎓 **Learn the law you're using.** A 7-module Academy walks you through your rights under the FCRA and FDCPA — from reading your report to advanced tactics like debt arbitration.
- 💬 **A guide on call.** Ask the built-in AI counsel your credit questions any time — educational guidance, available 24/7 (not legal advice).
- 📊 **Track the whole journey.** Earn XP and rank up as you complete audits, letters, and lessons — plus a net-worth ledger to watch the bigger financial picture.
- 🆓 **Start free.** The free tier includes a full report upload, analysis, foundational training, and letter drafting — upgrade only if you want more.
- 🛡️ **This is a self-help tool, not a credit repair company.** Nobody disputes anything for you, and nobody can promise outcomes — Plutus gives you the knowledge, drafts, and tracking to exercise your own legal rights.

---

## 3. LAUNCH BLOCKERS

### 🔴 CRITICAL — fix before Friday

1. **Auth secret committed to git.** `web/.env.local` (containing `NEXTAUTH_SECRET` and `NEXTAUTH_URL`) is tracked and was committed in `db64248` — and this repo has a GitHub remote. Anyone with repo access can forge sessions. **Rotate the secret, `git rm --cached web/.env.local`, add to `.gitignore`.**
2. **Contradictory pricing shown to users.** The upgrade modal (shown at every tier gate) says **$19/mo Journeyman, $47/mo Master** (`web/components/modals/UpgradeModal.tsx:15,21`), while the landing page, upgrade page, account page, and `web/lib/tiers.ts:13-14` all say **$25 and $49**. Live-Stripe docs (`LIVE_BILLING_VALIDATION.md:171-172`) show Journeyman at $19 and Master as literally **"TBD"**. A customer will see two different prices before checkout, then possibly a third at Stripe. Pick the price, verify the live Stripe price IDs, align all five surfaces.
3. **The running product diverges from git.** Password reset, invite codes, the PII safety receipt, account editing, and ~729 lines of admin telemetry exist only as **uncommitted working-tree changes** (`auth/router.py`, `admin/router.py`, `audit/*`, `config.py`). Any redeploy from git silently deletes week-1-critical features (a customer who forgets their password would be locked out). Commit before launch.
4. **Email delivery may be off.** Per `BETA_NOTES.md`, `RESEND_API_KEY` unset means all email (verification, password reset, welcome) logs to console and is never delivered — with no user-facing error. Set the key and confirm via the `POST /api/admin/test-email` endpoint.

### 🟠 HIGH — embarrassing in week 1

5. **"5 AI questions/week" is false advertising.** Landing page sells the free tier as 5 questions *per week*, but the backend resets counters every 30 days — free users actually get 5 *per month* (`web/lib/tiers.ts:25-27` admits this discrepancy in a comment). For a launch into a credit-repair community, don't ship a misleading usage claim.
6. **Fake testimonials publicly reachable.** `/preview/social` (hardcoded testimonials) and 5 other demo pages are unauthenticated. If a group member finds them, fabricated success stories are a serious CROA-optics problem. Gate or delete `/preview/*`.
7. **Bankruptcy page contradicts itself.** UI says case tracking is "coming soon" while the backend fully supports it — a paying customer sees a half-built page. Either wire the UI or remove the route.
8. **No `og:image`.** This launch *is* a Facebook post — right now shared links render with a blank preview (`LAUNCH_HARDENING.md:451`).
9. **Zero error monitoring.** `LAUNCH_HARDENING.md:292`: "no error monitoring is active." A 25k-member traffic spike with invisible 500s means customers find your bugs before you do.

### 🟡 MEDIUM — survivable, plan for it

10. **Scanned/photo PDFs fail.** No image OCR — a phone-scanned report gets a (friendly) rejection. Expect this constantly from a Facebook audience; put "digital PDF from AnnualCreditReport.com" guidance in the launch post and upload UI.
11. **No analytics.** PostHog key unset — no funnel visibility during the most important week.
12. **Fair-use enforcement disabled** (`config.py: fair_use_enabled=False`) — acceptable at beta scale, watch AI spend via `/api/admin/costs`.
13. **Stale internal docs/checklists** (`admin/ops` page lists already-built features as TODO; Master live price "TBD") — confusing for anyone operating the launch.

---

## 4. REBRAND SURFACE — every user-visible "Guilded"

**Zero "Plutus" strings exist anywhere in the codebase yet** (`PLUTUS_AUDIT.md` is empty). ~55+ user-visible occurrences to change:

### Global metadata & SEO — `web/app/layout.tsx`
- Lines 17-18: default title `"Guilded"`, template `"%s | Guilded"`
- Lines 23, 28: base/OG URL `https://guilded.jesseboudreau.com`
- Lines 29-30, 40: OG siteName `"Guilded"`, OG + Twitter title `"Guilded — Financial Recovery. Structured. Strategic. Protected."`

### Page titles (11 files)
`terms`, `privacy`, `support`, `security`, `ai-disclaimer` + all 6 `preview/*` pages — each has `"… — Guilded"` metadata (e.g., `web/app/terms/page.tsx:6`).

### Landing page — `web/app/HomePageClient.tsx`
~13 mentions: logo text (lines 248, 599), hero copy (275), "How Guilded works" (323), 4 FAQ questions/answers (86-103), step description (117), footer legal disclaimer (469).

### Navigation & app chrome
- Sidebar logo: `web/components/sidebar.tsx:158, 175`
- Legal page headers: `terms/page.tsx:24`, `privacy/page.tsx:23`
- Onboarding flow: `web/components/onboarding/OnboardingFlow.tsx:18, 90` ("Guild Counsel", "Guild AI")

### Legal body copy
- Terms: ~7 mentions (`terms/page.tsx:31-59`) · Privacy: ~4 mentions (`privacy/page.tsx:37-64`) · AI disclaimer: (`ai-disclaimer/page.tsx:25-32`)

### Emails (highest-stakes — these land in inboxes Friday)
- **Sender**: `Guilded <guilded@mail.jesseboudreau.com>`, reply-to `guilded@jesseboudreau.com` (`.env.example:77`, `email/config.py`) — needs a new verified Resend domain/sender
- **Subjects** (`email/service.py:152, 177, 202`): "Welcome to Guilded…", "Verify your Guilded email address", "Reset your Guilded password"
- **Bodies**: `welcome.html:10,15,54` (incl. "Your Guild rank: Apprentice"), `verification.html:3,14,32`, `password_reset.html:3,19`, `_macros.html:72,110` (header logo + `© Guilded · Early Access` footer)
- **Support ticket prefix** `[GLD-###]` in support confirmation

### Support & contact
- Support email `guilded@jesseboudreau.com` shown on `/support` (`support/page.tsx:42-45`), `/terms:68`, `/privacy:60,64`
- FAQ "Is Guilded a credit repair company?" (`support/page.tsx:57`)

### Sub-brand decision needed: **"Guild Counsel"**
The AI assistant's name appears in ~12 places (`GuildCounselDrawer.tsx:143,194,288,365,386`, `sidebar.tsx:39`, `dashboard/support/page.tsx:56,63,72`, `ai-disclaimer` throughout, AI page). Related: tier names (Apprentice/Journeyman/Master/Hero) and "Guild rank" in the welcome email are guild-themed. Decide whether the guild motif survives the Plutus rebrand — it's woven into the product identity, not just strings.

### Content
- Academy markdown: `web/public/academy-content/01-…md:36,80` and `06-…md:102-106` ("Guilded's audit workflow…")
- `curriculum_intermediate.json:2832`: "Guilded Member Forums"

### Infrastructure users can see
- Domains: `guilded.jesseboudreau.com` / `guilded-api.jesseboudreau.com` (`web/.env.local:1-2`, layout metadata, CORS in `api/app/main.py:97`) — new domains require Cloudflare tunnel + NEXTAUTH_URL + CORS + Stripe webhook URL updates
- API responses: `/health` → `"service": "guilded"` (`main.py:192`), `/whoami` → `"Guilded API"` (`main.py:197`), `.well-known/aegis-meta` → `"pack_name": "Guilded"` (`main.py:204`)

### ✅ Already clean
- **Generated dispute letters contain no brand name** (verified `dispute/prompts.py`, `audit/prompts.py`) — letters users mail to bureaus are rebrand-safe as-is.
- ~90+ internal occurrences (shell scripts, systemd unit names `guilded-web`/`guilded-api`, DB name, docs, comments) are **not** launch-blocking.
