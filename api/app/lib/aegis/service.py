"""
Aegis Governance Service
========================
High-level interface consumed by Guilded application code.

Key responsibilities:
  1. Cache governance decisions (5-minute TTL)
  2. Apply fallback logic when Aegis is unreachable
  3. Log governance source for every decision
  4. Provide typed results via Pydantic models

Fallback strategy:
  When Aegis is unreachable (timeout, error, unconfigured):
  - entitlements → return None  (callers use local tier)
  - ai_limits    → return None  (callers use AI_LIMITS[tier])
  - verify_access → return None  (callers use local can_access())

All fallbacks are logged at WARNING level so operators can see
how often governance is served locally vs from Aegis.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING

from app.core.config import settings
from app.core.tiers import AI_LIMITS, TIER_LEVEL
from app.models.user import TierEnum

from .cache import _governance_cache as _cache
from .client import AegisClient
from .models import (
    AegisAccessDecision,
    AegisAILimits,
    AegisEntitlements,
    AegisHealthStatus,
    entitlements_to_tier,
)

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Cache key prefixes
_KEY_ENT  = "aegis:ent:"
_KEY_AI   = "aegis:ai:"
_KEY_ACC  = "aegis:acc:"


class AegisService:
    """
    Governance service used by Guilded application routes and middleware.

    Instantiated once at module level (singleton).
    Falls back gracefully to local decisions when Aegis is unavailable.
    """

    def __init__(self) -> None:
        self._client   = AegisClient()
        self._enabled  = bool(settings.aegis_url and settings.aegis_service_key)
        self._fallback = settings.aegis_fallback_enabled
        self._last_check: datetime | None = None
        self._last_latency: float | None  = None

        if self._enabled:
            logger.info(
                "Aegis governance layer initialised — url=%s fallback=%s",
                settings.aegis_url, self._fallback,
            )
        else:
            logger.info(
                "Aegis governance layer: NOT CONFIGURED — "
                "all decisions served locally. Set AEGIS_URL + AEGIS_SERVICE_KEY to enable."
            )

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    # ── Entitlements ──────────────────────────────────────────────────────────

    async def get_entitlements(self, email: str) -> AegisEntitlements | None:
        """
        Fetch the user's Aegis entitlements with TTL caching.

        Returns AegisEntitlements if Aegis is configured and reachable.
        Returns None if Aegis is unavailable or unconfigured (use local tier).
        """
        if not self._enabled:
            return None

        cache_key = f"{_KEY_ENT}{email}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        raw = await self._client.get_entitlements(email)
        if raw is None:
            if self._fallback:
                logger.warning(
                    "Aegis entitlement lookup failed for %s — using local tier (fallback)",
                    email,
                )
            return None

        try:
            result = AegisEntitlements(**raw)
        except Exception as exc:
            logger.error("Aegis entitlement parse error for %s: %s", email, exc)
            return None

        _cache.set(cache_key, result)
        logger.info(
            "Aegis entitlements for %s: %s (source=%s)",
            email, result.entitlements, result.source,
        )
        return result

    async def resolve_tier(self, email: str, local_tier: TierEnum) -> tuple[TierEnum, str]:
        """
        Determine the effective Guilded tier for a user.

        Priority:
          1. Aegis entitlement (if configured and reachable)
          2. Local DB tier (fallback)

        Returns (effective_tier, source) where source is "aegis" or "local".
        """
        entitlements = await self.get_entitlements(email)
        if entitlements:
            tier_name = entitlements_to_tier(entitlements.entitlements)
            if tier_name:
                try:
                    aegis_tier = TierEnum(tier_name)
                    aegis_level = TIER_LEVEL.get(aegis_tier, 0)
                    local_level = TIER_LEVEL.get(local_tier, 0)
                    # Grant the higher of Aegis vs local tier
                    if aegis_level >= local_level:
                        logger.debug(
                            "Aegis tier for %s: %s (local: %s)",
                            email, aegis_tier.value, local_tier.value,
                        )
                        return aegis_tier, "aegis"
                except ValueError:
                    pass  # unrecognised tier token — fall through to local

        return local_tier, "local"

    # ── AI Limits ─────────────────────────────────────────────────────────────

    async def get_ai_limits(self, email: str) -> AegisAILimits | None:
        """
        Fetch Aegis-governed AI limits for a user.

        Returns AegisAILimits if Aegis is configured and reachable.
        Returns None → caller should use local AI_LIMITS[tier].
        """
        if not self._enabled:
            return None

        cache_key = f"{_KEY_AI}{email}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        raw = await self._client.get_ai_limits(email)
        if raw is None:
            if self._fallback:
                logger.warning(
                    "Aegis AI limit lookup failed for %s — using local limits (fallback)",
                    email,
                )
            return None

        try:
            result = AegisAILimits(**raw)
        except Exception as exc:
            logger.error("Aegis AI limits parse error for %s: %s", email, exc)
            return None

        _cache.set(cache_key, result)
        logger.info(
            "Aegis AI limits for %s: %d/%s max_tokens=%d (policy=%s)",
            email, result.messages_per_period, result.period,
            result.max_tokens, result.policy,
        )
        return result

    async def resolve_ai_limits(
        self,
        email:     str,
        local_tier: TierEnum,
    ) -> tuple[int, int, str]:
        """
        Determine effective AI limits for a user.

        Returns (message_limit, max_tokens, source).
        source is "aegis" | "local".
        """
        aegis = await self.get_ai_limits(email)
        if aegis:
            return aegis.messages_per_period, aegis.max_tokens, "aegis"

        local = AI_LIMITS.get(local_tier, {"messages": 0, "max_tokens": 400})
        return local["messages"], local["max_tokens"], "local"

    # ── Access verification ────────────────────────────────────────────────────

    async def verify_access(
        self,
        email:    str,
        resource: str,
    ) -> AegisAccessDecision | None:
        """
        Ask Aegis whether a user may access a specific resource.

        resource examples:
          "guilded:feature:academy_module_7"
          "guilded:feature:arbitration"
          "guilded:feature:ai_counsel"

        Returns AegisAccessDecision if Aegis is reachable, else None (use local logic).
        """
        if not self._enabled:
            return None

        cache_key = f"{_KEY_ACC}{email}:{resource}"
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached

        raw = await self._client.verify_access(email, resource)
        if raw is None:
            return None

        try:
            result = AegisAccessDecision(**raw)
        except Exception as exc:
            logger.error(
                "Aegis access decision parse error for %s → %s: %s",
                email, resource, exc,
            )
            return None

        _cache.set(cache_key, result, ttl_seconds=120)  # shorter TTL for access decisions
        logger.info(
            "Aegis access for %s → %s: %s (reason=%s)",
            email, resource, "ALLOW" if result.allowed else "DENY", result.reason,
        )
        return result

    # ── Health / operational status ───────────────────────────────────────────

    async def health(self) -> AegisHealthStatus:
        """Check Aegis reachability and return governance status."""
        if not self._enabled:
            return AegisHealthStatus(
                configured=False,
                reachable=False,
                service_trust="unconfigured",
                url=None,
            )

        import time
        t0  = time.monotonic()
        raw = await self._client.health_check()
        latency = (time.monotonic() - t0) * 1000

        reachable = raw is not None
        self._last_check   = datetime.utcnow()
        self._last_latency = latency if reachable else None

        return AegisHealthStatus(
            configured=True,
            reachable=reachable,
            service_trust="verified" if reachable else "fallback",
            url=settings.aegis_url,
            latency_ms=round(latency, 1) if reachable else None,
            last_check=self._last_check,
        )

    # ── Cache management ──────────────────────────────────────────────────────

    def invalidate_user(self, email: str) -> None:
        """Bust cached governance decisions for a user (call on tier change)."""
        _cache.invalidate(f"{_KEY_ENT}{email}")
        _cache.invalidate(f"{_KEY_AI}{email}")
        logger.info("Aegis cache invalidated for %s", email)


# Module-level singleton — imported by application code
aegis = AegisService()
