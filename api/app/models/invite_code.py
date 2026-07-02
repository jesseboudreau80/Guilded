"""
Beta Invite Code — controlled rollout gate.

When settings.beta_invite_required is True, new registrations must
supply a valid, active invite code. Codes are created by admins via
POST /api/admin/invite-codes.

Codes are case-insensitive, stored uppercase.
max_uses=1 → single-use (typical for personal invites)
max_uses>1 → multi-use (useful for cohort links)
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InviteCode(Base):
    __tablename__ = "invite_codes"

    code:       Mapped[str]           = mapped_column(String(32),  primary_key=True)
    is_active:  Mapped[bool]          = mapped_column(Boolean, default=True,  nullable=False)
    max_uses:   Mapped[int]           = mapped_column(Integer, default=1,     nullable=False)
    use_count:  Mapped[int]           = mapped_column(Integer, default=0,     nullable=False)
    note:       Mapped[str | None]    = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
