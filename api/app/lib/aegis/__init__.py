"""
Aegis Governance Integration for Guilded
==========================================
Guilded is a governed application in the Aegis ecosystem.

Import pattern:
    from app.lib.aegis import aegis

    # Resolve effective AI limits (Aegis > local fallback)
    msgs, tokens, source = await aegis.resolve_ai_limits(email, tier)

    # Resolve effective tier (Aegis > local fallback)
    effective_tier, source = await aegis.resolve_tier(email, local_tier)

    # Check access to a specific feature
    decision = await aegis.verify_access(email, "guilded:feature:academy_module_7")

    # Governance health check
    status = await aegis.health()

When AEGIS_URL + AEGIS_SERVICE_KEY are not configured, all calls return
None / local fallback silently — Guilded functions identically to standalone.
"""

from .service import aegis
from .models  import (
    AegisAILimits,
    AegisAccessDecision,
    AegisEntitlements,
    AegisHealthStatus,
    entitlements_to_tier,
)

__all__ = [
    "aegis",
    "AegisAILimits",
    "AegisAccessDecision",
    "AegisEntitlements",
    "AegisHealthStatus",
    "entitlements_to_tier",
]
