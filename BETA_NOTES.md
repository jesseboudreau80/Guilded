# Guilded Beta Notes
## Known Issues, Limitations & Launch Status

**Date:** May 2026  
**Status:** Controlled Beta — first 10–25 invited users  
**Confidence:** High for core flows, moderate for billing edge cases

---

## ✅ Verified Working

| System | Status | Notes |
|---|---|---|
| User registration & login | ✅ Stable | |
| PDF audit upload (text-based PDFs) | ✅ Stable | See known issue #1 |
| Account extraction (OpenAI) | ✅ Stable | Subject to OpenAI availability |
| Audit analysis & risk scoring | ✅ Stable | ~30–90s processing time |
| Recovery Snapshot page | ✅ Stable | First-time audit only |
| Guild Academy (7 modules) | ✅ Stable | Content renders from markdown |
| XP / rank system | ✅ Stable | Awards XP on module completion |
| Dispute letter generation | ✅ Stable | 4 strategy types |
| Guild Counsel drawer | ✅ Stable | Persists across navigation |
| Stripe billing (Journeyman / Master) | ✅ Stable | Requires live keys in production |
| Admin panel | ✅ Stable | Email-gated to admin address |
| Support page | ✅ Stable | mailto link, no backend form yet |

---

## ⚠️ Known Limitations (Beta)

### #1 — Image-only PDFs not supported
**Impact:** Medium  
**Users affected:** Anyone with a scanned-only credit report PDF  
**Behavior:** Upload succeeds, extraction returns 0 accounts, user sees "No accounts detected"  
**Workaround:** Use a PDF downloaded directly from AnnualCreditReport.com or bureau website (not a scanned copy)  
**Fix:** Requires OCR integration (Tesseract or AWS Textract) — Phase 4

### #2 — Email system not sending yet
**Impact:** Low (beta users are directly invited)  
**Users affected:** All users  
**Behavior:** Welcome emails, audit complete emails logged to console instead of sent  
**Workaround:** Manually email users from support@guilded.finance  
**Fix:** Set `RESEND_API_KEY` in production environment — infrastructure is ready

### #3 — Mission completion is session-only
**Impact:** Low  
**Users affected:** All  
**Behavior:** Daily mission checkboxes reset on page refresh  
**Workaround:** This is cosmetic — actual progress (XP, module completion) persists  
**Fix:** `POST /api/missions/complete` endpoint — Phase 4

### #4 — Streak calculation limited to last 10 events
**Impact:** Low  
**Users affected:** Users with >10 XP events in a streak  
**Behavior:** Streak counter may undercount for power users with many events  
**Workaround:** None needed for beta (unlikely to exceed in week 1)  
**Fix:** Add `GET /api/academy/xp/streak` server-side endpoint — Phase 4

### #5 — No email verification flow
**Impact:** Low for beta (invited users only)  
**Users affected:** New self-registered accounts  
**Behavior:** Accounts are immediately active without email verification  
**Workaround:** Acceptable for invited beta cohort  
**Fix:** Resend email verification via NextAuth email provider — Phase 4

### #6 — No forgot/reset password flow
**Impact:** Medium if user loses password  
**Users affected:** Users who forget their password  
**Behavior:** No "forgot password" link on login form  
**Workaround:** Admin can manually reset via DB, or user can re-register  
**Fix:** Token-based reset endpoint + Resend email — Phase 4

### #7 — Billing portal link not connected
**Impact:** Low (Stripe dashboard is the workaround)  
**Users affected:** Paid subscribers wanting to update payment method  
**Behavior:** Account page shows subscription status but no portal link  
**Workaround:** Users can email support to update billing  
**Fix:** Stripe Customer Portal API integration — Phase 4

### #8 — No analytics in production yet
**Impact:** Low (operational)  
**Users affected:** Operators  
**Behavior:** PostHog CDN script loads but no key configured  
**Fix:** Set `NEXT_PUBLIC_POSTHOG_KEY` in production `.env`

### #9 — No Sentry error monitoring
**Impact:** Low for beta (small user count, easy to monitor logs directly)  
**Users affected:** Operators  
**Fix:** `npx @sentry/wizard@latest -i nextjs` then set `SENTRY_DSN`

### #10 — Loot Ledger and Bankruptcy Guide are legacy pages
**Impact:** None (not in sidebar, not actively linked)  
**Users affected:** None unless URL is directly typed  
**Behavior:** Pages exist but are not part of the current product scope  
**Fix:** Remove from codebase or repurpose — Phase 4

---

## 🚫 Out of Scope for Beta

- Password reset via email
- Email verification
- Long-term AI conversation memory (server-side)
- Dispute resolution tracking
- Bureau dispute status monitoring
- Mobile app
- Multi-bureau simultaneous dispute filing
- Credit monitoring integration

---

## 📋 Pre-Launch Checklist

Before inviting the first user, confirm:

- [ ] `NEXTAUTH_SECRET` — strong value, not the default
- [ ] `STRIPE_SECRET_KEY` — production key (sk_live_...)
- [ ] `STRIPE_JOURNEYMAN_PRICE_ID` — production price ID
- [ ] `STRIPE_MASTER_PRICE_ID` — production price ID
- [ ] `OPENAI_API_KEY` — confirmed working with a test audit
- [ ] `NEXT_PUBLIC_API_URL` — points to production backend
- [ ] `NEXTAUTH_URL` — matches the production domain
- [ ] Run QA checklist at `/dashboard/admin/qa` — all critical items passing
- [ ] Test one complete audit end-to-end with a real PDF
- [ ] Confirm admin panel accessible at `/dashboard/admin`
- [ ] Confirm `support@guilded.finance` email is monitored

---

## 🎯 Recommended Launch Timing

**Ready for beta:** Yes, with known limitations documented above  
**Recommended cohort:** 5–10 personally invited users in week 1  
**Expansion to 25:** After verifying no critical bugs from first cohort  

**Highest-risk retention moment:** The 24–48h window after signup.  
If a user doesn't complete an audit in this window, they often don't return.  
**Action:** Send a personal email to every user who signs up but doesn't run an audit within 24h.

---

## 📞 Support Escalation

| Issue Type | Response Target | Action |
|---|---|---|
| App crash / white screen | Same day | Check server logs, deploy fix |
| Billing issue | Same day | Handle via Stripe dashboard |
| Audit not processing | 24h | Check OpenAI status, retry manually |
| Feature request | Next weekly review | Log in FounderFeedback pattern |
| Legal/compliance question | 48h | Direct to terms/ai-disclaimer, no legal advice |
