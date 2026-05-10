"""
Guilded Email Infrastructure
==============================
All email sending goes through email_service.

Quick start:
    from app.lib.email import email_service

    await email_service.send_welcome(to_email="user@example.com", user_name="Jesse")

Configuration:
    RESEND_API_KEY   — enables production sending via Resend
    EMAIL_FROM       — sender identity  (e.g. "Guilded <noreply@guilded.finance>")
    APP_URL          — used in email links  (falls back to NEXTAUTH_URL)

Without RESEND_API_KEY, emails are logged to console — safe for local dev.
"""

from .service import email_service, EmailMessage
from .config  import email_config

__all__ = ["email_service", "email_config", "EmailMessage"]
