"""
Jinja2-backed email template renderer.

Templates live in:  app/lib/email/templates/*.html

Each .html template is a full Jinja2 template — no inheritance needed.
The base layout is rendered by the base.html template via include/macro
or inlined per template for maximum email-client compatibility.

All templates receive a common base context automatically:
  app_url, support_email, current_year
"""

import logging
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateNotFound

from .config import email_config

logger = logging.getLogger(__name__)

_TEMPLATES_DIR = Path(__file__).parent / "templates"


class TemplateRenderer:
    """Renders HTML and plain-text email templates via Jinja2."""

    def __init__(self) -> None:
        self._env = Environment(
            loader=FileSystemLoader(str(_TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def _base_context(self) -> dict[str, Any]:
        from datetime import datetime
        return {
            "app_url":       email_config.app_url,
            "support_email": email_config.reply_to,
            "current_year":  datetime.utcnow().year,
        }

    def render_html(self, template_name: str, context: dict[str, Any]) -> str:
        """Render a named HTML template with the given context variables."""
        try:
            template = self._env.get_template(f"{template_name}.html")
            # Merge: caller context wins over base context for duplicate keys
            return template.render(**{**self._base_context(), **context})
        except TemplateNotFound:
            logger.error("Email template not found: %s.html", template_name)
            raise

    def render_text(self, template_name: str, context: dict[str, Any]) -> str | None:
        """
        Render a plain-text fallback.
        Looks for {template_name}.txt; returns None if not found
        (Resend will auto-generate a plain-text version from HTML).
        """
        try:
            template = self._env.get_template(f"{template_name}.txt")
            return template.render(**{**self._base_context(), **context})
        except TemplateNotFound:
            return None


# Module-level singleton
renderer = TemplateRenderer()
