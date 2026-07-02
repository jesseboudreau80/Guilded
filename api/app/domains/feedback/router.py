import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.deps import DB, CurrentUser
from app.models.feedback import UserFeedback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackRequest(BaseModel):
    page:    str
    rating:  int   # 1 = helpful, -1 = not helpful, 0 = confused/issue
    notes:   str | None = None
    context: dict[str, Any] | None = None


@router.post("", status_code=201)
async def submit_feedback(body: FeedbackRequest, db: DB, current_user: CurrentUser):
    """
    Submit beta feedback. Used by FeedbackWidget and FounderFeedback components.
    Rating: 1 = positive, -1 = negative, 0 = neutral/confused.
    """
    if body.rating not in (1, -1, 0):
        raise HTTPException(400, "rating must be 1, -1, or 0")

    fb = UserFeedback(
        user_id = current_user.id,
        page    = body.page[:128],
        rating  = body.rating,
        notes   = body.notes[:2000] if body.notes else None,
        context = body.context,
    )
    db.add(fb)
    await db.flush()

    logger.info(
        "Feedback: user=%s page=%s rating=%d",
        current_user.id, body.page, body.rating,
    )
    return {"id": fb.id, "recorded": True}
