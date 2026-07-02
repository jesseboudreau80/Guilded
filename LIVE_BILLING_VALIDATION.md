# Guilded Live Billing Validation Plan

**Purpose:** Validate the complete live Stripe billing flow before opening to beta users.  
**Environment:** `STRIPE_MODE=live` with real credentials  
**Safety rule:** Use small amounts. Refund immediately. Never skip a validation step.

---

## Pre-Validation Checklist

Before running any live transactions, confirm:

- [ ] `STRIPE_MODE=live` in production `.env`
- [ ] `STRIPE_SECRET_KEY=sk_live_...` (live key from Stripe Dashboard)
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` (live webhook signing secret)
- [ ] `STRIPE_LIVE_JOURNEYMAN_PRICE_ID=price_1TUuobKKUUjkHBcxFAqKggtu`
- [ ] `STRIPE_LIVE_MASTER_PRICE_ID=price_1TUuuWKKUUjkHBcxhabmw62I`
- [ ] Startup log shows: `Stripe mode: LIVE` + `✅ Stripe configuration appears consistent`
- [ ] `GET /api/admin/stripe-status` returns `mode_consistent: true`
- [ ] `GET /api/admin/webhook-health` shows webhook is set

---

## Validation 1 — Live Journeyman Checkout

**Goal:** Verify a real $19 payment creates a valid subscription and upgrades tier.

**Steps:**
1. Log in as a test user (create fresh account with invite code)
2. Navigate to `/dashboard/upgrade`
3. Click "Advance to Journeyman" → Stripe Checkout opens
4. Use a real card (or company card) — minimum real transaction
5. Complete payment

**Verify:**
- [ ] Stripe Dashboard shows transaction: `$19.00` with product "Guilded Journeyman"
- [ ] `checkout.session.completed` webhook fired (check `/api/admin/webhook-health`)
- [ ] User's tier updated to `JOURNEYMAN` (check `/api/admin/stats` → tier distribution)
- [ ] Dashboard shows Journeyman rank, extended AI limits (20/month)
- [ ] Account page shows "Journeyman Plan · Active"
- [ ] Welcome email NOT resent (first email was sent at registration)

**Expected time:** Tier update should reflect within 5 seconds of checkout completion.

---

## Validation 2 — Refund Test

**Goal:** Verify Stripe refunds work and entitlement handles gracefully.

**Steps:**
1. Go to Stripe Dashboard → Payments → find the $19 transaction
2. Issue full refund (Actions → Refund)

**Verify:**
- [ ] Stripe Dashboard shows refund processed
- [ ] Note: Guilded doesn't automatically downgrade on refund (by design — requires cancellation)
- [ ] User tier remains JOURNEYMAN (refund doesn't automatically cancel subscription)

---

## Validation 3 — Subscription Cancellation

**Goal:** Verify cancellation correctly downgrades user tier.

**Steps:**
1. In Stripe Dashboard → Customers → find the test user
2. Cancel their subscription immediately
3. Wait for webhook delivery (~5-10 seconds)

**Verify:**
- [ ] `customer.subscription.deleted` webhook received (check `/api/admin/webhook-health`)
- [ ] User's `subscription_status` changes to `CANCELED`
- [ ] User's tier reverts to `APPRENTICE`
- [ ] Dashboard shows Apprentice tier and limited AI access
- [ ] Account page shows "Free Plan" with upgrade CTA visible

---

## Validation 4 — Webhook Replay

**Goal:** Confirm idempotency prevents double-processing of replayed webhooks.

**Steps:**
1. In Stripe Dashboard → Webhooks → find a recent event
2. Click "Resend" to replay the webhook
3. Check server logs for response

**Verify:**
- [ ] Server logs show: duplicate `evt_xxx` detected → 200 returned without re-processing
- [ ] User's tier NOT changed again (no double-upgrade or double-downgrade)
- [ ] `stripe_events` table shows only ONE row for that `evt_xxx` ID

---

## Validation 5 — Webhook Signature Validation

**Goal:** Confirm Stripe webhook signatures are properly validated.

**Test:**
1. Make a direct POST to `/api/stripe/webhook` with invalid payload
2. Expected: `400 Bad Request` (signature validation fails)

```bash
curl -X POST https://guilded.jesseboudreau.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: fake-signature" \
  -d '{"type":"checkout.session.completed"}'
```

**Verify:**
- [ ] Returns `400` or similar rejection (not 200)
- [ ] Server logs show signature validation failure
- [ ] No database changes made

---

## Validation 6 — Master Plan Checkout (Optional)

If you want to test the Master tier:

1. Create another fresh account
2. First upgrade to Journeyman (to verify that path)
3. OR: test Master directly if the upgrade path supports it

**Note:** The current app doesn't have a JOURNEYMAN→MASTER upgrade flow in the UI.
Users reach Master by clicking "Advance to Master" from the upgrade page.
Verify `price_1TUuuWKKUUjkHBcxhabmw62I` is the correct live price ID for Master.

---

## Rollback Procedure

If any validation step reveals a critical issue:

```bash
# 1. Stop services
./stop.sh

# 2. Switch back to test mode
# In .env: change STRIPE_MODE=live → STRIPE_MODE=test

# 3. Restart
./start.sh

# 4. Verify test mode in startup log
```

For customers incorrectly charged: issue full refund immediately via Stripe Dashboard.
Contact `support@guilded.finance` as soon as possible.

---

## Post-Validation Status

After all validations pass:

- [ ] Screenshot the Stripe Dashboard showing successful transaction + refund
- [ ] Note the webhook health status: events processed, no failures
- [ ] Confirm admin panel shows tier distribution working correctly
- [ ] Update `BETA_LAUNCH_CHECKLIST.md` → mark Stripe validation complete
- [ ] Safe to invite first beta users

---

## Live Stripe Product Reference

| Product | Product ID | Price ID | Amount |
|---|---|---|---|
| APPRENTICE (free) | `prod_UTsbhPzWQ0wDqq` | `price_1TUuppKKUUjkHBcx4V2vatPw` | $0 |
| JOURNEYMAN | `prod_UTsZYlIpw87Nmv` | `price_1TUuobKKUUjkHBcxFAqKggtu` | $19/mo |
| MASTER | `prod_UTsffumfGfsBBx` | `price_1TUuuWKKUUjkHBcxhabmw62I` | TBD |
