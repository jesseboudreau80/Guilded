from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DisputeDraft(Base):
    __tablename__ = "dispute_drafts"

    id:            Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:       Mapped[str]      = mapped_column(String, nullable=False, index=True)
    audit_id:      Mapped[str]      = mapped_column(String, nullable=False, index=True)
    account_ids:   Mapped[list]     = mapped_column(JSON, nullable=False)
    strategy_type: Mapped[str]      = mapped_column(String, nullable=False)
    content:       Mapped[str]      = mapped_column(Text, nullable=False)
    created_at:    Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
