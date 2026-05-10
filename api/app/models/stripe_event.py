from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StripeEvent(Base):
    """
    Idempotency table for Stripe webhook events.
    The Stripe event ID (evt_xxxx) is the primary key.
    Each event is inserted at the start of its processing transaction.
    A duplicate delivery raises IntegrityError → transaction rolls back
    → 200 returned to Stripe → no double processing.
    If downstream processing fails, the StripeEvent insert is also rolled back
    so Stripe's retry re-enters the transaction cleanly.
    """
    __tablename__ = "stripe_events"

    id:           Mapped[str]      = mapped_column(String, primary_key=True)  # evt_xxxx
    type:         Mapped[str]      = mapped_column(String, nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
