import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean, DateTime, Enum as SAEnum, ForeignKey,
    Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import TierEnum


class AcademyProgressStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS  = "in_progress"
    COMPLETED    = "completed"


class AcademyModule(Base):
    __tablename__ = "academy_modules"

    id:                Mapped[str]         = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    slug:              Mapped[str]         = mapped_column(String, unique=True, nullable=False, index=True)
    title:             Mapped[str]         = mapped_column(String, nullable=False)
    description:       Mapped[str]         = mapped_column(Text, nullable=False)
    curriculum_topic:  Mapped[str]         = mapped_column(String, nullable=False)
    tier_required:     Mapped[TierEnum]    = mapped_column(SAEnum(TierEnum), default=TierEnum.APPRENTICE, nullable=False)
    order_index:       Mapped[int]         = mapped_column(Integer, nullable=False)
    estimated_minutes: Mapped[int]         = mapped_column(Integer, default=30, nullable=False)
    badge_label:       Mapped[str | None]  = mapped_column(String, nullable=True)

    lessons:  Mapped[list["AcademyLesson"]]  = relationship(
        "AcademyLesson",  back_populates="module",
        cascade="all, delete-orphan", order_by="AcademyLesson.order_index",
    )
    triggers: Mapped[list["AcademyTrigger"]] = relationship(
        "AcademyTrigger", back_populates="module",
        cascade="all, delete-orphan",
    )


class AcademyLesson(Base):
    __tablename__ = "academy_lessons"

    id:          Mapped[str]  = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    module_id:   Mapped[str]  = mapped_column(String, ForeignKey("academy_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title:       Mapped[str]  = mapped_column(String, nullable=False)
    content_key: Mapped[str]  = mapped_column(String, nullable=False)
    order_index: Mapped[int]  = mapped_column(Integer, nullable=False)
    is_preview:  Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    module: Mapped["AcademyModule"] = relationship("AcademyModule", back_populates="lessons")


class AcademyTrigger(Base):
    __tablename__ = "academy_triggers"

    id:          Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    trigger_key: Mapped[str] = mapped_column(String, nullable=False, index=True)
    module_id:   Mapped[str] = mapped_column(String, ForeignKey("academy_modules.id", ondelete="CASCADE"), nullable=False)
    priority:    Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    rationale:   Mapped[str] = mapped_column(String, nullable=False)

    module: Mapped["AcademyModule"] = relationship("AcademyModule", back_populates="triggers")

    __table_args__ = (UniqueConstraint("trigger_key", "module_id", name="uq_trigger_module"),)


class AcademyProgress(Base):
    __tablename__ = "academy_progress"

    id:           Mapped[str]                   = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:      Mapped[str]                   = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id:    Mapped[str]                   = mapped_column(String, ForeignKey("academy_modules.id", ondelete="CASCADE"), nullable=False)
    status:       Mapped[AcademyProgressStatus] = mapped_column(SAEnum(AcademyProgressStatus), default=AcademyProgressStatus.NOT_STARTED, nullable=False)
    started_at:   Mapped[datetime | None]       = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None]       = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "module_id", name="uq_academy_progress"),)
