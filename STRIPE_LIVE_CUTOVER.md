# Stripe Live Mode Cutover Guide

**IMPORTANT:** Complete every step in order. Do not skip steps.  
**Do not** run this guide under pressure or near a launch deadline.  
**Keep test mode working** — do not overwrite test keys.

---

## Overview

Guilded supports two Stripe environments simultaneously:
- **Test mode** (`STRIPE_MODE=test`) — for development and staging
- **Live mode** (`STRIPE_MODE=live`) — for real customer billing

The environment is selected by `STRIPE_MODE` in `.env`.  
Test and live Stripe objects (products, prices, webhooks) are completely separate.

---

## STEP 1 — Validate Test Mode First

Before going live, confirm test mode works end-to-end:

- [ ] Register a test account
- [ ] Complete a full audit cycle
- [ ] Click "Advance to Journeyman" → Stripe checkout opens
- [ ] Complete with test card `4242 4242 4242 4242` (any future expiry, any CVC)
- [ ] Verify tier upgrades to JOURNEYMAN after checkout
- [ ] Verify AI usage limits reflect new tier
- [ ] Test subscription cancellation flow
- [ ] Confirm admin panel shows correct tier distribution

---

## STEP 2 — Create Live Products in Stripe Dashboard

Go to **stripe.com/dashboard** → Switch to **Live mode** (toggle in top-left).

### Create Products:

**Product 1: Guilded Journeyman**
1. Products → Add Product
2. Name: "Guilded Journeyman"
3. Pricing model: Recurring, Monthly
4. Price: $19.00 USD
5. Copy the price ID (e.g. `price_1ABC...`) → this is `STRIPE_JOURNEYMAN_PRICE_ID`

**Product 2: Guilded Master**
1. Products → Add Product
2. Name: "Guilded Master"
3. Pricing model: Recurring, Monthly
4. Price: $47.00 USD
5. Copy the price ID → this is `STRIPE_MASTER_PRICE_ID`

---

## STEP 3 — Set Live Webhook

1. Stripe Dashboard → Developers → Webhooks → Add Endpoint
2. **URL:** `https://guilded.jesseboudreau.com/api/stripe/webhook`
3. **Events to listen for:**
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. Copy the **Signing Secret** (`whsec_...`) → this is `STRIPE_WEBHOOK_SECRET` (live value)

---

## STEP 4 — Update `.env` for Live Mode

Add to `.env` (keep test values commented, don't delete them):

```bash
# ── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_MODE=live

# Live keys (sk_live_... and whsec_live_...)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Live price IDs (created in Step 2)
STRIPE_JOURNEYMAN_PRICE_ID="price_..."
STRIPE_MASTER_PRICE_ID="price_..."

# ── Test keys (keep for development rollback) ─────────────────────────────────
# STRIPE_MODE=test
# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_WEBHOOK_SECRET="whsec_test_..."
# STRIPE_JOURNEYMAN_PRICE_ID="price_test_..."
# STRIPE_MASTER_PRICE_ID="price_test_..."
```

---

## STEP 5 — Restart API and Validate Startup Log

```bash
./stop.sh && ./start.sh
tail -f .logs/api.log
```

**Expected startup output:**
```
Stripe mode: LIVE
✅ Stripe configuration appears consistent with live mode.
```

**If you see warnings:**
```
⚠️  STRIPE_MODE=live but STRIPE_SECRET_KEY is a test key (sk_test_...)
```
→ Stop. Fix the key mismatch before continuing.

---

## STEP 6 — Live Smoke Test

**Use a real card with a small real charge.**

1. Create a fresh Guilded account
2. Click "Advance to Journeyman"
3. Complete Stripe checkout with a real card
4. Verify:
   - [ ] Checkout completes successfully
   - [ ] Tier upgrades to JOURNEYMAN in admin panel
   - [ ] Welcome email (or audit complete email) sends via Resend
   - [ ] Stripe Dashboard shows the transaction
5. Issue a refund from Stripe Dashboard
6. Verify refund completes

---

## STEP 7 — Admin Validation

Check `/api/admin/stripe-status` via the admin panel:

```
stripe_mode:         live
key_environment:     live
mode_consistent:     true
journeyman_price_set: true
master_price_set:    true
webhook_set:         true
```

All flags must be `true` before inviting users.

---

## Rollback Plan

If something goes wrong in live mode:

```bash
# 1. Stop services immediately
./stop.sh

# 2. In .env: comment out live keys, uncomment test keys
STRIPE_MODE=test
# STRIPE_MODE=live

# 3. Restart
./start.sh

# 4. Verify test mode is active in startup log

# 5. Investigate the live issue before retrying
```

For any customer incorrectly charged: issue full refund via Stripe Dashboard immediately.

---

## Ongoing Safe Development

After going live, keep **both environments** in your `.env` but commented:

```bash
# Switch between environments by changing STRIPE_MODE
STRIPE_MODE=live   # or: test

# Live environment
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_live_..."
STRIPE_JOURNEYMAN_PRICE_ID="price_live_journeyman_..."
STRIPE_MASTER_PRICE_ID="price_live_master_..."
```

The API will warn at startup if keys and mode are inconsistent.  
Check `/api/admin/stripe-status` any time to verify the current environment.
