"""
Email configuration and environment validation.
Imported at module level so misconfiguration is caught at startup.
"""

import logging
import os

logger = logging.getLogger(__name__)


class EmailConfig:
    """
    Centralised email configuration.

    Required for sending:
      RESEND_API_KEY   — Resend API key (re_...)
      EMAIL_FROM       — Sender address  ("Guilded <noreply@guilded.finance>")

    Optional:
      APP_URL          — Used in email links (falls back to NEXTAUTH_URL)
      EMAIL_REPLY_TO   — Reply-to address
    """

    def __init__(self) -> None:
        self.resend_api_key: str = os.getenv("RESEND_API_KEY", "")
        self.email_from:     str = os.getenv("EMAIL_FROM", "Guilded <noreply@guilded.finance>")
        self.app_url:        str = os.getenv("APP_URL", os.getenv("NEXTAUTH_URL", "https://guilded.finance"))
        self.reply_to:       str = os.getenv("EMAIL_REPLY_TO", "support@guilded.finance")

    @property
    def is_configured(self) -> bool:
        return bool(self.resend_api_key)

    def validate(self) -> None:
        """Log a warning if the email system is not fully configured."""
        if not self.resend_api_key:
            logger.warning(
                "RESEND_API_KEY is not set — emails will be logged to console instead of sent. "
                "Set RESEND_API_KEY in your .env to enable production email delivery."
            )
        else:
            logger.info("Email provider: Resend (from=%s)", self.email_from)


# Module-level singleton — import this everywhere
email_config = EmailConfig()
