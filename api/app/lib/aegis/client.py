"""
Aegis Governance API Client
============================
Low-level async HTTP client for the Aegis Ecosystem Entitlement Gateway.

All requests are signed with HMAC-SHA256 using the Guilded service key,
proving Guilded's identity to the Aegis infrastructure.

Signature scheme:
  header X-Aegis-Service:   guilded
  header X-Aegis-Timestamp: Unix timestamp (seconds)
  header X-Aegis-Signature: HMAC-SHA256(key, "guilded:{timestamp}:{path}")

This client is not imported directly by application code.
Use AegisService instead, which adds caching and fallback logic.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_SERVICE_NAME = "guilded"


class AegisClient:
    """
    Authenticated async HTTP client for the Aegis governance API.

    Usage:
        async with AegisClient() as client:
            data = await client.get_entitlements("user@example.com")
    """

    def __init__(self) -> None:
        self._base_url    = settings.aegis_url.rstrip("/")
        self._service_key = settings.aegis_service_key
        self._timeout     = settings.aegis_timeout

    # ── Signature ──────────────────────────────────────────────────────────────

    def _sign(self, path: str) -> dict[str, str]:
        """
        Generate signed headers for a request to Aegis.

        Returns headers dict with:
          X-Aegis-Service    — identifies Guilded to Aegis
          X-Aegis-Timestamp  — Unix timestamp, prevents replay attacks
          X-Aegis-Signature  — HMAC-SHA256 proof of identity
        """
        ts  = str(int(time.time()))
        msg = f"{_SERVICE_NAME}:{ts}:{path}"
        sig = hmac.new(
            self._service_key.encode("utf-8"),
            msg.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return {
            "X-Aegis-Service":   _SERVICE_NAME,
            "X-Aegis-Timestamp": ts,
            "X-Aegis-Signature": sig,
            "Content-Type":      "application/json",
            "Accept":            "application/json",
        }

    # ── HTTP helpers ───────────────────────────────────────────────────────────

    async def _get(self, path: str) -> dict[str, Any] | None:
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as http:
                resp = await http.get(url, headers=self._sign(path))
            if resp.status_code == 200:
                return resp.json()
            logger.warning(
                "Aegis GET %s returned %d: %s",
                path, resp.status_code, resp.text[:200],
            )
            return None
        except httpx.TimeoutException:
            logger.warning("Aegis GET %s timed out after %.1fs", path, self._timeout)
            return None
        except Exception as exc:
            logger.error("Aegis GET %s failed: %s", path, exc)
            return None

    async def _post(self, path: str, body: dict[str, Any]) -> dict[str, Any] | None:
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as http:
                resp = await http.post(url, headers=self._sign(path), json=body)
            if resp.status_code in (200, 201):
                return resp.json()
            logger.warning(
                "Aegis POST %s returned %d: %s",
                path, resp.status_code, resp.text[:200],
            )
            return None
        except httpx.TimeoutException:
            logger.warning("Aegis POST %s timed out after %.1fs", path, self._timeout)
            return None
        except Exception as exc:
            logger.error("Aegis POST %s failed: %s", path, exc)
            return None

    # ── Governance API calls ───────────────────────────────────────────────────

    async def get_entitlements(self, email: str) -> dict[str, Any] | None:
        """GET /ecosystem/entitlements/{email}"""
        path = f"/ecosystem/entitlements/{email}"
        logger.debug("Aegis: fetching entitlements for %s", email)
        return await self._get(path)

    async def get_ai_limits(self, email: str) -> dict[str, Any] | None:
        """GET /ecosystem/ai-limits/{email}"""
        path = f"/ecosystem/ai-limits/{email}"
        logger.debug("Aegis: fetching AI limits for %s", email)
        return await self._get(path)

    async def verify_access(
        self,
        email:    str,
        resource: str,
    ) -> dict[str, Any] | None:
        """POST /ecosystem/verify-access"""
        path = "/ecosystem/verify-access"
        logger.debug("Aegis: verifying access for %s → %s", email, resource)
        return await self._post(path, {
            "email":    email,
            "resource": resource,
            "service":  _SERVICE_NAME,
        })

    async def health_check(self) -> dict[str, Any] | None:
        """GET /health — lightweight liveness check."""
        return await self._get("/health")
