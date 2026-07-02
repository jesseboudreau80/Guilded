# Guilded Founders Pass — Strategy & Operations Guide

## What Is the Founders Pass?

The Guilded Founders Pass is a **one-time payment** that grants **lifetime platform access** at the Master tier level. It is not a subscription. There are no renewals, no recurring charges, and no expiration.

It exists as an early-supporter acquisition mechanism: reduce subscription hesitation, reward early belief, and build a committed founding cohort during beta.

---

## Pricing Tiers

| Pass Type | Price    | Target Audience                          |
|-----------|----------|------------------------------------------|
| STANDARD  | $195     | Direct purchasers, organic users         |
| PARTNER   | $97      | Community members, referral partners, DIY Credit Repair 101 |

**Positioning:**
- $195 is positioned as "less than 8 months of Journeyman" (vs. $25/month)
- $97 is positioned as community/partner appreciation pricing
- Neither should be advertised as "cheap" — frame as access, not discount

---

## What Founders Get

- Master-tier access permanently (100 AI questions/month)
- No recurring billing — ever
- "Founding Member" badge displayed in the dashboard
- Pricing lock protection — their access is never reduced
- Access to future core platform features as they ship
- Fair-use AI policy (100+ questions/month, monitored but not enforced)

---

## Technical Implementation

### Entitlement Logic

Founders bypass all subscription checks:
- `founders_pass = True` on the User model
- `lifetime_access = True` — the enforcement flag
- `tier = MASTER` — set at checkout, never downgraded
- Subscription deletion webhooks are ignored for lifetime users

```python
# In _handle_subscription_deleted:
if user.lifetime_access:
    # Access retained — no downgrade
    return
```

### Stripe Integration

- Mode: `mode="payment"` (one-time, not subscription)
- Price: One-time Stripe price on the STANDARD or PARTNER product
- Webhook: `checkout.session.completed` with `metadata.purchase_type=founders_pass`
- Promo codes: `allow_promotion_codes=True` on all founders pass checkouts

### Required Stripe Setup

Create two products in Stripe (both test and live):
1. **Guilded Founders Pass — Standard** — $195 one-time price
2. **Guilded Founders Pass — Partner** — $97 one-time price

Set the price IDs in `.env`:
```
STRIPE_TEST_FOUNDERS_STANDARD_PRICE_ID=price_test_...
STRIPE_TEST_FOUNDERS_PARTNER_PRICE_ID=price_test_...
STRIPE_LIVE_FOUNDERS_STANDARD_PRICE_ID=price_live_...
STRIPE_LIVE_FOUNDERS_PARTNER_PRICE_ID=price_live_...
```

---

## Admin Operations

The admin dashboard (`/dashboard/admin`) shows:
- Total founders pass holders
- Breakdown by pass type (Standard vs. Partner)
- Individual user list with pass date

To manually grant lifetime access (beta reward, comp):
```sql
UPDATE users
SET founders_pass = true, lifetime_access = true,
    founders_pass_type = 'STANDARD', tier = 'MASTER'
WHERE email = 'user@example.com';
```

---

## Promotion Strategy

### Phase 1 — Beta Launch
- Offer PARTNER pricing to first 50 registrants via invite codes
- Use promo code `FOUNDER97` for partner pricing in beta invite emails
- No public advertising of the founders pass yet

### Phase 2 — Community Acquisition
- DIY Credit Repair 101 community offer via unique promo code
- Referral program: existing users refer → both get $20 credit or PARTNER pass

### Phase 3 — General Availability
- STANDARD pricing only at general availability
- Remove PARTNER pricing or limit to explicit partner channels
- Add scarcity frame: "Founders pricing available while founding cohort is open"

---

## Refund Policy

Founders Pass refunds are handled case-by-case:
1. Within 14 days with no usage → full refund via Stripe Dashboard
2. After 14 days → no refund (access is permanent, clearly communicated)
3. If refunded: manually set `founders_pass=false`, `lifetime_access=false`, `tier='APPRENTICE'`

---

## Fair Use

Founders Pass users are subject to the same fair-use monitoring as subscription users.
The `fair_use_enabled` flag must be explicitly set to enforce limits.
Current thresholds (architecture only, not enforced):
- AI messages: 500/day monitoring threshold
- OCR uploads: 50/day monitoring threshold

These are intentionally generous for the founding cohort.
