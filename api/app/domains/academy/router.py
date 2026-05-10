import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.core.deps import DB, CurrentUser
from app.models.academy import AcademyProgress, AcademyProgressStatus
from app.models.xp import XPEventType

from .schemas import (
    AcademyModuleOut, AcademyProgressOut, RecommendedModuleOut,
    StartModuleOut, XPAwardOut, XPAwardRequest, XPSummaryOut,
)
from .service import (
    complete_module, get_recommended_modules, get_user_progress,
    list_academy_modules, start_module,
)
from .xp_service import (
    award_xp, check_and_award_progression_badges, get_xp_summary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/academy", tags=["academy"])


@router.get("/modules", response_model=list[AcademyModuleOut])
async def academy_modules(db: DB, current_user: CurrentUser):
    """All academy modules with lesson counts and locked state for current tier."""
    return await list_academy_modules(db, current_user.id, current_user.tier)


@router.get("/recommended/{audit_id}", response_model=list[RecommendedModuleOut])
async def academy_recommended(audit_id: str, db: DB, current_user: CurrentUser):
    """
    Return academy modules recommended for a completed audit.
    Trigger detection maps audit findings to curriculum areas.
    Results are sorted by priority (highest first).
    """
    try:
        return await get_recommended_modules(db, audit_id, current_user.id, current_user.tier)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception:
        logger.exception("Recommendation engine failed for audit %s", audit_id)
        raise HTTPException(500, "Failed to generate recommendations.")


@router.get("/progress", response_model=list[AcademyProgressOut])
async def academy_progress(db: DB, current_user: CurrentUser):
    """User's progress state across all academy modules."""
    return await get_user_progress(db, current_user.id)


@router.post("/progress/{module_id}/start", response_model=StartModuleOut)
async def academy_start_module(module_id: str, db: DB, current_user: CurrentUser):
    """Mark an academy module as started (in_progress). Idempotent."""
    try:
        progress = await start_module(db, current_user.id, module_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception:
        logger.exception("Failed to start module %s for user %s", module_id, current_user.id)
        raise HTTPException(500, "Failed to record module start.")
    return StartModuleOut(module_id=progress.module_id, status=progress.status)


@router.post("/progress/{module_id}/complete", response_model=StartModuleOut)
async def academy_complete_module(module_id: str, db: DB, current_user: CurrentUser):
    """Mark an academy module as completed. Awards 50 XP and checks for badge promotions."""
    try:
        progress = await complete_module(db, current_user.id, module_id)
        # Award XP — idempotent so double-clicks don't double-award
        await award_xp(db, current_user.id, XPEventType.MODULE_COMPLETE, reference=module_id)
        # Count total completed modules for badge checks
        completed_count = await db.scalar(
            select(func.count()).select_from(AcademyProgress).where(
                AcademyProgress.user_id == current_user.id,
                AcademyProgress.status  == AcademyProgressStatus.COMPLETED,
            )
        )
        summary = await get_xp_summary(db, current_user.id)
        await check_and_award_progression_badges(
            db, current_user.id, summary["total_xp"], completed_count or 0,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception:
        logger.exception("Failed to complete module %s for user %s", module_id, current_user.id)
        raise HTTPException(500, "Failed to record module completion.")
    return StartModuleOut(module_id=progress.module_id, status=progress.status)


# ── XP endpoints ──────────────────────────────────────────────────────────────

@router.post("/xp/award", response_model=XPAwardOut)
async def xp_award(body: XPAwardRequest, db: DB, current_user: CurrentUser):
    """
    Award XP for an external event (audit completion, dispute draft, etc.).
    Idempotent for non-repeatable events — safe to call multiple times.
    """
    try:
        event_type = XPEventType(body.event_type)
    except ValueError:
        raise HTTPException(400, f"Unknown event_type: {body.event_type!r}")

    try:
        xp_earned = await award_xp(db, current_user.id, event_type, reference=body.reference)
        summary   = await get_xp_summary(db, current_user.id)

        completed_count = await db.scalar(
            select(func.count()).select_from(AcademyProgress).where(
                AcademyProgress.user_id == current_user.id,
                AcademyProgress.status  == AcademyProgressStatus.COMPLETED,
            )
        )
        new_badges = await check_and_award_progression_badges(
            db, current_user.id, summary["total_xp"], completed_count or 0,
        )

        # Award audit warrior badge on first audit
        if event_type == XPEventType.AUDIT_COMPLETE:
            from .xp_service import award_badge
            if await award_badge(db, current_user.id, "audit_warrior"):
                new_badges.append("audit_warrior")
        if event_type == XPEventType.DISPUTE_DRAFT:
            from .xp_service import award_badge
            if await award_badge(db, current_user.id, "dispute_drafter"):
                new_badges.append("dispute_drafter")

        return XPAwardOut(
            xp_earned=xp_earned,
            total_xp=summary["total_xp"],
            rank=summary["rank"],
            new_badges=new_badges,
        )
    except Exception:
        logger.exception("XP award failed for user %s", current_user.id)
        raise HTTPException(500, "Failed to award XP.")


@router.get("/xp/summary", response_model=XPSummaryOut)
async def xp_summary(db: DB, current_user: CurrentUser):
    """User's total XP, Guild rank, progress to next rank, recent events, and badges."""
    summary = await get_xp_summary(db, current_user.id)
    return XPSummaryOut(**summary)
