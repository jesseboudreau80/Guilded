# Guilded Beta Coupon & Promo Code QA Guide

**Purpose:** Test all promotion code and discount paths before opening to beta users.
**Safety rule:** All coupon tests must be done in `STRIPE_MODE=test` first.

---

## Stripe Promotion Code Setup

### Creating a promo code in Stripe Dashboard

1. Go to **Products → Coupons → Create coupon**
2. Define discount type:
   - Percentage: e.g. `100%` off (internal QA), `50%` off (partner/community)
   - Fixed amount: e.g. `$98 off` (brings $195 Standard down to $97)
3. Create a **Promotion Code** from the coupon:
   - Go to the coupon → **Promotion Codes** tab → **Add code**
   - Set a human-readable code: e.g. `BETA100`, `PARTNER50`, `DIY101`
4. Test codes use the same creation flow in test mode Dashboard

### Internal QA Codes (test mode only)

| Code          | Discount | Use Case                          |
|---------------|----------|-----------------------------------|
| `QA100`       | 100% off | Internal zero-dollar live test    |
| `QAJNY`       | 100% off | Journeyman QA flow                |
| `QAMASTER`    | 100% off | Master QA flow                    |
| `QAFOUNDERS`  | 100% off | Founders Pass QA flow             |

### Partner / Community Codes

| Code         | Discount | Use Case                              |
|--------------|----------|---------------------------------------|
| `PARTNER50`  | 50% off  | Community / referral partner offer    |
| `DIY101`     | 20% off  | DIY Credit Repair 101 community users |
| `BETA25`     | 25% off  | Beta launch campaign                  |

---

## Promo Code Flow Testing

### Test 1 — Subscription with valid promo code

1. Navigate to `/dashboard/upgrade`
2. Enter promo code in the "Promotion Code" field
3. Click "Advance to Journeyman"
4. Verify: Stripe checkout shows the discount applied before payment
5. Complete test checkout
6. Verify: User tier upgrades to JOURNEYMAN
7. Verify: `promo_code_used` stored on user record (check admin or DB)

### Test 2 — Invalid promo code graceful fallback

1. Enter a non-existent code: `BADCODE999`
2. Click checkout
3. Expected: Stripe checkout opens with `allow_promotion_codes=True`
4. User can still enter a valid code on Stripe's checkout page
5. No error shown to user — silent fallback

### Test 3 — Founders Pass with promo code

1. Enter promo code `QAFOUNDERS` (100% off, test mode)
2. Click "Claim Founders Pass — $195"
3. Verify: Stripe checkout shows $0 after discount
4. Complete checkout
5. Verify: `founders_pass=true`, `lifetime_access=true`, tier = MASTER

### Test 4 — QA zero-dollar live subscription

1. Set `STRIPE_MODE=test` with 100% promo code
2. Execute full subscription lifecycle:
   - Checkout → completed webhook → tier upgrade
   - Invoice succeeded → billing count increment
   - Subscription deletion → tier downgrade
3. Each step must fire the correct webhook and update user record
4. Check `/api/admin/webhook-health` confirms events processed

### Test 5 — Founders Pass protection from subscription delete

1. Create a user with `founders_pass=true`, `lifetime_access=true`
2. Simulate `customer.subscription.deleted` webhook (via Stripe dashboard replay)
3. Verify: User tier and access UNCHANGED (lifetime access protection)
4. Check server log: "Subscription deleted for lifetime user — access retained"

---

## Rollback

If any coupon causes unexpected behavior:
1. Deactivate the promotion code in Stripe Dashboard immediately
2. The code stored in `promo_code_used` is historical — no ongoing effect
3. User tier and access are set at checkout, not re-evaluated on each request

---

## Stripe Dashboard Reference

| Environment | Dashboard                                 |
|-------------|-------------------------------------------|
| Test        | dashboard.stripe.com (toggle: Test mode)  |
| Live        | dashboard.stripe.com (toggle: Live mode)  |
| Webhooks    | Developers → Webhooks → your endpoint     |
| Events      | Developers → Events (filter by type)      |
