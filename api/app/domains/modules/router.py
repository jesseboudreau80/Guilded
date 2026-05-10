from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DB, CurrentUser
from app.core.tiers import can_access
from app.models.lms import Module

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("")
async def list_modules(db: DB, current_user: CurrentUser):
    """
    Returns tier-filtered module list with lesson metadata only (no content).
    Locked content is never included in the response.
    """
    result = await db.execute(
        select(Module)
        .options(selectinload(Module.lessons))
        .order_by(Module.order)
    )
    modules = result.scalars().all()

    visible = [
        {
            "id": m.id,
            "title": m.title,
            "required_tier": m.required_tier.value,
            "order": m.order,
            "lessons": [
                {"id": l.id, "title": l.title, "order": l.order}
                for l in sorted(m.lessons, key=lambda x: x.order)
            ],
        }
        for m in modules
        if can_access(current_user.tier, m.required_tier)
    ]

    return {"modules": visible}
