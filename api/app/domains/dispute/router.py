import logging

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import DB, CurrentUser
from app.models.audit import AuditRecommendation

from .schemas import (
    DisputeDraftDetail, DisputeDraftOut, DisputeRecOut,
    GenerateDisputeRequest, VALID_STRATEGIES,
)
from .service import generate_dispute, get_dispute_draft

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dispute", tags=["dispute"])


@router.post("/generate", response_model=DisputeDraftOut)
async def generate_dispute_endpoint(
    body: GenerateDisputeRequest,
    db: DB,
    current_user: CurrentUser,
):
    if body.strategy not in VALID_STRATEGIES:
        raise HTTPException(400, f"Invalid strategy. Choose from: {', '.join(sorted(VALID_STRATEGIES))}")

    if not body.recommendation_ids:
        raise HTTPException(400, "At least one recommendation must be selected.")

    try:
        draft = await generate_dispute(
            db=db,
            user_id=current_user.id,
            user_name=current_user.name or "Consumer",
            audit_id=body.audit_id,
            recommendation_ids=body.recommendation_ids,
            strategy=body.strategy,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception:
        logger.exception("Dispute generation failed for user %s", current_user.id)
        raise HTTPException(500, "Failed to generate dispute letter.")

    return DisputeDraftOut.model_validate(draft)


@router.get("/{draft_id}", response_model=DisputeDraftDetail)
async def get_dispute_draft_endpoint(
    draft_id: str,
    db: DB,
    current_user: CurrentUser,
):
    try:
        draft = await get_dispute_draft(db, draft_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(404, str(exc))

    rec_ids: list[str] = draft.account_ids or []
    recs: list[AuditRecommendation] = []
    if rec_ids:
        recs_result = await db.execute(
            select(AuditRecommendation).where(AuditRecommendation.id.in_(rec_ids))
        )
        recs = list(recs_result.scalars().all())

    return DisputeDraftDetail(
        id=draft.id,
        audit_id=draft.audit_id,
        strategy_type=draft.strategy_type,
        content=draft.content,
        created_at=draft.created_at,
        recommendation_ids=rec_ids,
        recommendations=[DisputeRecOut.model_validate(r) for r in recs],
    )
