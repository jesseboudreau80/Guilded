"""
Guilded Email Service
=====================
Central async email service. All email sends in Guilded go through here.

Usage:
    from app.lib.email import email_service

    await email_service.send_welcome(to_email="user@example.com", user_name="Jesse")
    await email_service.send_verification(to_email=..., user_name=..., verification_url=...)
    await email_service.send_password_reset(to_email=..., user_name=..., reset_url=...)
    await email_service.send_onboarding_progress(to_email=..., context={...})

When RESEND_API_KEY is not set, all emails are logged to console (ConsoleProvider).
"""

import logging
from dataclasses import dataclass
from typing import Any

from .config import email_config
from .renderer import renderer

logger = logging.getLogger(__name__)


# ── Message dataclass ─────────────────────────────────────────────────────────

@dataclass
class EmailMessage:
    to:       str
    subject:  str
    html:     str
    text:     str | None = None
    reply_to: str | None = None


# ── Provider abstraction ──────────────────────────────────────────────────────

class _ResendProvider:
    """Sends via the Resend API. Requires `pip install resend`."""

    def __init__(self) -> None:
        self._from   = email_config.email_from
        self._api_key = email_config.resend_api_key

    async def send(self, msg: EmailMessage) -> bool:
        try:
            import resend  # type: ignore[import-untyped]
        except ImportError:
            logger.error(
                "resend package not installed. Run: pip install resend==2.0.0"
            )
            return False

        try:
            resend.api_key = self._api_key
            payload: dict[str, Any] = {
                "from":    self._from,
                "to":      [msg.to],
                "subject": msg.subject,
                "html":    msg.html,
            }
            if msg.text:
                payload["text"] = msg.text
            if msg.reply_to or email_config.reply_to:
                payload["reply_to"] = msg.reply_to or email_config.reply_to

            resend.Emails.send(payload)
            logger.info(
                "Email sent via Resend  to=%s  subject=%r",
                msg.to, msg.subject,
            )
            return True

        except Exception as exc:
            logger.error(
                "Resend send failed  to=%s  subject=%r  error=%s",
                msg.to, msg.subject, exc,
            )
            return False


class _ConsoleProvider:
    """
    Development / unconfigured fallback.
    Logs the email instead of sending it so nothing is lost.
    """

    async def send(self, msg: EmailMessage) -> bool:
        logger.info(
            "[EMAIL-CONSOLE]  to=%s  subject=%r\n"
            "  → Configure RESEND_API_KEY to send real emails.",
            msg.to, msg.subject,
        )
        return True


# ── Email service ─────────────────────────────────────────────────────────────

class EmailService:
    """
    High-level async email service.

    All public methods are named send_<purpose> and accept typed keyword
    arguments instead of raw context dicts so callers get autocomplete
    and type checking.
    """

    def __init__(self) -> None:
        email_config.validate()
        self._provider = (
            _ResendProvider() if email_config.is_configured else _ConsoleProvider()
        )

    # ── Core send ──────────────────────────────────────────────────────────────

    async def _send(
        self,
        to_email:      str,
        subject:       str,
        template_name: str,
        context:       dict[str, Any],
        reply_to:      str | None = None,
    ) -> bool:
        html = renderer.render_html(template_name, context)
        text = renderer.render_text(template_name, context)
        return await self._provider.send(
            EmailMessage(
                to=to_email,
                subject=subject,
                html=html,
                text=text,
                reply_to=reply_to,
            )
        )

    # ── Welcome ────────────────────────────────────────────────────────────────

    async def send_welcome(
        self,
        to_email:  str,
        user_name: str,
    ) -> bool:
        """
        Sent immediately after successful registration.
        Prompts the user to run their first credit audit.
        """
        first = (user_name or "there").split()[0]
        return await self._send(
            to_email=to_email,
            subject="Welcome to Plutus — your recovery starts now",
            template_name="welcome",
            context={
                "user_name":    first,
                "dashboard_url": f"{email_config.app_url}/dashboard",
                "audit_url":    f"{email_config.app_url}/dashboard/audit/start",
            },
        )

    # ── Email verification ─────────────────────────────────────────────────────

    async def send_verification(
        self,
        to_email:         str,
        user_name:        str,
        verification_url: str,
        expiry_hours:     int = 24,
    ) -> bool:
        """
        Sent when email verification is required.
        verification_url must be a one-time token URL.
        """
        first = (user_name or "there").split()[0]
        return await self._send(
            to_email=to_email,
            subject="Verify your Plutus email address",
            template_name="verification",
            context={
                "user_name":         first,
                "verification_url":  verification_url,
                "expiry_hours":      expiry_hours,
            },
        )

    # ── Password reset ─────────────────────────────────────────────────────────

    async def send_password_reset(
        self,
        to_email:     str,
        user_name:    str,
        reset_url:    str,
        expiry_hours: int = 1,
    ) -> bool:
        """
        Sent in response to a forgot-password request.
        reset_url must be a short-lived one-time token URL.
        """
        first = (user_name or "there").split()[0]
        return await self._send(
            to_email=to_email,
            subject="Reset your Plutus password",
            template_name="password_reset",
            context={
                "user_name":    first,
                "reset_url":    reset_url,
                "expiry_hours": expiry_hours,
            },
        )

    # ── Onboarding progression ────────────────────────────────────────────────

    async def send_onboarding_progress(
        self,
        to_email:          str,
        user_name:         str,
        rank:              str,
        total_xp:          int,
        completed_modules: int,
        total_modules:     int,
        next_action_label: str,
        next_action_url:   str,
        risk_score:        int | None = None,
        days_active:       int = 1,
    ) -> bool:
        """
        Sent at key onboarding milestones (first module complete, first audit, rank advance).
        Reinforces progress and surfaces the next recommended action.
        """
        first = (user_name or "there").split()[0]
        progress_pct = round((completed_modules / max(total_modules, 1)) * 100)

        return await self._send(
            to_email=to_email,
            subject=f"Your recovery is building momentum — {rank} rank",
            template_name="onboarding",
            context={
                "user_name":          first,
                "rank":               rank,
                "total_xp":           total_xp,
                "completed_modules":  completed_modules,
                "total_modules":      total_modules,
                "progress_pct":       progress_pct,
                "next_action_label":  next_action_label,
                "next_action_url":    next_action_url,
                "risk_score":         risk_score,
                "days_active":        days_active,
                "dashboard_url":      f"{email_config.app_url}/dashboard",
                "command_center_url": f"{email_config.app_url}/dashboard/command-center",
            },
        )

    # ── Audit complete ─────────────────────────────────────────────────────────

    async def send_audit_complete(
        self,
        to_email:   str,
        user_name:  str,
        audit_id:   str,
        risk_score: int | None,
    ) -> bool:
        """Sent when a credit audit completes and the snapshot is ready."""
        first = (user_name or "there").split()[0]
        snapshot_url = f"{email_config.app_url}/dashboard/audit/{audit_id}/snapshot"

        risk_label = (
            "Critical risk — action required immediately" if risk_score and risk_score >= 75 else
            "Elevated risk — recovery opportunities identified"  if risk_score and risk_score >= 50 else
            "Manageable risk — targeted actions available"
        ) if risk_score is not None else "Analysis complete"

        return await self._send(
            to_email=to_email,
            subject="Your recovery snapshot is ready",
            template_name="audit_complete",
            context={
                "user_name":    first,
                "risk_score":   risk_score,
                "risk_label":   risk_label,
                "snapshot_url": snapshot_url,
            },
        )

    # ── Support confirmation ───────────────────────────────────────────────────

    async def send_support_confirmation(
        self,
        to_email:   str,
        ticket_ref: str,
    ) -> bool:
        """Sent when a support request is received."""
        return await self._send(
            to_email=to_email,
            subject=f"[{ticket_ref}] We received your message",
            template_name="support_confirmation",
            context={"ticket_ref": ticket_ref},
        )


# ── Module-level singleton ────────────────────────────────────────────────────

email_service = EmailService()
