"""
Aegis Governance Visibility Router
====================================
Operational endpoints for monitoring Guilded's integration with the
Aegis Governance Ecosystem.

Endpoints:
  GET /api/aegis/status           — service health + governance config
  GET /api/aegis/entitlements     — caller's effective entitlements
  GET /api/aegis/ai-limits        — caller's effective AI limits
  GET /api/aegis/verify-access    — test access to a specific resource
  POST /api/aegis/cache/invalidate — bust cached governance decisions (admin)
"""

import logging

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.core.deps import CurrentUser
from app.core.tiers import AI_LIMITS
from app.lib.aegis import aegis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/aegis", tags=["aegis"])

_ADMIN_EMAILS = {"jesse.boudreau.dev@gmail.com"}


# ── Health / status ───────────────────────────────────────────────────────────

@router.get("/status")
async def aegis_status(current_user: CurrentUser):
    """
    Governance status for the current service instance.

    Returns configuration state, Aegis reachability, and trust level.
    Safe for any authenticated user — no sensitive data exposed.
    """
    health = await aegis.health()
    local  = AI_LIMITS.get(current_user.tier, {"messages": 0, "max_tokens": 400})

    return {
        "service":    "guilded",
        "environment": "production" if not settings.debug else "development",
        "aegis": {
            "configured":    health.configured,
            "reachable":     health.reachable,
            "url":           health.url,
            "service_trust": health.service_trust,
            "latency_ms":    health.latency_ms,
            "last_check":    health.last_check.isoformat() if health.last_check else None,
        },
        "governance": {
            "entitlement_source": "aegis" if (health.configured and health.reachable) else "local",
            "ai_limits_source":   "aegis" if (health.configured and health.reachable) else "local",
            "fallback_enabled":   settings.aegis_fallback_enabled,
        },
        "local_limits": {
            "tier":     current_user.tier.value,
            "messages": local["messages"],
            "tokens":   local["max_tokens"],
        },
    }


# ── Per-user governance resolution ───────────────────────────────────────────

@router.get("/entitlements")
async def my_entitlements(current_user: CurrentUser):
    """
    Resolve the calling user's effective entitlements.

    Shows both Aegis-sourced and local-tier decisions for comparison.
    """
    if not current_user.email:
        raise HTTPException(400, "User email required for entitlement lookup.")

    entitlements = await aegis.get_entitlements(current_user.email)
    effective_tier, tier_source = await aegis.resolve_tier(
        current_user.email, current_user.tier
    )

    return {
        "email":          current_user.email,
        "local_tier":     current_user.tier.value,
        "effective_tier": effective_tier.value,
        "tier_source":    tier_source,
        "aegis_entitlements": {
            "tokens":  entitlements.entitlements if entitlements else [],
            "source":  entitlements.source        if entitlements else None,
            "tier":    entitlements.tier           if entitlements else None,
        } if entitlements else None,
    }


@router.get("/ai-limits")
async def my_ai_limits(current_user: CurrentUser):
    """
    Resolve the calling user's effective AI limits.

    Shows Aegis-governed limits vs. local defaults so operators can
    confirm governance is flowing correctly.
    """
    if not current_user.email:
        raise HTTPException(400, "User email required for AI limit lookup.")

    msg_limit, max_tokens, source = await aegis.resolve_ai_limits(
        current_user.email, current_user.tier
    )
    local = AI_LIMITS.get(current_user.tier, {"messages": 0, "max_tokens": 400})

    return {
        "email":           current_user.email,
        "effective": {
            "messages_per_period": msg_limit,
            "max_tokens":          max_tokens,
            "source":              source,
        },
        "local_defaults": {
            "messages_per_period": local["messages"],
            "max_tokens":          local["max_tokens"],
            "tier":                current_user.tier.value,
        },
    }


@router.get("/verify-access")
async def verify_resource_access(
    current_user: CurrentUser,
    resource: str = Query(..., description='e.g. "guilded:feature:academy_module_7"'),
):
    """
    Test whether the calling user has Aegis-granted access to a resource.

    Useful for debugging governance decisions without triggering actual feature code.
    """
    if not current_user.email:
        raise HTTPException(400, "User email required.")

    decision = await aegis.verify_access(current_user.email, resource)

    return {
        "email":    current_user.email,
        "resource": resource,
        "decision": {
            "allowed":           decision.allowed          if decision else None,
            "reason":            decision.reason           if decision else None,
            "governance_policy": decision.governance_policy if decision else None,
            "source":            decision.source           if decision else None,
        } if decision else None,
        "fallback_used": decision is None,
    }


# ── Admin: cache management ────────────────────────────────────────────────────

@router.post("/cache/invalidate")
async def invalidate_cache(
    current_user: CurrentUser,
    email: str = Query(..., description="User email whose governance cache to bust"),
):
    """
    Bust cached governance decisions for a specific user.

    Useful when an entitlement change needs to take effect immediately
    without waiting for the 5-minute TTL.

    Admin-only.
    """
    if current_user.email not in _ADMIN_EMAILS:
        raise HTTPException(403, "Admin access required.")

    aegis.invalidate_user(email)
    logger.info(
        "Governance cache invalidated by %s for %s",
        current_user.email, email,
    )
    return {"invalidated": True, "email": email}
