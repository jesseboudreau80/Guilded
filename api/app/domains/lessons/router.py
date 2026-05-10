from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DB, CurrentUser
from app.core.tiers import can_access
from app.models.lms import Lesson

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("/{lesson_id}")
async def get_lesson(lesson_id: str, db: DB, current_user: CurrentUser):
    """
    Returns full lesson content — gated by the parent module's required_tier.
    Locked content is never returned; the response is 403 with no content
    fragment, regardless of what the client requests.
    """
    result = await db.execute(
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .options(selectinload(Lesson.module))
    )
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(404, "Lesson not found")

    if not can_access(current_user.tier, lesson.module.required_tier):
        raise HTTPException(
            403,
            "Your current tier does not include access to this content.",
        )

    # required_tier is intentionally omitted from the response to avoid
    # exposing gating metadata to the client.
    return {
        "id": lesson.id,
        "title": lesson.title,
        "content": lesson.content,
        "order": lesson.order,
        "module_id": lesson.module_id,
        "module_title": lesson.module.title,
    }
