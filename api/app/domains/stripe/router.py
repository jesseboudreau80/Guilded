import logging
from datetime import datetime, timedelta

import stripe as stripe_lib
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.deps import DB, CurrentUser
from app.lib.aegis import aegis as _aegis
from app.models.consultation import Consultation
from app.models.stripe_event import StripeEvent
from app.models.user import SubscriptionStatusEnum, TierEnum, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

stripe_lib.api_key = settings.stripe_secret_key

# ── Price → tier mapping ──────────────────────────────────────────────────────

SUBSCRIPTION_PRICES: dict[str, str | None] = {
    "JOURNEYMAN": settings.stripe_journeyman_price_id or None,
    "MASTER":     settings.stripe_master_price_id     or None,
}

FOUNDERS_PRICES: dict[str, str | None] = {
    "STANDARD": settings.stripe_founders_standard_price_id or None,
    "PARTNER":  settings.stripe_founders_partner_price_id  or None,
}


def _price_tier_map() -> dict[str, TierEnum]:
    m: dict[str, TierEnum] = {}
    if settings.stripe_journeyman_price_id:
        m[settings.stripe_journeyman_price_id] = TierEnum.JOURNEYMAN
    if settings.stripe_master_price_id:
        m[settings.stripe_master_price_id] = TierEnum.MASTER
    return m


def map_price_to_tier(price_id: str) -> TierEnum:
    return _price_tier_map().get(price_id, TierEnum.APPRENTICE)


# ── Webhook ───────────────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: DB):
    """
    Stripe webhook handler — idempotent, signature-verified.

    Handles:
      checkout.session.completed     — subscriptions AND founders pass (one-time)
      invoice.payment_succeeded      — recurring renewal / plan change
      customer.subscription.deleted  — cancellation / downgrade
    """
    sig = request.headers.get("stripe-signature")
    if not sig:
        raise HTTPException(400, "Missing stripe-signature header")

    body = await request.body()

    try:
        event = stripe_lib.Webhook.construct_event(
            body, sig, settings.stripe_webhook_secret
        )
    except stripe_lib.error.SignatureVerificationError:
        raise HTTPException(400, "Webhook signature verification failed")

    logger.info("Stripe webhook received: %s %s", event["type"], event["id"])

    try:
        db.add(StripeEvent(id=event["id"], type=event["type"]))
        await db.flush()

        await _dispatch_event(db, event)

    except IntegrityError:
        await db.rollback()
        logger.info("Stripe event %s already processed — skipping", event["id"])
        return {"status": "already_processed"}

    except Exception:
        await db.rollback()
        logger.exception("Error processing Stripe event %s", event["id"])
        raise HTTPException(500, "Internal error")

    return {"status": "ok"}


async def _dispatch_event(db, event) -> None:
    etype = event["type"]
    obj   = event["data"]["object"]

    if etype == "checkout.session.completed":
        await _handle_checkout_completed(db, obj)
    elif etype == "invoice.payment_succeeded":
        await _handle_invoice_succeeded(db, obj)
    elif etype == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, obj)


async def _handle_checkout_completed(db, session) -> None:
    meta = session.get("metadata", {})

    # ── One-time consultation purchase ───────────────────────────────────────
    if meta.get("purchase_type") == "consultation" and meta.get("user_id"):
        db.add(Consultation(
            user_id=meta["user_id"],
            tier_at_purchase=TierEnum(meta["tier_at_purchase"]),
            price_paid=int(meta.get("price", 20000)),
            discounted=meta.get("discounted") == "true",
            scheduled_date=(
                datetime.fromisoformat(meta["scheduled_date"])
                if meta.get("scheduled_date")
                else None
            ),
        ))

    # ── Founders Pass (one-time payment) ─────────────────────────────────────
    if meta.get("purchase_type") == "founders_pass" and meta.get("user_id"):
        result = await db.execute(select(User).where(User.id == meta["user_id"]))
        user   = result.scalar_one_or_none()
        if user:
            pass_type = meta.get("founders_pass_type", "STANDARD")
            user.founders_pass      = True
            user.lifetime_access    = True
            user.founders_pass_type = pass_type
            user.founders_pass_date = datetime.utcnow()
            user.tier               = TierEnum.MASTER   # founders get Master-level access
            user.subscription_status = SubscriptionStatusEnum.ACTIVE
            user.ai_usage_count     = 0
            user.ai_usage_reset_date = datetime.utcnow() + timedelta(days=30)
            user.promo_code_used    = meta.get("promo_code")

            customer = session.get("customer")
            if isinstance(customer, str):
                user.stripe_customer_id = customer

            payment_intent = session.get("payment_intent")
            if isinstance(payment_intent, str):
                user.stripe_payment_intent_id = payment_intent

            logger.info(
                "Founders Pass activated: user %s type=%s checkout %s",
                user.id, pass_type, session.get("id"),
            )
            if user.email:
                _aegis.invalidate_user(user.email)

    # ── Subscription checkout ─────────────────────────────────────────────────
    if session.get("mode") == "subscription" and meta.get("user_id") and meta.get("tier"):
        result = await db.execute(select(User).where(User.id == meta["user_id"]))
        user   = result.scalar_one_or_none()
        if user:
            new_tier = TierEnum(meta["tier"])
            user.tier                    = new_tier
            user.subscription_status     = SubscriptionStatusEnum.ACTIVE
            user.subscription_start_date = datetime.utcnow()
            user.ai_usage_count          = 0
            user.ai_usage_reset_date     = datetime.utcnow() + timedelta(days=30)
            user.promo_code_used         = meta.get("promo_code")

            customer = session.get("customer")
            sub      = session.get("subscription")
            if isinstance(customer, str):
                user.stripe_customer_id     = customer
            if isinstance(sub, str):
                user.stripe_subscription_id = sub

            logger.info(
                "Tier upgraded: user %s → %s (checkout %s)",
                user.id, new_tier.value, session.get("id"),
            )
            if user.email:
                _aegis.invalidate_user(user.email)


async def _handle_invoice_succeeded(db, invoice) -> None:
    subscription_id = invoice.get("subscription")
    if not isinstance(subscription_id, str):
        return

    lines    = invoice.get("lines", {}).get("data", [])
    price_id = lines[0].get("price", {}).get("id", "") if lines else ""
    new_tier = map_price_to_tier(price_id)

    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription_id)
    )
    user = result.scalar_one_or_none()
    if user:
        user.successful_billing_count += 1
        user.subscription_status       = SubscriptionStatusEnum.ACTIVE
        user.tier                      = new_tier
        logger.info(
            "Invoice payment succeeded: user %s billing_count=%s tier=%s",
            user.id, user.successful_billing_count, new_tier.value,
        )
        if user.email:
            _aegis.invalidate_user(user.email)


async def _handle_subscription_deleted(db, subscription) -> None:
    result = await db.execute(
        select(User).where(User.stripe_subscription_id == subscription["id"])
    )
    user = result.scalar_one_or_none()
    if user:
        # Founders Pass users retain access even if their sub is deleted
        if user.lifetime_access:
            logger.info(
                "Subscription deleted for lifetime user %s — access retained (founders pass)",
                user.id,
            )
            return

        user.subscription_status = SubscriptionStatusEnum.CANCELED
        user.tier                = TierEnum.APPRENTICE
        logger.info(
            "Subscription canceled: user %s downgraded to APPRENTICE (sub %s)",
            user.id, subscription["id"],
        )


# ── Subscription checkout ─────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    tier:       str
    promo_code: str | None = None   # optional Stripe promotion code string


@router.post("/checkout")
async def create_subscription_checkout(body: CheckoutRequest, current_user: CurrentUser):
    tier_key = body.tier.upper()

    if tier_key not in SUBSCRIPTION_PRICES:
        raise HTTPException(400, "Invalid tier. Must be JOURNEYMAN or MASTER.")

    price_id = SUBSCRIPTION_PRICES[tier_key]
    if not price_id:
        raise HTTPException(500, "Stripe price ID not configured for this tier.")

    session_kwargs: dict = dict(
        mode="subscription",
        customer_email=current_user.email or None,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.nextauth_url}/dashboard/account?subscribed=1",
        cancel_url=f"{settings.nextauth_url}/dashboard/upgrade?canceled=1",
        metadata={
            "user_id":       current_user.id,
            "tier":          tier_key,
            "purchase_type": "subscription",
        },
    )

    # Apply promotion code if provided — look up by code string → get promo ID
    if body.promo_code:
        try:
            promos = stripe_lib.PromotionCode.list(code=body.promo_code, active=True, limit=1)
            if promos.data:
                session_kwargs["discounts"] = [{"promotion_code": promos.data[0].id}]
                session_kwargs["metadata"]["promo_code"] = body.promo_code
                logger.info(
                    "Promo code applied: user %s code=%s promo_id=%s",
                    current_user.id, body.promo_code, promos.data[0].id,
                )
            else:
                logger.info("Promo code not found: %s — proceeding without discount", body.promo_code)
                # Still allow customer to enter a code on Stripe's page
                session_kwargs["allow_promotion_codes"] = True
        except stripe_lib.error.StripeError as exc:
            logger.warning("Promo code lookup failed for %s: %s", body.promo_code, exc)
            session_kwargs["allow_promotion_codes"] = True
    else:
        # Always allow promo codes on Stripe's checkout page
        session_kwargs["allow_promotion_codes"] = True

    try:
        session = stripe_lib.checkout.Session.create(**session_kwargs)
    except stripe_lib.error.StripeError as exc:
        logger.error("Stripe checkout creation failed for user %s: %s", current_user.id, exc)
        raise HTTPException(502, "Failed to create checkout session.")

    logger.info(
        "Checkout session created: user %s tier %s session %s",
        current_user.id, tier_key, session.id,
    )

    return {"url": session.url}


# ── Founders Pass checkout ────────────────────────────────────────────────────

class FoundersPassRequest(BaseModel):
    pass_type:  str             # STANDARD | PARTNER
    promo_code: str | None = None


@router.post("/founders-pass/checkout")
async def create_founders_pass_checkout(body: FoundersPassRequest, current_user: CurrentUser):
    pass_type = body.pass_type.upper()

    if pass_type not in FOUNDERS_PRICES:
        raise HTTPException(400, "Invalid pass type. Must be STANDARD or PARTNER.")

    price_id = FOUNDERS_PRICES[pass_type]
    if not price_id:
        raise HTTPException(
            500,
            f"Founders Pass price ID not configured for {pass_type}. "
            "Set STRIPE_{'TEST' if not settings.stripe_is_live else 'LIVE'}_FOUNDERS_{pass_type}_PRICE_ID.",
        )

    session_kwargs: dict = dict(
        mode="payment",
        customer_email=current_user.email or None,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.nextauth_url}/dashboard/account?founders=1",
        cancel_url=f"{settings.nextauth_url}/dashboard/upgrade?canceled=1",
        metadata={
            "user_id":          current_user.id,
            "purchase_type":    "founders_pass",
            "founders_pass_type": pass_type,
        },
    )

    if body.promo_code:
        try:
            promos = stripe_lib.PromotionCode.list(code=body.promo_code, active=True, limit=1)
            if promos.data:
                session_kwargs["discounts"] = [{"promotion_code": promos.data[0].id}]
                session_kwargs["metadata"]["promo_code"] = body.promo_code
            else:
                session_kwargs["allow_promotion_codes"] = True
        except stripe_lib.error.StripeError:
            session_kwargs["allow_promotion_codes"] = True
    else:
        session_kwargs["allow_promotion_codes"] = True

    try:
        session = stripe_lib.checkout.Session.create(**session_kwargs)
    except stripe_lib.error.StripeError as exc:
        logger.error("Founders Pass checkout failed for user %s: %s", current_user.id, exc)
        raise HTTPException(502, "Failed to create checkout session.")

    logger.info(
        "Founders Pass checkout created: user %s type %s session %s",
        current_user.id, pass_type, session.id,
    )

    return {"url": session.url}
