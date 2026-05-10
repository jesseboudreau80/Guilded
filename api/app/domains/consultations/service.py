from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.consultation import Consultation
from app.models.user import SubscriptionStatusEnum, TierEnum

BASE_RATE = 20000  # cents — $200.00

DISCOUNTED_RATE: dict[TierEnum, int] = {
    TierEnum.APPRENTICE: BASE_RATE,
    TierEnum.JOURNEYMAN: BASE_RATE,
    TierEnum.MASTER: 15000,  # $150.00
    TierEnum.HERO: 10000,    # $100.00
}


async def consultation_eligibility(
    db: AsyncSession,
    user_id: str,
    tier: TierEnum,
    status: SubscriptionStatusEnum,
    successful_billing_count: int,
) -> dict:
    """
    Computes consultation pricing and discount eligibility server-side.
    This is the single source of truth for pricing — never expose to the client
    and never accept a price from the client.

    Discount rules (all must be satisfied):
      1. Active subscription
      2. At least 2 successful billing cycles
      3. Fewer than 4 discounted sessions in the rolling 365-day window
      4. At least 60 days since the last discounted session
      5. Tier is MASTER or HERO
    """
    now = datetime.utcnow()
    year_ago = now - timedelta(days=365)

    result = await db.execute(
        select(Consultation)
        .where(
            Consultation.user_id == user_id,
            Consultation.discounted.is_(True),
            Consultation.created_at > year_ago,
        )
        .order_by(Consultation.created_at.desc())
    )
    discounted_sessions = result.scalars().all()

    used_count = len(discounted_sessions)
    latest_created_at = discounted_sessions[0].created_at if discounted_sessions else None

    has_active = status == SubscriptionStatusEnum.ACTIVE
    enough_cycles = successful_billing_count >= 2
    within_count = used_count < 4
    tier_eligible = tier in (TierEnum.MASTER, TierEnum.HERO)

    spacing_eligible = True
    next_eligible_date = None

    if latest_created_at:
        unlock = latest_created_at + timedelta(days=60)
        spacing_eligible = unlock <= now
        if not spacing_eligible:
            next_eligible_date = unlock.isoformat()

    discounted_eligible = (
        has_active and enough_cycles and within_count and spacing_eligible and tier_eligible
    )

    price = DISCOUNTED_RATE[tier] if discounted_eligible else BASE_RATE

    return {
        "discounted_eligible": discounted_eligible,
        "used_discounted_in_365_days": used_count,
        "remaining_discounted_sessions": max(0, 4 - used_count),
        "next_eligible_date": next_eligible_date,
        "price": price,
        "discounted_price": DISCOUNTED_RATE[tier],
        "message": f"{used_count} of 4 discounted sessions used in the past 365 days.",
    }
