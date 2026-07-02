import logging
from datetime import date

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit import Audit, AuditRecommendation
from app.models.dispute import DisputeDraft

from .prompts import DISPUTE_SYSTEM, build_dispute_user

logger = logging.getLogger(__name__)

_openai = OpenAI(api_key=settings.openai_api_key)


def _call_llm_text(system: str, user: str, max_tokens: int = 2048) -> str:
    response = _openai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return (response.choices[0].message.content or "").strip()


async def generate_dispute(
    db: AsyncSession,
    user_id: str,
    user_name: str,
    audit_id: str,
    recommendation_ids: list[str],
    strategy: str,
    context_flags:  list[str] | None = None,
    context_notes:  str | None = None,
    bureau_targets: list[str] | None = None,
) -> DisputeDraft:
    logger.info(
        "Dispute draft generation started — user=%s audit=%s recs=%d strategy=%s",
        user_id, audit_id, len(recommendation_ids), strategy,
    )

    # Validate audit ownership
    audit_result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == user_id)
    )
    audit = audit_result.scalar_one_or_none()
    if not audit:
        raise ValueError("Audit not found")

    # Fetch selected recommendations
    recs_result = await db.execute(
        select(AuditRecommendation).where(
            AuditRecommendation.audit_id == audit_id,
            AuditRecommendation.id.in_(recommendation_ids),
        )
    )
    recs = recs_result.scalars().all()
    if not recs:
        raise ValueError("No matching recommendations found for the provided IDs")

    recs_text = "\n".join(
        f"- [{r.severity.value.upper()}] {r.title}: {r.description}"
        for r in recs
    )

    today = date.today().strftime("%B %d, %Y")
    user_prompt = build_dispute_user(
        recs_text, strategy, user_name, today,
        context_flags=context_flags,
        context_notes=context_notes,
        bureau_targets=bureau_targets,
    )

    letter = _call_llm_text(DISPUTE_SYSTEM, user_prompt, max_tokens=2048)

    draft = DisputeDraft(
        user_id=user_id,
        audit_id=audit_id,
        account_ids=recommendation_ids,  # JSON column — stores rec IDs
        strategy_type=strategy,
        content=letter,
    )
    db.add(draft)
    await db.flush()

    logger.info(
        "Dispute draft completed — user=%s draft=%s recs=%d",
        user_id, draft.id, len(recs),
    )

    return draft


async def get_dispute_draft(
    db: AsyncSession,
    draft_id: str,
    user_id: str,
) -> DisputeDraft:
    result = await db.execute(
        select(DisputeDraft).where(
            DisputeDraft.id == draft_id,
            DisputeDraft.user_id == user_id,
        )
    )
    draft = result.scalar_one_or_none()
    if not draft:
        raise ValueError("Dispute draft not found")
    return draft
