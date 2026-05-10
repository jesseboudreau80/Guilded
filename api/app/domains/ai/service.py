from datetime import datetime, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tiers import AI_LIMITS
from app.models.user import TierEnum, User

AiConsumeResult = Literal["ok", "no_access", "cap_exceeded"]


async def atomic_consume_ai_message(
    db:             AsyncSession,
    user_id:        str,
    tier:           TierEnum,
    limit_override: int | None = None,
) -> AiConsumeResult:
    """
    Atomically resets the monthly AI counter if expired, then consumes one
    message slot.

    Uses SELECT ... FOR UPDATE to acquire a row-level lock in PostgreSQL.
    This prevents two concurrent requests from both reading count=N and both
    incrementing to N+1 when N+1 > limit. The lock is held until the
    surrounding transaction commits (handled by get_db).

    The counter is incremented BEFORE the OpenAI call. A failed OpenAI call
    does not refund the credit — this blocks abuse via error-looping.

    limit_override — when provided, uses this value instead of AI_LIMITS[tier].
      Callers should resolve Aegis limits BEFORE this function so that HTTP
      calls don't happen inside the row-level lock window.
    """
    limit = limit_override if limit_override is not None else AI_LIMITS[tier]["messages"]
    if limit == 0:
        return "no_access"

    now        = datetime.utcnow()
    next_reset = now + timedelta(days=30)

    # Acquire row-level lock — second concurrent request blocks here until
    # the first request's transaction commits.
    result = await db.execute(
        select(User).where(User.id == user_id).with_for_update()
    )
    user = result.scalar_one_or_none()
    if not user:
        return "no_access"

    # Reset monthly counter if the reset date has passed or was never set.
    if user.ai_usage_reset_date is None or user.ai_usage_reset_date.replace(tzinfo=None) <= now:
        user.ai_usage_count    = 0
        user.ai_usage_reset_date = next_reset

    if user.ai_usage_count >= limit:
        return "cap_exceeded"

    user.ai_usage_count += 1
    return "ok"
