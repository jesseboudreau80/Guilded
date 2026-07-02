"""
Analysis Service — LLM-based credit audit analysis with account linking.

Responsibilities:
  1. Call OpenAI to analyze a structured account list
  2. Generate risk score, summary, and recommendations
  3. Link each recommendation to a specific account_id where possible
  4. Apply tier-based locking to recommendations

Separated from extraction for:
  - independent testing of recommendation quality
  - future replacement with specialized analysis model
  - clean account-to-recommendation traceability
"""

import json
import logging

from openai import OpenAI

from app.core.config import settings
from app.core.tiers import TIER_LEVEL
from app.models.audit import AuditRecommendation, SeverityEnum
from app.models.user import TierEnum
from .prompts import ANALYSIS_SYSTEM, ANALYSIS_USER

logger = logging.getLogger(__name__)

_openai = OpenAI(api_key=settings.openai_api_key, timeout=90.0)

APPRENTICE_FREE_RECS = 3


def _call_analysis_llm(accounts_json: str, negative_count: int, total_count: int) -> dict:
    """Call OpenAI for full credit profile analysis."""
    prompt = ANALYSIS_USER.format(
        accounts_json=accounts_json,
        negative_count=negative_count,
        total_count=total_count,
    )
    response = _openai.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=4096,
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


class AnalysisResult:
    """Structured result from the analysis LLM call."""
    __slots__ = ("risk_score", "summary", "recommendations_raw")

    def __init__(self, data: dict) -> None:
        self.risk_score         = int(max(0, min(100, data.get("risk_score", 50))))
        self.summary            = data.get("summary", {})
        self.recommendations_raw = data.get("recommendations", [])


def build_recommendations(
    recs_raw:   list[dict],
    audit_id:   str,
    tier:       TierEnum,
    valid_account_ids: set[str],
) -> list[AuditRecommendation]:
    """
    Convert raw LLM recommendation dicts to AuditRecommendation objects.

    Applies:
    - Tier-based locking (APPRENTICE: first 3 visible, rest locked)
    - account_id validation (only accept IDs that exist in this audit)
    - SeverityEnum normalization
    """
    is_free  = TIER_LEVEL.get(tier, 0) == 0
    tier_limits = {0: 3, 1: 50}   # APPRENTICE: 3, JOURNEYMAN: 50, MASTER+: unlimited
    limit = tier_limits.get(TIER_LEVEL.get(tier, 0))   # None = unlimited

    objects: list[AuditRecommendation] = []
    for i, rec in enumerate(recs_raw):
        try:
            severity = SeverityEnum(rec.get("severity", "low"))
        except ValueError:
            severity = SeverityEnum.LOW

        # Resolve account_id — only if it's a known account in this audit
        raw_account_id = rec.get("account_id")
        account_id: str | None = None
        if raw_account_id and str(raw_account_id) in valid_account_ids:
            account_id = str(raw_account_id)

        locked = (limit is not None) and (i >= limit)

        objects.append(AuditRecommendation(
            audit_id   = audit_id,
            account_id = account_id,
            severity   = severity,
            title      = (rec.get("title") or "Recommendation")[:255],
            description = rec.get("description") or "",
            locked     = locked,
        ))

    logger.info(
        "Built %d recommendations (%d with account links, %d locked) for tier=%s",
        len(objects),
        sum(1 for r in objects if r.account_id),
        sum(1 for r in objects if r.locked),
        tier.value,
    )
    return objects


def run_analysis(
    accounts_data:     list[dict],   # list of dicts with "id", "creditor_name", etc.
    audit_id:          str,
    tier:              TierEnum,
    negative_count:    int,
    total_count:       int,
) -> tuple[AnalysisResult, list[AuditRecommendation]]:
    """
    Run full credit profile analysis and generate linked recommendations.

    accounts_data must include the "id" field for each account so the LLM
    can reference specific accounts in its recommendations.
    """
    valid_ids = {a["id"] for a in accounts_data}

    accounts_json = json.dumps(accounts_data, indent=2)
    logger.info(
        "Analysis LLM call — %d accounts, %d negative",
        total_count, negative_count,
    )

    raw = _call_analysis_llm(accounts_json, negative_count, total_count)
    result = AnalysisResult(raw)

    logger.info(
        "Analysis complete — risk_score=%d recs=%d",
        result.risk_score, len(result.recommendations_raw),
    )

    recommendations = build_recommendations(
        result.recommendations_raw, audit_id, tier, valid_ids,
    )
    return result, recommendations
