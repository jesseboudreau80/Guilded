# Guilded Beta Launch Checklist

**Version:** Closed Beta 1.0  
**Target cohort:** 5–25 invited testers  

---

## ✅ Pre-Launch Technical (Must Pass)

### Environment
- [ ] `NEXTAUTH_SECRET` — strong value, not the default placeholder
- [ ] `STRIPE_SECRET_KEY` — production key (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` — production webhook secret (`whsec_...`)
- [ ] `STRIPE_JOURNEYMAN_PRICE_ID` — production price ID
- [ ] `STRIPE_MASTER_PRICE_ID` — production price ID
- [ ] `OPENAI_API_KEY` — confirmed working
- [ ] `RESEND_API_KEY` — verified sending domain test passed
- [ ] `NEXT_PUBLIC_API_URL` — points to production backend
- [ ] `NEXTAUTH_URL` — matches production domain
- [ ] `BETA_INVITE_REQUIRED` — set to `true` for controlled rollout

### Verification Tests
- [ ] Register with invite code → welcome email received
- [ ] Upload real credit report PDF → accounts extracted with confidence scores
- [ ] Complete full audit → risk score + recommendations generated
- [ ] Run audit results → locked recommendations visible at APPRENTICE tier
- [ ] Generate dispute letter → Stripe-hosted page opens on upgrade click
- [ ] Complete Stripe checkout (test mode) → tier upgrades correctly
- [ ] Guild Counsel responds to AI query
- [ ] Module completes → XP awarded
- [ ] Admin panel loads at `/dashboard/admin` with correct stats
- [ ] `/api/admin/test-email` sends successfully to your address
- [ ] Image-only PDF → friendly error, not crash

### QA Checklist
- [ ] Complete the interactive QA checklist at `/dashboard/admin/qa`
- [ ] All **critical** items checked green

---

## ✅ Pre-Launch Operational

### Monitoring
- [ ] Server logs accessible (check `start.sh` output / Cloudflare tunnel)
- [ ] Admin panel bookmarked for daily ops
- [ ] `support@guilded.finance` inbox monitored
- [ ] Stripe dashboard accessible
- [ ] OpenAI usage dashboard bookmarked

### Content
- [ ] Terms of Service reviewed
- [ ] Privacy Policy reviewed
- [ ] AI Disclaimer reviewed
- [ ] Security page reviewed

---

## 🚀 Beta Cohort Management

### Invite Code Operations
```bash
# Create 10 single-use codes
curl -X POST /api/admin/invite-codes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"count": 10, "max_uses": 1, "note": "cohort-1-may-2026"}'

# List all codes + usage
curl /api/admin/invite-codes -H "Authorization: Bearer $ADMIN_TOKEN"

# Deactivate a code
curl -X DELETE /api/admin/invite-codes/ABCD1234 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Beta Tester Onboarding Script
1. Send personal invite email with code
2. Include link to guilded.jesseboudreau.com
3. Ask them to complete the audit flow and send feedback
4. Follow up at 24h if no audit uploaded
5. After first audit: email with their risk score + recommended first module

---

## 📊 Daily Operations During Beta

### Morning Check (5 minutes)
- [ ] Check `/api/admin/stats` — signups, audits, active users
- [ ] Check `/api/admin/funnel` — where are users dropping off?
- [ ] Check support inbox
- [ ] Review Stripe for payment issues

### Red Flags to Watch
- Any OCR completion rate below 60% → PDF guidance issue
- Any feedback rating below 50% positive → UX problem
- Any Stripe webhook failures → billing disruption
- OpenAI timeout spike → retry logic triggering

---

## 📝 Beta Completion Criteria

Before opening to more users, confirm:

- [ ] At least 5 users completed full audit → dispute flow
- [ ] No critical crashes in 48h
- [ ] Upgrade flow tested end-to-end with real payment
- [ ] Email delivery confirmed for welcome + audit complete
- [ ] Feedback collected and reviewed
- [ ] No recurring OCR failures in support inbox
