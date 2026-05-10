import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.xp import (
    BADGE_DEFINITIONS, XP_AMOUNTS, AcademyBadge, XPEventType, XPLog,
    GuildRank, rank_progress_pct, xp_to_rank, RANK_NEXT_XP, RANK_MIN_XP,
)

logger = logging.getLogger(__name__)


# ── XP award ─────────────────────────────────────────────────────────────────

async def award_xp(
    db: AsyncSession,
    user_id: str,
    event_type: XPEventType,
    reference: str | None = None,
    *,
    idempotent: bool = True,
) -> int:
    """
    Award XP for an event. Returns xp_amount awarded (0 if already awarded and idempotent=True).

    For MODULE_COMPLETE and AUDIT_COMPLETE events, idempotent=True prevents
    double-awarding if the user triggers the same event twice.
    """
    if idempotent and reference and event_type in (XPEventType.MODULE_COMPLETE, XPEventType.AUDIT_COMPLETE, XPEventType.DISPUTE_DRAFT):
        existing = await db.scalar(
            select(func.count()).select_from(XPLog).where(
                XPLog.user_id    == user_id,
                XPLog.event_type == event_type,
                XPLog.reference  == reference,
            )
        )
        if existing and existing > 0:
            logger.debug("XP already awarded for %s ref=%s — skipping", event_type, reference)
            return 0

    amount = XP_AMOUNTS[event_type]
    db.add(XPLog(
        user_id=user_id,
        event_type=event_type,
        xp_amount=amount,
        reference=reference,
        earned_at=datetime.now(timezone.utc),
    ))
    await db.flush()
    logger.info("XP awarded: user=%s event=%s amount=%d ref=%s", user_id, event_type.value, amount, reference)
    return amount


# ── Badge award ───────────────────────────────────────────────────────────────

async def award_badge(db: AsyncSession, user_id: str, badge_key: str) -> bool:
    """Award a badge. Returns True if newly awarded, False if already held."""
    if badge_key not in BADGE_DEFINITIONS:
        return False
    stmt = (
        pg_insert(AcademyBadge)
        .values(user_id=user_id, badge_key=badge_key, earned_at=datetime.now(timezone.utc))
        .on_conflict_do_nothing(constraint="uq_badge_user")
        .returning(AcademyBadge.id)
    )
    result = await db.execute(stmt)
    awarded = result.first() is not None
    if awarded:
        logger.info("Badge awarded: user=%s badge=%s", user_id, badge_key)
    return awarded


# ── XP summary ────────────────────────────────────────────────────────────────

async def get_xp_summary(db: AsyncSession, user_id: str) -> dict:
    """Return user's total XP, current rank, progress to next rank, and recent events."""
    total_xp = (
        await db.scalar(select(func.sum(XPLog.xp_amount)).where(XPLog.user_id == user_id))
    ) or 0

    rank         = xp_to_rank(total_xp)
    next_xp      = RANK_NEXT_XP[rank]
    min_xp       = RANK_MIN_XP[rank]
    progress_pct = rank_progress_pct(total_xp)

    # Recent XP events (last 10)
    recent_result = await db.execute(
        select(XPLog)
        .where(XPLog.user_id == user_id)
        .order_by(XPLog.earned_at.desc())
        .limit(10)
    )
    recent = [
        {
            "event_type": row.event_type.value,
            "xp_amount":  row.xp_amount,
            "reference":  row.reference,
            "earned_at":  row.earned_at.isoformat(),
        }
        for row in recent_result.scalars().all()
    ]

    # Badges
    badges_result = await db.execute(
        select(AcademyBadge).where(AcademyBadge.user_id == user_id).order_by(AcademyBadge.earned_at.desc())
    )
    badges = [
        {
            "badge_key":  b.badge_key,
            "label":      BADGE_DEFINITIONS.get(b.badge_key, b.badge_key),
            "earned_at":  b.earned_at.isoformat(),
        }
        for b in badges_result.scalars().all()
    ]

    return {
        "total_xp":        total_xp,
        "rank":            rank.value,
        "next_xp":         next_xp,
        "min_xp":          min_xp,
        "progress_pct":    round(progress_pct, 3),
        "xp_to_next":      (next_xp - total_xp) if next_xp else 0,
        "recent_events":   recent,
        "badges":          badges,
    }


# ── Post-completion badge checks ──────────────────────────────────────────────

async def check_and_award_progression_badges(
    db: AsyncSession,
    user_id: str,
    total_xp: int,
    modules_completed: int,
) -> list[str]:
    """Check rank promotions and completion milestones; award badges."""
    awarded = []
    rank = xp_to_rank(total_xp)

    rank_badges = {
        GuildRank.JOURNEYMAN:        "rank_journeyman",
        GuildRank.STRATEGIST:        "rank_strategist",
        GuildRank.MASTER_NEGOTIATOR: "rank_master",
        GuildRank.GUILD_COMMANDER:   "rank_commander",
    }
    if rank in rank_badges:
        if await award_badge(db, user_id, rank_badges[rank]):
            awarded.append(rank_badges[rank])

    if modules_completed == 1:
        if await award_badge(db, user_id, "first_module"):
            awarded.append("first_module")

    if modules_completed >= 7:
        if await award_badge(db, user_id, "full_campaign"):
            awarded.append("full_campaign")

    return awarded
