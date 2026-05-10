"""
Guild Academy XP and progression models.

NOTE: GuildRank is a separate concept from the billing TierEnum.
  - TierEnum (APPRENTICE/JOURNEYMAN/MASTER/HERO) controls feature access via Stripe.
  - GuildRank (Apprentice → Guild Commander) is earned via XP and reflects educational progress.
"""

import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


# ── XP event types and amounts ────────────────────────────────────────────────

class XPEventType(str, enum.Enum):
    LESSON_COMPLETE  = "lesson_complete"
    MODULE_COMPLETE  = "module_complete"
    AUDIT_COMPLETE   = "audit_complete"
    DISPUTE_DRAFT    = "dispute_draft"
    DAILY_LOGIN      = "daily_login"


XP_AMOUNTS: dict[XPEventType, int] = {
    XPEventType.LESSON_COMPLETE: 10,
    XPEventType.MODULE_COMPLETE: 50,
    XPEventType.AUDIT_COMPLETE:  25,
    XPEventType.DISPUTE_DRAFT:   20,
    XPEventType.DAILY_LOGIN:      5,
}


# ── Guild rank system ─────────────────────────────────────────────────────────

class GuildRank(str, enum.Enum):
    APPRENTICE        = "Apprentice"
    JOURNEYMAN        = "Journeyman"
    STRATEGIST        = "Strategist"
    MASTER_NEGOTIATOR = "Master Negotiator"
    GUILD_COMMANDER   = "Guild Commander"


# (threshold_xp, rank) — highest threshold wins
_RANK_THRESHOLDS: list[tuple[int, GuildRank]] = [
    (1000, GuildRank.GUILD_COMMANDER),
    (600,  GuildRank.MASTER_NEGOTIATOR),
    (300,  GuildRank.STRATEGIST),
    (100,  GuildRank.JOURNEYMAN),
    (0,    GuildRank.APPRENTICE),
]

RANK_NEXT_XP: dict[GuildRank, int | None] = {
    GuildRank.APPRENTICE:        100,
    GuildRank.JOURNEYMAN:        300,
    GuildRank.STRATEGIST:        600,
    GuildRank.MASTER_NEGOTIATOR: 1000,
    GuildRank.GUILD_COMMANDER:   None,
}

RANK_MIN_XP: dict[GuildRank, int] = {
    GuildRank.APPRENTICE:        0,
    GuildRank.JOURNEYMAN:        100,
    GuildRank.STRATEGIST:        300,
    GuildRank.MASTER_NEGOTIATOR: 600,
    GuildRank.GUILD_COMMANDER:   1000,
}


def xp_to_rank(xp: int) -> GuildRank:
    for threshold, rank in _RANK_THRESHOLDS:
        if xp >= threshold:
            return rank
    return GuildRank.APPRENTICE


def rank_progress_pct(xp: int) -> float:
    """Fraction (0.0–1.0) of XP earned toward the next rank."""
    rank     = xp_to_rank(xp)
    min_xp   = RANK_MIN_XP[rank]
    next_xp  = RANK_NEXT_XP[rank]
    if next_xp is None:
        return 1.0
    return min(1.0, (xp - min_xp) / (next_xp - min_xp))


# ── Known badge keys ──────────────────────────────────────────────────────────

BADGE_DEFINITIONS: dict[str, str] = {
    "first_module":      "First Blood — Completed your first training module",
    "audit_warrior":     "Audit Warrior — Completed your first credit audit",
    "dispute_drafter":   "Dispute Drafter — Generated your first dispute letter",
    "full_campaign":     "Full Campaign — Completed all 7 Guild Academy modules",
    "rank_journeyman":   "Promoted — Reached Journeyman rank",
    "rank_strategist":   "Promoted — Reached Strategist rank",
    "rank_master":       "Promoted — Reached Master Negotiator rank",
    "rank_commander":    "Guild Commander — Reached the highest rank",
}


# ── DB models ─────────────────────────────────────────────────────────────────

class XPLog(Base):
    __tablename__ = "academy_xp_log"

    id:          Mapped[str]          = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:     Mapped[str]          = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type:  Mapped[XPEventType]  = mapped_column(SAEnum(XPEventType), nullable=False)
    xp_amount:   Mapped[int]          = mapped_column(Integer, nullable=False)
    reference:   Mapped[str | None]   = mapped_column(String, nullable=True)  # module_id, audit_id, etc.
    earned_at:   Mapped[datetime]     = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class AcademyBadge(Base):
    __tablename__ = "academy_badges"

    id:          Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:     Mapped[str]      = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key:   Mapped[str]      = mapped_column(String, nullable=False)
    earned_at:   Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "badge_key", name="uq_badge_user"),)
