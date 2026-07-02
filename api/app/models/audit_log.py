"""
Audit Thinking Log — structured operational events for each audit run.

Stores machine-readable events at key pipeline stages:
  ocr_completed, extraction_completed, confidence_scored,
  analysis_started, analysis_completed

Purpose:
  - Operational debugging and visibility
  - Future explainability layer
  - Enterprise audit trail
  - Anomaly detection

NOT chain-of-thought. NOT LLM reasoning.
Structured stage telemetry only.
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLogEntry(Base):
    __tablename__ = "audit_thinking_logs"

    id:         Mapped[str]      = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    audit_id:   Mapped[str]      = mapped_column(String, ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type: Mapped[str]      = mapped_column(String(64), nullable=False, index=True)
    data:       Mapped[dict]     = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


# ── Event type constants ────────────────────────────────────────────────────────
# Use these instead of raw strings to avoid typos.

class AuditEvent:
    OCR_STARTED           = "ocr_started"
    OCR_COMPLETED         = "ocr_completed"
    EXTRACTION_STARTED    = "extraction_started"
    EXTRACTION_COMPLETED  = "extraction_completed"
    CONFIDENCE_SCORED     = "confidence_scored"
    VERIFICATION_STARTED  = "verification_started"
    VERIFICATION_COMPLETED = "verification_completed"
    ANALYSIS_STARTED      = "analysis_started"
    ANALYSIS_COMPLETED    = "analysis_completed"
    ACCOUNT_EDITED        = "account_edited"
