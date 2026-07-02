"""
UserFeedback — lightweight beta feedback collection.

Stores thumbs up/down ratings and optional notes from users.
Reviewed by admins via GET /api/admin/feedback.

page: identifies where the feedback was submitted
  e.g. "audit-results", "academy-module", "dashboard", "dispute-generator"

rating: 1 = positive, -1 = negative, 0 = neutral/confused

context: optional JSON for additional metadata
  e.g. {"audit_id": "...", "module_slug": "...", "category": "bug"}
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id:         Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:    Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    page:       Mapped[str]      = mapped_column(String(128), nullable=False, index=True)
    rating:     Mapped[int]      = mapped_column(Integer, nullable=False)  # 1 | -1 | 0
    notes:      Mapped[str | None] = mapped_column(Text, nullable=True)
    context:    Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
