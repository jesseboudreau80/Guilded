import stripe as stripe_lib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.deps import DB, CurrentUser

from .service import consultation_eligibility

router = APIRouter(prefix="/api/consultations", tags=["consultations"])

stripe_lib.api_key = settings.stripe_secret_key


class CheckoutRequest(BaseModel):
    scheduled_date: str | None = None


@router.get("/eligibility")
async def get_eligibility(db: DB, current_user: CurrentUser):
    return await consultation_eligibility(
        db,
        current_user.id,
        current_user.tier,
        current_user.subscription_status,
        current_user.successful_billing_count,
    )


@router.post("/checkout")
async def create_checkout(body: CheckoutRequest, db: DB, current_user: CurrentUser):
    """
    Creates a Stripe one-time checkout session for a strategy session.
    Price is computed server-side only — the client never sends or determines a price.
    """
    eligibility = await consultation_eligibility(
        db,
        current_user.id,
        current_user.tier,
        current_user.subscription_status,
        current_user.successful_billing_count,
    )

    session = stripe_lib.checkout.Session.create(
        mode="payment",
        customer_email=current_user.email or None,
        success_url=f"{settings.nextauth_url}/dashboard/strategy-session?success=1",
        cancel_url=f"{settings.nextauth_url}/dashboard/strategy-session?canceled=1",
        metadata={
            "purchase_type": "consultation",
            "user_id": current_user.id,
            "tier_at_purchase": current_user.tier.value,
            "price": str(eligibility["price"]),
            "discounted": str(eligibility["discounted_eligible"]).lower(),
            "scheduled_date": body.scheduled_date or "",
        },
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "Guilded Strategy Session"},
                    "unit_amount": eligibility["price"],
                },
            }
        ],
    )

    return {"url": session.url}
