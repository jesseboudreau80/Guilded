"""
Admin endpoints — operational visibility for Guilded operators.

Protected by email allowlist (ADMIN_EMAILS).
Every access is logged at INFO level for audit trail.

Endpoints:
  GET /api/admin/stats  — comprehensive system snapshot
  GET /api/admin/recent — live activity feed (recent signups, audits, disputes)
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.core.deps import DB, CurrentUser
from app.models.user import User, TierEnum, SubscriptionStatusEnum
from app.models.audit import Audit
from app.models.academy import AcademyModule, AcademyProgress, AcademyProgressStatus
from app.models.xp import XPLog, XPEventType
from app.models.dispute import DisputeDraft

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_EMAILS: set[str] = {"jesse.boudreau.dev@gmail.com"}


def _require_admin(user: User) -> None:
    if not user.email or user.email not in ADMIN_EMAILS:
        raise HTTPException(403, "Admin access required.")


@router.get("/stats")
async def admin_stats(db: DB, current_user: CurrentUser):
    """
    Comprehensive operational snapshot for the admin panel.
    Covers: users, billing, audits, academy, XP, disputes, AI usage.
    """
    _require_admin(current_user)
    logger.info("Admin stats accessed by %s", current_user.email)

    now      = datetime.utcnow()
    today    = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # ── Users ──────────────────────────────────────────────────────────────────
    total_users = (await db.scalar(select(func.count()).select_from(User))) or 0

    signups_today = (await db.scalar(
        select(func.count()).select_from(User).where(User.created_at >= today)
    )) or 0

    signups_week = (await db.scalar(
        select(func.count()).select_from(User).where(User.created_at >= week_ago)
    )) or 0

    tier_rows = await db.execute(
        select(User.tier, func.count().label("n")).group_by(User.tier)
    )
    tiers = {r.tier.value: r.n for r in tier_rows.all()}

    active_subs = (await db.scalar(
        select(func.count()).select_from(User).where(
            User.subscription_status == SubscriptionStatusEnum.ACTIVE
        )
    )) or 0

    # Monthly active users (any XP event)
    mau = (await db.scalar(
        select(func.count(XPLog.user_id.distinct())).where(XPLog.earned_at >= month_ago)
    )) or 0

    wau = (await db.scalar(
        select(func.count(XPLog.user_id.distinct())).where(XPLog.earned_at >= week_ago)
    )) or 0

    # ── Audits ─────────────────────────────────────────────────────────────────
    total_audits = (await db.scalar(select(func.count()).select_from(Audit))) or 0
    completed_audits = (await db.scalar(
        select(func.count()).select_from(Audit).where(Audit.status == "completed")
    )) or 0
    audits_this_week = (await db.scalar(
        select(func.count()).select_from(Audit).where(Audit.created_at >= week_ago)
    )) or 0

    avg_risk_score = (await db.scalar(
        select(func.avg(Audit.risk_score)).where(
            Audit.status == "completed", Audit.risk_score.isnot(None)
        )
    ))

    audit_completion_pct = (
        round((completed_audits / total_audits) * 100, 1) if total_audits > 0 else 0.0
    )

    # ── Academy ────────────────────────────────────────────────────────────────
    module_completions = (await db.scalar(
        select(func.count()).select_from(AcademyProgress).where(
            AcademyProgress.status == AcademyProgressStatus.COMPLETED
        )
    )) or 0

    # Top 5 most-completed modules
    top_module_rows = await db.execute(
        select(
            AcademyProgress.module_id,
            func.count().label("completions"),
        )
        .where(AcademyProgress.status == AcademyProgressStatus.COMPLETED)
        .group_by(AcademyProgress.module_id)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_module_ids = {r.module_id: r.completions for r in top_module_rows.all()}

    # Resolve module titles
    top_modules = []
    if top_module_ids:
        mod_rows = await db.execute(
            select(AcademyModule.id, AcademyModule.title, AcademyModule.order_index).where(
                AcademyModule.id.in_(list(top_module_ids.keys()))
            )
        )
        for m in mod_rows.all():
            top_modules.append({
                "title":       m.title,
                "order_index": m.order_index,
                "completions": top_module_ids[m.id],
            })
        top_modules.sort(key=lambda x: -x["completions"])

    # ── Disputes ───────────────────────────────────────────────────────────────
    total_disputes = (await db.scalar(select(func.count()).select_from(DisputeDraft))) or 0
    disputes_week  = (await db.scalar(
        select(func.count()).select_from(DisputeDraft).where(DisputeDraft.created_at >= week_ago)
    )) or 0

    # ── XP / engagement ────────────────────────────────────────────────────────
    total_xp   = (await db.scalar(select(func.sum(XPLog.xp_amount)))) or 0
    weekly_xp  = (await db.scalar(select(func.sum(XPLog.xp_amount)).where(XPLog.earned_at >= week_ago))) or 0

    xp_rows = await db.execute(
        select(XPLog.event_type, func.count().label("n"), func.sum(XPLog.xp_amount).label("xp"))
        .group_by(XPLog.event_type)
        .order_by(func.count().desc())
    )
    xp_by_event = [
        {
            "event": r.event_type.value if hasattr(r.event_type, "value") else str(r.event_type),
            "count": r.n,
            "xp":   r.xp or 0,
        }
        for r in xp_rows.all()
    ]

    # AI usage this week (approximated from XP log + direct User.ai_usage_count sum)
    ai_usage_total = (await db.scalar(select(func.sum(User.ai_usage_count)))) or 0

    return {
        "users": {
            "total":          total_users,
            "signups_today":  signups_today,
            "signups_week":   signups_week,
            "active_subs":    active_subs,
            "tiers":          tiers,
            "mau":            mau,
            "wau":            wau,
        },
        "audits": {
            "total":             total_audits,
            "completed":         completed_audits,
            "this_week":         audits_this_week,
            "completion_pct":    audit_completion_pct,
            "avg_risk_score":    round(avg_risk_score, 1) if avg_risk_score else None,
        },
        "academy": {
            "module_completions": module_completions,
            "top_modules":        top_modules,
        },
        "disputes": {
            "total": total_disputes,
            "week":  disputes_week,
        },
        "xp": {
            "total":     total_xp,
            "weekly":    weekly_xp,
            "by_event":  xp_by_event,
        },
        "ai": {
            "total_messages": ai_usage_total,
        },
        "as_of": now.isoformat(),
    }


def _mask_email(email: str | None) -> str:
    """Partially mask an email for privacy in admin views."""
    if not email or "@" not in email:
        return "—"
    local, domain = email.split("@", 1)
    return local[:2] + "***@" + domain


@router.get("/recent")
async def admin_recent(db: DB, current_user: CurrentUser):
    """
    Live activity feed for the admin operations dashboard.
    Returns recent signups, audits, incomplete audits, and disputes.
    """
    _require_admin(current_user)
    logger.info("Admin recent feed accessed by %s", current_user.email)

    # Recent signups (last 10)
    signup_rows = await db.execute(
        select(User.id, User.email, User.name, User.tier, User.created_at)
        .order_by(User.created_at.desc())
        .limit(10)
    )
    recent_signups = [
        {
            "id":         r.id,
            "email":      _mask_email(r.email),
            "name":       (r.name or "")[:20] if r.name else "—",
            "tier":       r.tier.value,
            "created_at": r.created_at.isoformat(),
        }
        for r in signup_rows.all()
    ]

    # Recent audits (last 10, all statuses)
    audit_rows = await db.execute(
        select(Audit.id, Audit.user_id, Audit.status, Audit.risk_score, Audit.created_at)
        .order_by(Audit.created_at.desc())
        .limit(10)
    )
    recent_audits = [
        {
            "id":         r.id,
            "status":     r.status.value if hasattr(r.status, "value") else r.status,
            "risk_score": r.risk_score,
            "created_at": r.created_at.isoformat(),
        }
        for r in audit_rows.all()
    ]

    # Incomplete audits (uploaded or verified, not completed)
    incomplete_rows = await db.execute(
        select(Audit.id, Audit.user_id, Audit.status, Audit.created_at)
        .where(Audit.status.in_(["uploaded", "verified"]))
        .order_by(Audit.created_at.desc())
        .limit(20)
    )
    incomplete_audits = [
        {
            "id":         r.id,
            "status":     r.status.value if hasattr(r.status, "value") else r.status,
            "created_at": r.created_at.isoformat(),
        }
        for r in incomplete_rows.all()
    ]

    # Recent disputes (last 10)
    dispute_rows = await db.execute(
        select(
            DisputeDraft.id,
            DisputeDraft.user_id,
            DisputeDraft.strategy_type,
            DisputeDraft.created_at,
        )
        .order_by(DisputeDraft.created_at.desc())
        .limit(10)
    )
    recent_disputes = [
        {
            "id":            r.id,
            "strategy_type": r.strategy_type,
            "created_at":    r.created_at.isoformat(),
        }
        for r in dispute_rows.all()
    ]

    return {
        "recent_signups":    recent_signups,
        "recent_audits":     recent_audits,
        "incomplete_audits": incomplete_audits,
        "recent_disputes":   recent_disputes,
        "as_of":             datetime.utcnow().isoformat(),
    }
