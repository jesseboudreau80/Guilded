from uuid import uuid4

from sqlalchemy import Enum as SAEnum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.user import TierEnum


class Module(Base):
    __tablename__ = "modules"

    id:            Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title:         Mapped[str]      = mapped_column(String, nullable=False)
    required_tier: Mapped[TierEnum] = mapped_column(SAEnum(TierEnum), default=TierEnum.APPRENTICE, nullable=False)
    order:         Mapped[int]      = mapped_column(Integer, nullable=False)

    lessons: Mapped[list["Lesson"]] = relationship("Lesson", back_populates="module", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id:        Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    module_id: Mapped[str] = mapped_column(String, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    title:     Mapped[str] = mapped_column(String, nullable=False)
    content:   Mapped[str] = mapped_column(String, nullable=False)
    order:     Mapped[int] = mapped_column(Integer, nullable=False)

    module:   Mapped[Module]       = relationship("Module", back_populates="lessons")
    progress: Mapped[list["Progress"]] = relationship("Progress", back_populates="lesson", cascade="all, delete-orphan")


class Progress(Base):
    __tablename__ = "progress"

    id:           Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:      Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id:    Mapped[str] = mapped_column(String, ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    completed_at: Mapped[str] = mapped_column(String, nullable=False)  # ISO datetime string

    user:   Mapped["User"]   = relationship("User", back_populates="progress")    # noqa: F821
    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="progress")

    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_progress_user_lesson"),)
