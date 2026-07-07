"""
Email configuration — reads from environment at import time.

Required env vars for production sending:
  RESEND_API_KEY   — Resend API key  (re_...)
  EMAIL_FROM       — Verified sender  ("Guilded <guilded@mail.jesseboudreau.com>")

Optional:
  APP_URL          — Base URL for email links (falls back to NEXTAUTH_URL)
  EMAIL_REPLY_TO   — Reply-to address (default: guilded@jesseboudreau.com)

Without RESEND_API_KEY, the ConsoleProvider is used — emails are logged
to stdout instead of sent. This is the safe default for local development.
"""

import logging
import os

logger = logging.getLogger(__name__)

# Verified sending domain configured in Resend
_VERIFIED_FROM = "Plutus <guilded@mail.jesseboudreau.com>"


class EmailConfig:
    def __init__(self) -> None:
        self.resend_api_key: str = os.getenv("RESEND_API_KEY", "")

        # Use the verified domain by default.
        # Override with EMAIL_FROM if a different verified address is needed.
        self.email_from: str = os.getenv("EMAIL_FROM", _VERIFIED_FROM)

        self.app_url:  str = os.getenv(
            "APP_URL", os.getenv("NEXTAUTH_URL", "https://guilded.finance")
        )
        self.reply_to: str = os.getenv("EMAIL_REPLY_TO", "guilded@jesseboudreau.com")

    @property
    def is_configured(self) -> bool:
        return bool(self.resend_api_key)

    def validate(self) -> None:
        """Called at startup — logs the active email provider."""
        if not self.resend_api_key:
            logger.warning(
                "RESEND_API_KEY not set — emails logged to console (ConsoleProvider). "
                "Set RESEND_API_KEY in .env to enable production delivery."
            )
        else:
            logger.info(
                "Email provider: Resend  from=%s  reply_to=%s",
                self.email_from, self.reply_to,
            )


# Module-level singleton
email_config = EmailConfig()
