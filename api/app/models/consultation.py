from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import TierEnum


class Consultation(Base):
    __tablename__ = "consultations"

    id:             Mapped[str]           = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:        Mapped[str]           = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tier_at_purchase: Mapped[TierEnum]    = mapped_column(SAEnum(TierEnum), nullable=False)
    price_paid:     Mapped[int]           = mapped_column(Integer, nullable=False)  # cents
    discounted:     Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    scheduled_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:     Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="consultations")  # noqa: F821
