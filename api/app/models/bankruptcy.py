import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ChapterTypeEnum(str, enum.Enum):
    CHAPTER_7  = "CHAPTER_7"
    CHAPTER_13 = "CHAPTER_13"


class CaseStatusEnum(str, enum.Enum):
    PLANNING   = "PLANNING"
    IN_PROGRESS = "IN_PROGRESS"
    FILED      = "FILED"
    DISCHARGED = "DISCHARGED"


# Ordered list of canonical step keys shared between backend and frontend.
BANKRUPTCY_STEP_KEYS = [
    "credit_counseling",
    "gather_documents",
    "means_test",
    "complete_petition",
    "file_petition",
    "attend_341_meeting",
    "debtor_education",
    "receive_discharge",
]

STEP_LABELS = {
    "credit_counseling":  "Complete pre-filing credit counseling",
    "gather_documents":   "Gather financial documents (income, debts, assets)",
    "means_test":         "Complete the means test",
    "complete_petition":  "Complete the bankruptcy petition forms",
    "file_petition":      "File the petition with the court",
    "attend_341_meeting": "Attend 341 meeting of creditors",
    "debtor_education":   "Complete debtor education course",
    "receive_discharge":  "Receive discharge order",
}


class BankruptcyCase(Base):
    __tablename__ = "bankruptcy_cases"

    id:           Mapped[str]            = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:      Mapped[str]            = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    chapter_type: Mapped[ChapterTypeEnum] = mapped_column(SAEnum(ChapterTypeEnum), nullable=False)
    status:       Mapped[CaseStatusEnum]  = mapped_column(SAEnum(CaseStatusEnum), default=CaseStatusEnum.PLANNING, nullable=False)
    notes:        Mapped[str | None]      = mapped_column(String, nullable=True)
    created_at:   Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at:   Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user:  Mapped["User"]                    = relationship("User")  # noqa: F821
    steps: Mapped[list["BankruptcyStep"]]    = relationship(
        "BankruptcyStep", back_populates="case", cascade="all, delete-orphan"
    )


class BankruptcyStep(Base):
    __tablename__ = "bankruptcy_steps"

    id:           Mapped[str]          = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    case_id:      Mapped[str]          = mapped_column(String, ForeignKey("bankruptcy_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    step_key:     Mapped[str]          = mapped_column(String, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    case: Mapped[BankruptcyCase] = relationship("BankruptcyCase", back_populates="steps")

    __table_args__ = (UniqueConstraint("case_id", "step_key", name="uq_bankruptcy_step"),)
