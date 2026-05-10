from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from app.core.deps import DB, CurrentUser
from app.core.tiers import can_access
from app.models.lms import Lesson, Progress

router = APIRouter(prefix="/api/progress", tags=["progress"])


class ProgressRequest(BaseModel):
    lesson_id: str


@router.post("")
async def mark_progress(body: ProgressRequest, db: DB, current_user: CurrentUser):
    """
    Marks a lesson as complete for the current user.

    Verifies the lesson exists and that the user's tier meets the module's
    required_tier before upserting. A lower-tier user cannot mark a locked
    lesson complete by calling this endpoint directly.
    """
    result = await db.execute(
        select(Lesson)
        .where(Lesson.id == body.lesson_id)
        .options(selectinload(Lesson.module))
    )
    lesson = result.scalar_one_or_none()

    if not lesson:
        raise HTTPException(404, "Lesson not found")

    if not can_access(current_user.tier, lesson.module.required_tier):
        raise HTTPException(403, "Insufficient tier")

    now = datetime.utcnow().isoformat()

    stmt = (
        insert(Progress)
        .values(
            user_id=current_user.id,
            lesson_id=body.lesson_id,
            completed_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_progress_user_lesson",
            set_={"completed_at": now},
        )
        .returning(Progress.id, Progress.completed_at)
    )
    row = await db.execute(stmt)
    record = row.first()

    return {"progress": {"id": record[0], "completed_at": record[1]}}
