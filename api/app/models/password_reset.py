"""
Password Reset Token — secure, single-use, time-limited reset flow.

token:      URL-safe random string (32 bytes → 43 chars) — this IS the secret
expires_at: 1 hour from creation
used_at:    set on first use; any subsequent use is rejected
"""

import secrets
from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _new_token() -> str:
    """Generate a cryptographically secure, URL-safe reset token."""
    return secrets.token_urlsafe(32)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id:         Mapped[str]           = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    token:      Mapped[str]           = mapped_column(String(64), unique=True, nullable=False, default=_new_token, index=True)
    user_id:    Mapped[str]           = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), nullable=False)
    used_at:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
