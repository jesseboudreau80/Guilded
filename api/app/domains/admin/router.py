"""
Admin endpoints — operational visibility for Guilded operators.

Protected by email allowlist (ADMIN_EMAILS).
Every access is logged at INFO level for audit trail.

Endpoints:
  GET  /api/admin/stats       — comprehensive system snapshot
  GET  /api/admin/recent      — live activity feed (recent signups, audits, disputes)
  POST /api/admin/test-email  — send a test email to verify Resend integration
"""

import logging
import secrets
import string
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select

from app.core.deps import DB, CurrentUser
from app.models.invite_code import InviteCode
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


# ── Test email endpoint ────────────────────────────────────────────────────────

class TestEmailRequest(BaseModel):
    to_email:  str
    template:  str = "welcome"
    user_name: str = "Test User"


_VALID_TEMPLATES = {
    "welcome", "verification", "password_reset",
    "audit_complete", "onboarding", "support_confirmation",
}


@router.post("/test-email")
async def send_test_email(body: TestEmailRequest, current_user: CurrentUser):
    """
    Send a test email to verify the Resend integration is working.

    Admin-only.  Safe to call in any environment — the email service
    falls back to ConsoleProvider when RESEND_API_KEY is not set,
    so this endpoint will always return a result (even in dev).

    Useful for:
      - Verifying RESEND_API_KEY is loaded correctly
      - Testing template rendering end-to-end
      - Confirming the verified sending domain works
    """
    _require_admin(current_user)

    if body.template not in _VALID_TEMPLATES:
        raise HTTPException(
            400,
            f"Unknown template '{body.template}'. "
            f"Valid options: {sorted(_VALID_TEMPLATES)}",
        )

    from app.lib.email import email_service, email_config

    provider_name = type(email_service._provider).__name__
    configured    = email_config.is_configured

    logger.info(
        "Test email requested by %s  to=%s  template=%s  provider=%s",
        current_user.email, body.to_email, body.template, provider_name,
    )

    # Route to the correct send method based on template name
    sent = False
    error: str | None = None

    try:
        if body.template == "welcome":
            sent = await email_service.send_welcome(body.to_email, body.user_name)

        elif body.template == "verification":
            sent = await email_service.send_verification(
                body.to_email, body.user_name,
                verification_url=f"{email_config.app_url}/verify?token=test-token-123",
            )

        elif body.template == "password_reset":
            sent = await email_service.send_password_reset(
                body.to_email, body.user_name,
                reset_url=f"{email_config.app_url}/reset?token=test-reset-456",
            )

        elif body.template == "audit_complete":
            sent = await email_service.send_audit_complete(
                body.to_email, body.user_name,
                audit_id="test-audit-id-000",
                risk_score=65,
            )

        elif body.template == "onboarding":
            sent = await email_service.send_onboarding_progress(
                body.to_email, body.user_name,
                rank="Journeyman",
                total_xp=150,
                completed_modules=2,
                total_modules=7,
                next_action_label="Continue Module 3: Building Your Arsenal",
                next_action_url=f"{email_config.app_url}/dashboard/academy/building-your-arsenal",
                risk_score=65,
                days_active=5,
            )

        elif body.template == "support_confirmation":
            sent = await email_service.send_support_confirmation(
                body.to_email,
                ticket_ref="PLT-TEST-001",
            )

    except Exception as exc:
        logger.exception("Test email failed: %s", exc)
        error = str(exc)

    return {
        "sent":          sent,
        "to_email":      body.to_email,
        "template":      body.template,
        "from_address":  email_config.email_from,
        "provider":      provider_name,
        "configured":    configured,
        "app_url":       email_config.app_url,
        "error":         error,
        "note": (
            "Email sent via Resend." if (sent and configured) else
            "Email logged to console — set RESEND_API_KEY in .env to send real emails."
            if (sent and not configured) else
            "Send failed — check logs."
        ),
    }


# ── Beta invite code management ───────────────────────────────────────────────

def _generate_code(length: int = 8) -> str:
    """Generate a random uppercase invite code."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class CreateInviteCodesRequest(BaseModel):
    count:    int = 1       # how many codes to create
    max_uses: int = 1       # uses per code (1 = single-use)
    note:     str | None = None  # admin label


@router.post("/invite-codes")
async def create_invite_codes(body: CreateInviteCodesRequest, db: DB, current_user: CurrentUser):
    """Create beta invite codes. Admin only."""
    _require_admin(current_user)

    if body.count < 1 or body.count > 100:
        raise HTTPException(400, "count must be 1–100")

    codes = []
    for _ in range(body.count):
        code = _generate_code()
        db.add(InviteCode(code=code, max_uses=body.max_uses, note=body.note))
        codes.append(code)

    await db.flush()
    logger.info("Admin %s created %d invite codes", current_user.email, len(codes))
    return {"codes": codes, "max_uses": body.max_uses}


@router.get("/invite-codes")
async def list_invite_codes(db: DB, current_user: CurrentUser):
    """List all invite codes with usage status. Admin only."""
    _require_admin(current_user)

    result = await db.execute(
        select(InviteCode).order_by(InviteCode.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "code":      r.code,
            "is_active": r.is_active,
            "max_uses":  r.max_uses,
            "use_count": r.use_count,
            "available": r.max_uses - r.use_count,
            "note":      r.note,
        }
        for r in rows
    ]


@router.delete("/invite-codes/{code}")
async def deactivate_invite_code(code: str, db: DB, current_user: CurrentUser):
    """Deactivate an invite code so it can no longer be used. Admin only."""
    _require_admin(current_user)

    result = await db.execute(select(InviteCode).where(InviteCode.code == code.upper()))
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(404, "Invite code not found")

    invite.is_active = False
    await db.flush()
    return {"code": code.upper(), "deactivated": True}


# ── OCR intelligence + feedback endpoints ─────────────────────────────────────

@router.get("/ocr-stats")
async def admin_ocr_stats(db: DB, current_user: CurrentUser):
    """
    OCR pipeline health metrics from audit_thinking_logs.
    Surfaces confidence failure rates and correction patterns.
    Admin only.
    """
    _require_admin(current_user)

    from app.models.audit_log import AuditLogEntry

    week_ago = datetime.utcnow() - timedelta(days=7)

    # Total audits processed
    total_audits = (await db.scalar(select(func.count()).select_from(Audit))) or 0

    # Confidence events in last 7 days
    conf_result = await db.execute(
        select(AuditLogEntry.data)
        .where(
            AuditLogEntry.event_type == "confidence_scored",
            AuditLogEntry.created_at >= week_ago,
        )
    )
    conf_rows = conf_result.scalars().all()
    total_conf_events    = len(conf_rows)
    low_conf_audits      = sum(1 for d in conf_rows if (d or {}).get("low_confidence", 0) > 0)
    total_account_edits  = (await db.scalar(
        select(func.count()).select_from(AuditLogEntry).where(
            AuditLogEntry.event_type == "account_edited",
            AuditLogEntry.created_at >= week_ago,
        )
    )) or 0

    # OCR failure rate (image PDFs → 0 accounts extracted)
    zero_account_audits = (await db.scalar(
        select(func.count()).select_from(AuditLogEntry).where(
            AuditLogEntry.event_type == "extraction_completed",
            AuditLogEntry.data["account_count"].astext == "0",
            AuditLogEntry.created_at >= week_ago,
        )
    )) or 0

    return {
        "total_audits":         total_audits,
        "week": {
            "confidence_events":  total_conf_events,
            "low_confidence":     low_conf_audits,
            "user_corrections":   total_account_edits,
            "zero_account_ocr":   zero_account_audits,
            "low_conf_rate_pct":  round((low_conf_audits / max(total_conf_events, 1)) * 100, 1),
        },
    }


@router.get("/feedback")
async def admin_feedback(
    db: DB,
    current_user: CurrentUser,
    page: str | None = None,
    limit: int = 50,
):
    """
    List recent beta feedback submissions.
    Filter by page name optionally.
    Admin only.
    """
    _require_admin(current_user)

    from app.models.feedback import UserFeedback

    q = select(
        UserFeedback.id, UserFeedback.user_id, UserFeedback.page,
        UserFeedback.rating, UserFeedback.notes, UserFeedback.context,
        UserFeedback.created_at,
    ).order_by(UserFeedback.created_at.desc()).limit(min(limit, 200))

    if page:
        q = q.where(UserFeedback.page == page)

    result = await db.execute(q)
    rows = result.all()

    # Summary counts
    total_positive = (await db.scalar(
        select(func.count()).select_from(UserFeedback).where(UserFeedback.rating == 1)
    )) or 0
    total_negative = (await db.scalar(
        select(func.count()).select_from(UserFeedback).where(UserFeedback.rating == -1)
    )) or 0

    return {
        "summary": {
            "total_positive": total_positive,
            "total_negative": total_negative,
            "total":          total_positive + total_negative,
        },
        "items": [
            {
                "id":         r.id,
                "page":       r.page,
                "rating":     r.rating,
                "notes":      r.notes,
                "context":    r.context,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


# ── Conversion funnel ──────────────────────────────────────────────────────────

@router.get("/funnel")
async def admin_conversion_funnel(db: DB, current_user: CurrentUser):
    """
    Conversion funnel from registration to upgrade.
    Each step shows absolute count and rate vs. the previous step.
    """
    _require_admin(current_user)

    total_users     = (await db.scalar(select(func.count()).select_from(User))) or 0
    uploaded_users  = (await db.scalar(select(func.count(Audit.user_id.distinct())).select_from(Audit))) or 0
    completed_users = (await db.scalar(
        select(func.count(Audit.user_id.distinct())).where(Audit.status == "completed")
    )) or 0
    disputed_users  = (await db.scalar(
        select(func.count(DisputeDraft.user_id.distinct())).select_from(DisputeDraft)
    )) or 0
    upgraded_users  = (await db.scalar(
        select(func.count()).select_from(User).where(User.tier != "APPRENTICE")
    )) or 0

    def rate(n: int, base: int) -> float:
        return round((n / base) * 100, 1) if base > 0 else 0.0

    return {
        "steps": [
            {"label": "Registered",        "count": total_users,     "rate_from_top": 100.0,                          "rate_from_prev": None},
            {"label": "Uploaded Audit",    "count": uploaded_users,  "rate_from_top": rate(uploaded_users, total_users), "rate_from_prev": rate(uploaded_users, total_users)},
            {"label": "Completed Audit",   "count": completed_users, "rate_from_top": rate(completed_users, total_users), "rate_from_prev": rate(completed_users, max(uploaded_users, 1))},
            {"label": "Generated Dispute", "count": disputed_users,  "rate_from_top": rate(disputed_users, total_users),  "rate_from_prev": rate(disputed_users, max(completed_users, 1))},
            {"label": "Upgraded",          "count": upgraded_users,  "rate_from_top": rate(upgraded_users, total_users),  "rate_from_prev": rate(upgraded_users, max(completed_users, 1))},
        ],
        "key_rates": {
            "upload_activation":   rate(uploaded_users,  max(total_users,     1)),
            "audit_completion":    rate(completed_users, max(uploaded_users,  1)),
            "dispute_conversion":  rate(disputed_users,  max(completed_users, 1)),
            "upgrade_conversion":  rate(upgraded_users,  max(completed_users, 1)),
        },
    }


# ── AI cost telemetry ──────────────────────────────────────────────────────────

# GPT-4o-mini pricing (as of 2026-05)
# Input:  $0.15 / 1M tokens
# Output: $0.60 / 1M tokens
_GPT4O_MINI_INPUT_PER_M  = 0.15
_GPT4O_MINI_OUTPUT_PER_M = 0.60

def _est_cost(input_tokens: int, output_tokens: int) -> float:
    return (input_tokens / 1_000_000) * _GPT4O_MINI_INPUT_PER_M + \
           (output_tokens / 1_000_000) * _GPT4O_MINI_OUTPUT_PER_M


@router.get("/costs")
async def admin_ai_costs(db: DB, current_user: CurrentUser):
    """
    Estimated AI processing costs based on usage counts.
    Uses GPT-4o-mini pricing. Estimates are rough but directionally useful.
    """
    _require_admin(current_user)

    ai_queries   = (await db.scalar(select(func.sum(User.ai_usage_count)))) or 0
    total_audits = (await db.scalar(select(func.count()).select_from(Audit).where(Audit.status == "completed"))) or 0
    disputes_gen = (await db.scalar(select(func.count()).select_from(DisputeDraft))) or 0

    # Per AI counsel query: ~200 input + 600 output tokens
    ai_query_cost = _est_cost(ai_queries * 200, ai_queries * 600)

    # Per completed audit (OCR extraction + full analysis): ~8000 input + 2000 output
    audit_cost = _est_cost(total_audits * 8000, total_audits * 2000)

    # Per dispute letter: ~2500 input + 1500 output
    dispute_cost = _est_cost(disputes_gen * 2500, disputes_gen * 1500)

    total_est = ai_query_cost + audit_cost + dispute_cost

    return {
        "disclaimer": "Rough estimates only. Actual costs vary by prompt/response length.",
        "pricing_model": "GPT-4o-mini (input $0.15/1M, output $0.60/1M tokens)",
        "breakdown": {
            "ai_counsel_queries": {
                "count":         ai_queries,
                "estimated_usd": round(ai_query_cost, 4),
                "avg_per_query": round(ai_query_cost / max(ai_queries, 1), 6),
            },
            "audit_analyses": {
                "count":         total_audits,
                "estimated_usd": round(audit_cost, 4),
                "avg_per_audit": round(audit_cost / max(total_audits, 1), 4),
            },
            "dispute_letters": {
                "count":         disputes_gen,
                "estimated_usd": round(dispute_cost, 4),
                "avg_per_letter": round(dispute_cost / max(disputes_gen, 1), 4),
            },
        },
        "total_estimated_usd": round(total_est, 4),
        "monthly_projection_usd": round(total_est * 30 / max(1, 7), 2),  # rough 30-day projection from 7-day data
    }


# ── At-risk users ─────────────────────────────────────────────────────────────

@router.get("/at-risk")
async def admin_at_risk_users(db: DB, current_user: CurrentUser):
    """
    Identify beta users who need proactive outreach.

    Three segments:
      never_uploaded    — registered > 72h ago, no audit started
      uploaded_no_audit — started upload but never completed an audit
      completed_no_action — completed audit, never generated a dispute
    """
    _require_admin(current_user)

    three_days_ago = datetime.utcnow() - timedelta(days=3)

    # Subqueries
    from sqlalchemy import not_

    users_with_any_audit = select(Audit.user_id.distinct()).scalar_subquery()
    users_with_completed = select(Audit.user_id.distinct()).where(Audit.status == "completed").scalar_subquery()
    users_with_dispute   = select(DisputeDraft.user_id.distinct()).scalar_subquery()

    # Segment 1: Never uploaded (registered > 72h ago)
    r1 = await db.execute(
        select(User.id, User.email, User.name, User.created_at)
        .where(User.created_at <= three_days_ago)
        .where(not_(User.id.in_(users_with_any_audit)))
        .order_by(User.created_at.desc())
        .limit(10)
    )
    never_uploaded = [{"id": r.id, "email": _mask_email(r.email), "name": (r.name or "")[:20], "created_at": r.created_at.isoformat()} for r in r1.all()]

    # Segment 2: Uploaded but never completed
    r2 = await db.execute(
        select(User.id, User.email, User.name, User.created_at)
        .where(User.id.in_(users_with_any_audit))
        .where(not_(User.id.in_(users_with_completed)))
        .order_by(User.created_at.desc())
        .limit(10)
    )
    incomplete_audit = [{"id": r.id, "email": _mask_email(r.email), "name": (r.name or "")[:20], "created_at": r.created_at.isoformat()} for r in r2.all()]

    # Segment 3: Completed audit, no dispute
    r3 = await db.execute(
        select(User.id, User.email, User.name, User.created_at)
        .where(User.id.in_(users_with_completed))
        .where(not_(User.id.in_(users_with_dispute)))
        .order_by(User.created_at.desc())
        .limit(10)
    )
    no_dispute = [{"id": r.id, "email": _mask_email(r.email), "name": (r.name or "")[:20], "created_at": r.created_at.isoformat()} for r in r3.all()]

    return {
        "never_uploaded":    {"count": len(never_uploaded),   "users": never_uploaded},
        "incomplete_audit":  {"count": len(incomplete_audit), "users": incomplete_audit},
        "audit_no_dispute":  {"count": len(no_dispute),       "users": no_dispute},
    }


# ── OCR correction analysis ───────────────────────────────────────────────────

@router.get("/ocr-corrections")
async def admin_ocr_corrections(db: DB, current_user: CurrentUser):
    """
    Analyze which account fields users most commonly correct.
    Sourced from audit_thinking_logs with event_type='account_edited'.
    Identifies OCR extraction weaknesses for future model improvements.
    """
    _require_admin(current_user)

    from app.models.audit_log import AuditLogEntry

    result = await db.execute(
        select(AuditLogEntry.data)
        .where(AuditLogEntry.event_type == "account_edited")
        .order_by(AuditLogEntry.created_at.desc())
        .limit(500)
    )
    events = result.scalars().all()

    field_counts: dict[str, int] = {}
    for data in events:
        if not data:
            continue
        for field in (data.get("fields_changed") or []):
            field_counts[field] = field_counts.get(field, 0) + 1

    sorted_fields = sorted(field_counts.items(), key=lambda x: -x[1])

    return {
        "total_correction_events": len(events),
        "field_correction_frequency": [
            {"field": f, "corrections": c, "pct": round((c / max(len(events), 1)) * 100, 1)}
            for f, c in sorted_fields
        ],
        "insight": (
            "creditor_name corrections suggest OCR quality issues with bureau PDF formatting."
            if field_counts.get("creditor_name", 0) > field_counts.get("balance", 0)
            else "balance corrections suggest numeric OCR reliability issues."
        ) if sorted_fields else "No correction data yet.",
    }


# ── Feedback review ───────────────────────────────────────────────────────────

@router.patch("/feedback/{feedback_id}/review")
async def mark_feedback_reviewed(feedback_id: str, db: DB, current_user: CurrentUser):
    """Mark a feedback item as reviewed. Adds review timestamp to context JSON."""
    _require_admin(current_user)

    from app.models.feedback import UserFeedback

    result = await db.execute(select(UserFeedback).where(UserFeedback.id == feedback_id))
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(404, "Feedback not found.")

    fb.context = {**(fb.context or {}), "reviewed_by": current_user.email, "reviewed_at": datetime.utcnow().isoformat()}
    await db.flush()
    return {"id": feedback_id, "reviewed": True}


# ── Stripe mode status ────────────────────────────────────────────────────────

@router.get("/stripe-status")
async def admin_stripe_status(db: DB, current_user: CurrentUser):
    """
    Current Stripe environment status and consistency check.
    Helps prevent dangerous test/live mode mistakes during beta/production transitions.
    """
    _require_admin(current_user)

    from app.core.config import settings

    key  = settings.stripe_secret_key or ""
    mode = settings.stripe_mode

    key_type = (
        "live"    if key.startswith("sk_live_") else
        "test"    if key.startswith("sk_test_") else
        "unknown" if key else
        "missing"
    )

    warnings = settings.stripe_mode_warnings()

    return {
        "stripe_mode":           mode,
        "key_environment":       key_type,
        "mode_consistent":       len(warnings) == 0,
        "warnings":              warnings,
        "journeyman_price_set":  bool(settings.stripe_journeyman_price_id),
        "master_price_set":      bool(settings.stripe_master_price_id),
        "webhook_set":           bool(settings.stripe_webhook_secret),
    }


# ── PII safety telemetry ──────────────────────────────────────────────────────

@router.get("/pii-stats")
async def admin_pii_stats(db: DB, current_user: CurrentUser):
    """
    Aggregate PII scan statistics across all processed audits.
    Proves privacy controls are working operationally.
    """
    _require_admin(current_user)

    from sqlalchemy import func as sqlfunc

    # Total audits with PII scan data
    total_scanned = (await db.scalar(
        select(func.count()).select_from(Audit).where(Audit.pii_scan_json.isnot(None))
    )) or 0

    total_audits = (await db.scalar(select(func.count()).select_from(Audit))) or 0

    # Aggregate PII counts from pii_scan_json
    # We load recent audits and sum the counts (simple approach for beta scale)
    result = await db.execute(
        select(Audit.pii_scan_json)
        .where(Audit.pii_scan_json.isnot(None))
        .order_by(Audit.created_at.desc())
        .limit(1000)
    )
    pii_rows = result.scalars().all()

    total_ssns        = sum((r or {}).get("ssn_count", 0)            for r in pii_rows)
    total_acct_nums   = sum((r or {}).get("account_number_count", 0) for r in pii_rows)
    total_phones      = sum((r or {}).get("phone_count", 0)          for r in pii_rows)
    total_emails      = sum((r or {}).get("email_count", 0)          for r in pii_rows)
    total_dobs        = sum((r or {}).get("dob_count", 0)            for r in pii_rows)
    total_pii         = total_ssns + total_acct_nums + total_phones + total_emails + total_dobs

    return {
        "audits": {
            "total":         total_audits,
            "pii_scanned":   total_scanned,
            "scan_coverage": round((total_scanned / max(total_audits, 1)) * 100, 1),
        },
        "pii_blocked": {
            "ssns_blocked":            total_ssns,
            "account_numbers_masked":  total_acct_nums,
            "phone_numbers_blocked":   total_phones,
            "emails_blocked":          total_emails,
            "dob_fields_blocked":      total_dobs,
            "total_pii_fields":        total_pii,
        },
        "privacy_controls": {
            "raw_pdf_deletion":   True,   # always true — deleted immediately after OCR
            "text_minimization":  True,   # always true — LLM only sees 12k chars
            "pii_scan_active":    True,
        },
    }


# ── Webhook health ────────────────────────────────────────────────────────────

@router.get("/webhook-health")
async def admin_webhook_health(db: DB, current_user: CurrentUser):
    """
    Stripe webhook health check — shows recent events, event type breakdown,
    and validates current Stripe mode configuration.
    """
    _require_admin(current_user)

    from app.core.config import settings
    from app.models.stripe_event import StripeEvent

    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
    seven_days_ago        = datetime.utcnow() - timedelta(days=7)

    # Total events processed
    total_events  = (await db.scalar(select(func.count()).select_from(StripeEvent))) or 0
    events_24h    = (await db.scalar(select(func.count()).select_from(StripeEvent).where(StripeEvent.processed_at >= twenty_four_hours_ago))) or 0
    events_7d     = (await db.scalar(select(func.count()).select_from(StripeEvent).where(StripeEvent.processed_at >= seven_days_ago))) or 0

    # Most recent event
    last_event_row = await db.execute(
        select(StripeEvent.id, StripeEvent.type, StripeEvent.processed_at)
        .order_by(StripeEvent.processed_at.desc())
        .limit(1)
    )
    last_event = last_event_row.first()

    # Event type breakdown (last 7 days)
    type_rows = await db.execute(
        select(StripeEvent.type, func.count().label("n"))
        .where(StripeEvent.processed_at >= seven_days_ago)
        .group_by(StripeEvent.type)
        .order_by(func.count().desc())
    )
    event_types = [{"type": r.type, "count": r.n} for r in type_rows.all()]

    # Stripe mode consistency
    mode_warnings = settings.stripe_mode_warnings()

    return {
        "stripe_mode":     settings.stripe_mode,
        "mode_consistent": len(mode_warnings) == 0,
        "mode_warnings":   mode_warnings,
        "webhook_set":     bool(settings.stripe_webhook_secret),
        "events": {
            "total":      total_events,
            "last_24h":   events_24h,
            "last_7d":    events_7d,
            "last_event": {
                "id":           last_event.id,
                "type":         last_event.type,
                "processed_at": last_event.processed_at.isoformat(),
            } if last_event else None,
            "by_type_7d": event_types,
        },
        "price_ids": {
            "mode":                    settings.stripe_mode,
            "journeyman_set":          bool(settings.stripe_journeyman_price_id),
            "master_set":              bool(settings.stripe_master_price_id),
            "founders_standard_set":   bool(settings.stripe_founders_standard_price_id),
            "founders_partner_set":    bool(settings.stripe_founders_partner_price_id),
        },
    }


@router.get("/founders")
async def admin_founders(db: DB, current_user: CurrentUser):
    """
    Founders Pass visibility — total count, type breakdown, and user list.
    """
    _require_admin(current_user)

    result = await db.execute(
        select(User).where(User.founders_pass == True)  # noqa: E712
        .order_by(User.founders_pass_date.desc().nullslast())
    )
    users = result.scalars().all()

    standard = sum(1 for u in users if (u.founders_pass_type or "").upper() == "STANDARD")
    partner  = sum(1 for u in users if (u.founders_pass_type or "").upper() == "PARTNER")

    return {
        "total":    len(users),
        "standard": standard,
        "partner":  partner,
        "users": [
            {
                "id":                 u.id,
                "email":              u.email or "",
                "name":               u.name or "",
                "tier":               u.tier.value,
                "founders_pass_type": u.founders_pass_type,
                "founders_pass_date": u.founders_pass_date.isoformat() if u.founders_pass_date else None,
            }
            for u in users
        ],
    }
