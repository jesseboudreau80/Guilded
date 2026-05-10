"""
Pydantic models for Aegis Governance API responses.

These models match the Aegis Ecosystem Entitlement Gateway contract.
When Aegis changes its response schema, update these models accordingly —
all Guilded governance decisions flow through these types.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AegisEntitlements(BaseModel):
    """
    Response from GET /ecosystem/entitlements/{email}

    entitlements — list of granted capability tokens
      e.g. ["guilded:free", "guilded:journeyman"]

    tier — convenience canonical tier name derived by Aegis
      e.g. "journeyman"

    source — which Aegis authority issued this decision
    """
    email:        str
    entitlements: list[str]            = Field(default_factory=list)
    tier:         str | None           = None
    source:       str                  = "aegis-entitlement-gateway"
    valid_until:  datetime | None      = None
    metadata:     dict[str, Any]       = Field(default_factory=dict)


class AegisAILimits(BaseModel):
    """
    Response from GET /ecosystem/ai-limits/{email}

    messages_per_period — maximum AI messages allowed in the period
    period              — "weekly" | "monthly"
    max_tokens          — maximum tokens per single response
    model_access        — list of model identifiers the user may call
    source              — which Aegis policy issued these limits
    policy              — human-readable policy identifier
    """
    email:               str
    messages_per_period: int
    period:              str        = "monthly"
    max_tokens:          int        = 600
    model_access:        list[str]  = Field(default_factory=lambda: ["gpt-4o-mini"])
    source:              str        = "aegis-ai-governance"
    policy:              str | None = None


class AegisAccessDecision(BaseModel):
    """
    Response from POST /ecosystem/verify-access

    allowed            — whether the resource access is permitted
    reason             — machine-readable decision rationale
    source             — Aegis authority that made the decision
    governance_policy  — policy identifier for audit purposes
    """
    allowed:           bool
    reason:            str | None = None
    source:            str        = "aegis-entitlement-gateway"
    governance_policy: str | None = None


class AegisHealthStatus(BaseModel):
    """Aegis reachability and trust status — used in governance visibility."""
    configured:    bool
    reachable:     bool
    service_trust: str         # "verified" | "fallback" | "unconfigured"
    url:           str | None
    latency_ms:    float | None = None
    last_check:    datetime | None = None


# ── Entitlement → Guilded tier mapping ────────────────────────────────────────

# Maps Aegis entitlement tokens to Guilded billing tier names.
# The highest-ranked entitlement present wins.
ENTITLEMENT_TIER_RANK: dict[str, int] = {
    "guilded:hero":       4,
    "guilded:master":     3,
    "guilded:journeyman": 2,
    "guilded:free":       1,
}

ENTITLEMENT_TO_TIER_NAME: dict[str, str] = {
    "guilded:hero":       "HERO",
    "guilded:master":     "MASTER",
    "guilded:journeyman": "JOURNEYMAN",
    "guilded:free":       "APPRENTICE",
}


def entitlements_to_tier(entitlements: list[str]) -> str | None:
    """
    Resolve the highest Guilded tier from a list of Aegis entitlement tokens.
    Returns None if no Guilded entitlements are present.
    """
    best: tuple[int, str] | None = None
    for ent in entitlements:
        rank = ENTITLEMENT_TIER_RANK.get(ent)
        if rank is not None:
            if best is None or rank > best[0]:
                best = (rank, ENTITLEMENT_TO_TIER_NAME[ent])
    return best[1] if best else None
