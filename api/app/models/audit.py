import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AuditStatusEnum(str, enum.Enum):
    UPLOADED  = "uploaded"
    VERIFIED  = "verified"
    COMPLETED = "completed"


class SeverityEnum(str, enum.Enum):
    HIGH   = "high"
    MEDIUM = "medium"
    LOW    = "low"


class Audit(Base):
    __tablename__ = "audits"

    id:           Mapped[str]             = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id:      Mapped[str]             = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at:   Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    status:       Mapped[AuditStatusEnum] = mapped_column(SAEnum(AuditStatusEnum), default=AuditStatusEnum.UPLOADED, nullable=False)
    risk_score:   Mapped[int | None]      = mapped_column(Integer, nullable=True)
    summary_json: Mapped[dict | None]     = mapped_column(JSON, nullable=True)
    # OCR metadata — set at extraction time
    ocr_char_count: Mapped[int | None]   = mapped_column(Integer, nullable=True)
    ocr_page_count: Mapped[int | None]   = mapped_column(Integer, nullable=True)
    # PII scan results — counts of detected/masked sensitive fields
    pii_scan_json:  Mapped[dict | None]  = mapped_column(JSON, nullable=True)

    accounts:        Mapped[list["AuditAccount"]]        = relationship("AuditAccount",        back_populates="audit", cascade="all, delete-orphan")
    recommendations: Mapped[list["AuditRecommendation"]] = relationship("AuditRecommendation", back_populates="audit", cascade="all, delete-orphan")


class AuditAccount(Base):
    __tablename__ = "audit_accounts"

    id:               Mapped[str]         = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    audit_id:         Mapped[str]         = mapped_column(String, ForeignKey("audits.id"), nullable=False, index=True)
    creditor_name:    Mapped[str]         = mapped_column(String, nullable=False)
    account_type:     Mapped[str | None]  = mapped_column(String, nullable=True)
    account_number:   Mapped[str | None]  = mapped_column(String, nullable=True)   # last 4 digits from report
    balance:          Mapped[float | None] = mapped_column(Float, nullable=True)
    status:           Mapped[str | None]  = mapped_column(String, nullable=True)
    negative_flag:    Mapped[bool]        = mapped_column(Boolean, default=False, nullable=False)
    verified_by_user: Mapped[bool]        = mapped_column(Boolean, default=False, nullable=False)
    # Extraction confidence — "high" | "medium" | "low"
    confidence:       Mapped[str | None]  = mapped_column(String(10), nullable=True)
    # JSON list of detected extraction flags
    extraction_flags: Mapped[list | None] = mapped_column(JSON, nullable=True)

    audit: Mapped["Audit"] = relationship("Audit", back_populates="accounts")


class AuditRecommendation(Base):
    __tablename__ = "audit_recommendations"

    id:          Mapped[str]          = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    audit_id:    Mapped[str]          = mapped_column(String, ForeignKey("audits.id"), nullable=False, index=True)
    # Optional link to the specific account this recommendation targets
    account_id:  Mapped[str | None]   = mapped_column(String, ForeignKey("audit_accounts.id", ondelete="SET NULL"), nullable=True)
    severity:    Mapped[SeverityEnum] = mapped_column(SAEnum(SeverityEnum), nullable=False)
    title:       Mapped[str]          = mapped_column(String, nullable=False)
    description: Mapped[str]          = mapped_column(String, nullable=False)
    locked:      Mapped[bool]         = mapped_column(Boolean, default=True, nullable=False)

    audit:   Mapped["Audit"]         = relationship("Audit", back_populates="recommendations")
    account: Mapped["AuditAccount | None"] = relationship("AuditAccount", foreign_keys=[account_id])
