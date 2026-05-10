import logging
from datetime import datetime, timezone

from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.tiers import TIER_LEVEL
from app.models.academy import (
    AcademyLesson, AcademyModule, AcademyProgress,
    AcademyProgressStatus, AcademyTrigger,
)
from app.models.audit import Audit, AuditRecommendation
from app.models.user import TierEnum

from .curriculum import CURRICULUM
from .schemas import AcademyModuleOut, AcademyProgressOut, RecommendedModuleOut
from .triggers import detect_triggers

logger = logging.getLogger(__name__)


# ── Curriculum seed ───────────────────────────────────────────────────────────

async def seed_academy_curriculum(db: AsyncSession) -> None:
    """
    Slug-set aware seed.

    Compares the slugs currently in the DB against the canonical CURRICULUM list.
    If they match exactly → no-op.
    If they differ (new curriculum deployed) → TRUNCATE curriculum tables and
    reseed from CURRICULUM. AcademyProgress rows are also cleared via CASCADE
    because their module_id FK references academy_modules(id) ON DELETE CASCADE.
    """
    expected_slugs = {m["slug"] for m in CURRICULUM}

    existing_result = await db.execute(select(AcademyModule.slug))
    existing_slugs  = set(existing_result.scalars().all())

    if existing_slugs == expected_slugs:
        logger.info("Academy curriculum up to date (%d modules). Skipping seed.", len(existing_slugs))
        return

    if existing_slugs:
        logger.info(
            "Academy curriculum mismatch — reseeding. "
            "Expected slugs: %s | Found: %s",
            sorted(expected_slugs), sorted(existing_slugs),
        )
        # Delete in dependency order; CASCADE handles academy_progress.
        await db.execute(sa_delete(AcademyLesson))
        await db.execute(sa_delete(AcademyTrigger))
        await db.execute(sa_delete(AcademyProgress))
        await db.execute(sa_delete(AcademyModule))
        await db.flush()

    for mod_data in CURRICULUM:
        module = AcademyModule(
            slug=mod_data["slug"],
            title=mod_data["title"],
            description=mod_data["description"],
            curriculum_topic=mod_data["curriculum_topic"],
            tier_required=TierEnum(mod_data["tier_required"]),
            order_index=mod_data["order_index"],
            estimated_minutes=mod_data["estimated_minutes"],
            badge_label=mod_data.get("badge_label"),
        )
        db.add(module)
        await db.flush()

        for i, lesson_data in enumerate(mod_data.get("lessons", [])):
            db.add(AcademyLesson(
                module_id=module.id,
                title=lesson_data["title"],
                content_key=lesson_data["content_key"],
                order_index=i + 1,
                is_preview=lesson_data.get("is_preview", False),
            ))

        for trigger_data in mod_data.get("triggers", []):
            db.add(AcademyTrigger(
                trigger_key=trigger_data["trigger_key"],
                module_id=module.id,
                priority=trigger_data["priority"],
                rationale=trigger_data["rationale"],
            ))

    await db.commit()
    logger.info("Academy curriculum seeded: %d modules", len(CURRICULUM))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _module_out(m: AcademyModule, user_level: int) -> AcademyModuleOut:
    return AcademyModuleOut(
        id=m.id,
        slug=m.slug,
        title=m.title,
        description=m.description,
        curriculum_topic=m.curriculum_topic,
        tier_required=m.tier_required.value,
        order_index=m.order_index,
        estimated_minutes=m.estimated_minutes,
        badge_label=m.badge_label,
        lesson_count=len(m.lessons),
        is_locked=TIER_LEVEL.get(m.tier_required, 0) > user_level,
    )


def _progress_out(p: AcademyProgress | None, module_id: str) -> AcademyProgressOut:
    if p is None:
        return AcademyProgressOut(
            module_id=module_id,
            status=AcademyProgressStatus.NOT_STARTED.value,
            started_at=None,
            completed_at=None,
        )
    return AcademyProgressOut(
        module_id=p.module_id,
        status=p.status.value,
        started_at=p.started_at,
        completed_at=p.completed_at,
    )


# ── Public service functions ──────────────────────────────────────────────────

async def list_academy_modules(
    db: AsyncSession,
    user_id: str,
    tier: TierEnum,
) -> list[AcademyModuleOut]:
    result = await db.execute(
        select(AcademyModule)
        .options(selectinload(AcademyModule.lessons))
        .order_by(AcademyModule.order_index)
    )
    modules = result.scalars().all()
    user_level = TIER_LEVEL.get(tier, 0)
    return [_module_out(m, user_level) for m in modules]


async def get_recommended_modules(
    db: AsyncSession,
    audit_id: str,
    user_id: str,
    tier: TierEnum,
) -> list[RecommendedModuleOut]:
    # Load audit (validate ownership)
    audit_result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == user_id)
    )
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise ValueError("Audit not found")

    # Load recommendations
    recs_result = await db.execute(
        select(AuditRecommendation).where(AuditRecommendation.audit_id == audit_id)
    )
    recs = list(recs_result.scalars().all())

    # Detect active trigger keys
    active_keys = detect_triggers(audit, recs)
    logger.info("Audit %s fired triggers: %s", audit_id, sorted(active_keys))

    if not active_keys:
        return []

    # Find matching triggers with their modules
    triggers_result = await db.execute(
        select(AcademyTrigger)
        .where(AcademyTrigger.trigger_key.in_(active_keys))
        .options(selectinload(AcademyTrigger.module).selectinload(AcademyModule.lessons))
    )
    triggers = list(triggers_result.scalars().all())

    # Group by module: collect matched trigger keys and max priority
    module_map: dict[str, dict] = {}
    for t in triggers:
        mid = t.module_id
        if mid not in module_map:
            module_map[mid] = {
                "module": t.module,
                "triggers_matched": [],
                "max_priority": 0,
                "reason": "",
            }
        module_map[mid]["triggers_matched"].append(t.trigger_key)
        if t.priority > module_map[mid]["max_priority"]:
            module_map[mid]["max_priority"] = t.priority
            module_map[mid]["reason"] = t.rationale

    # Load user progress for matched modules
    prog_result = await db.execute(
        select(AcademyProgress).where(
            AcademyProgress.user_id == user_id,
            AcademyProgress.module_id.in_(list(module_map.keys())),
        )
    )
    progress_by_module = {p.module_id: p for p in prog_result.scalars().all()}

    user_level = TIER_LEVEL.get(tier, 0)

    # Build response, sorted by priority desc
    recommendations: list[RecommendedModuleOut] = []
    for entry in sorted(module_map.values(), key=lambda e: -e["max_priority"]):
        m = entry["module"]
        locked = TIER_LEVEL.get(m.tier_required, 0) > user_level
        recommendations.append(RecommendedModuleOut(
            module=_module_out(m, user_level),
            triggers_matched=entry["triggers_matched"],
            reason=entry["reason"],
            priority=entry["max_priority"],
            is_locked=locked,
            progress=_progress_out(progress_by_module.get(m.id), m.id),
        ))

    return recommendations


async def get_user_progress(
    db: AsyncSession,
    user_id: str,
) -> list[AcademyProgressOut]:
    result = await db.execute(
        select(AcademyProgress).where(AcademyProgress.user_id == user_id)
    )
    rows = result.scalars().all()
    return [_progress_out(p, p.module_id) for p in rows]


async def start_module(
    db: AsyncSession,
    user_id: str,
    module_id: str,
) -> AcademyProgressOut:
    # Verify module exists
    module = await db.get(AcademyModule, module_id)
    if not module:
        raise ValueError("Module not found")

    now = datetime.now(timezone.utc)

    stmt = (
        pg_insert(AcademyProgress)
        .values(
            user_id=user_id,
            module_id=module_id,
            status=AcademyProgressStatus.IN_PROGRESS.value,
            started_at=now,
        )
        .on_conflict_do_nothing(constraint="uq_academy_progress")
        .returning(AcademyProgress.module_id, AcademyProgress.status, AcademyProgress.started_at, AcademyProgress.completed_at)
    )
    row = await db.execute(stmt)
    record = row.first()

    if record is None:
        # Already exists — return current state
        existing = await db.execute(
            select(AcademyProgress).where(
                AcademyProgress.user_id == user_id,
                AcademyProgress.module_id == module_id,
            )
        )
        p = existing.scalar_one()
        return _progress_out(p, module_id)

    await db.flush()
    return AcademyProgressOut(
        module_id=record[0],
        status=record[1] if isinstance(record[1], str) else record[1].value,
        started_at=record[2],
        completed_at=record[3],
    )


async def complete_module(
    db: AsyncSession,
    user_id: str,
    module_id: str,
) -> AcademyProgressOut:
    module = await db.get(AcademyModule, module_id)
    if not module:
        raise ValueError("Module not found")

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(AcademyProgress).where(
            AcademyProgress.user_id == user_id,
            AcademyProgress.module_id == module_id,
        )
    )
    progress = result.scalar_one_or_none()

    if progress is None:
        progress = AcademyProgress(
            user_id=user_id,
            module_id=module_id,
            status=AcademyProgressStatus.COMPLETED,
            started_at=now,
            completed_at=now,
        )
        db.add(progress)
    else:
        progress.status       = AcademyProgressStatus.COMPLETED
        progress.completed_at = now
        if not progress.started_at:
            progress.started_at = now

    await db.flush()
    return _progress_out(progress, module_id)
