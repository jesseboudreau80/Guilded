import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TierEnum(str, enum.Enum):
    APPRENTICE = "APPRENTICE"
    JOURNEYMAN = "JOURNEYMAN"
    MASTER     = "MASTER"
    HERO       = "HERO"


class SubscriptionStatusEnum(str, enum.Enum):
    INACTIVE = "INACTIVE"
    ACTIVE   = "ACTIVE"
    CANCELED = "CANCELED"
    PAST_DUE = "PAST_DUE"


class User(Base):
    __tablename__ = "users"

    id:                     Mapped[str]            = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    name:                   Mapped[str | None]      = mapped_column(String, nullable=True)
    email:                  Mapped[str | None]      = mapped_column(String, unique=True, nullable=True, index=True)
    password_hash:          Mapped[str | None]      = mapped_column(String, nullable=True)
    tier:                   Mapped[TierEnum]        = mapped_column(SAEnum(TierEnum), default=TierEnum.APPRENTICE, nullable=False)
    subscription_status:    Mapped[SubscriptionStatusEnum] = mapped_column(
                                SAEnum(SubscriptionStatusEnum), default=SubscriptionStatusEnum.INACTIVE, nullable=False
                            )
    stripe_customer_id:     Mapped[str | None]      = mapped_column(String, unique=True, nullable=True)
    stripe_subscription_id: Mapped[str | None]      = mapped_column(String, unique=True, nullable=True)
    stripe_payment_intent_id: Mapped[str | None]    = mapped_column(String, unique=True, nullable=True)
    subscription_start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    successful_billing_count: Mapped[int]           = mapped_column(Integer, default=0, nullable=False)
    ai_usage_count:          Mapped[int]            = mapped_column(Integer, default=0, nullable=False)
    ai_usage_reset_date:     Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Founders Pass / Lifetime Access ─────────────────────────────────────────
    # founders_pass=True means the user paid once for lifetime access.
    # lifetime_access is the enforcement flag; it mirrors founders_pass but can
    # also be set by admin grant (beta tester rewards, etc.).
    # founders_pass_type distinguishes pricing tiers: STANDARD ($195) / PARTNER ($97).
    founders_pass:      Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    lifetime_access:    Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    founders_pass_type: Mapped[str | None]    = mapped_column(String, nullable=True)  # STANDARD | PARTNER
    founders_pass_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Promo / Fair Use ────────────────────────────────────────────────────────
    promo_code_used:    Mapped[str | None]    = mapped_column(String, nullable=True)

    created_at:              Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at:              Mapped[datetime]        = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    consultations: Mapped[list["Consultation"]] = relationship("Consultation", back_populates="user")  # noqa: F821
    progress:      Mapped[list["Progress"]]     = relationship("Progress", back_populates="user")       # noqa: F821
