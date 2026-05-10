"""
Trigger detection: maps audit findings to Academy trigger keys.

Trigger keys correspond to academy_triggers rows in the DB.
A detected key will cause the associated AcademyModule to be recommended.

Keys:
  has_collections      — collections > 0 in audit summary
  has_charge_offs      — charge_offs > 0 in audit summary
  has_late_payments    — late_payments > 0 in audit summary
  has_negative_accounts — negative_accounts > 0
  high_utilization     — recommendation content mentions utilization
  fcra_violation       — recommendation content mentions FCRA / re-aging / violation
  high_risk_score      — risk_score >= 50
  rebuild_credit       — risk_score >= 65
  critical_risk_score  — risk_score >= 75
  arbitration_candidate — recommendation content mentions arbitration
  identity_risk        — recommendation content mentions identity / fraud / freeze
"""

from app.models.audit import Audit, AuditRecommendation


def detect_triggers(audit: Audit, recs: list[AuditRecommendation]) -> set[str]:
    """Return the set of trigger keys that apply to this audit."""
    keys: set[str] = set()
    summary = audit.summary_json or {}

    # ── Summary-based triggers ─────────────────────────────────────────────
    if summary.get("collections", 0) > 0:
        keys.add("has_collections")
    if summary.get("charge_offs", 0) > 0:
        keys.add("has_charge_offs")
    if summary.get("late_payments", 0) > 0:
        keys.add("has_late_payments")
    if summary.get("negative_accounts", 0) > 0:
        keys.add("has_negative_accounts")

    # ── Risk score triggers ─────────────────────────────────────────────────
    score = audit.risk_score or 0
    if score >= 50:
        keys.add("high_risk_score")
    if score >= 65:
        keys.add("rebuild_credit")
    if score >= 75:
        keys.add("critical_risk_score")

    # ── Recommendation content triggers ────────────────────────────────────
    corpus = " ".join(
        f"{r.title} {r.description}".lower()
        for r in recs
    )

    if "utilization" in corpus:
        keys.add("high_utilization")

    if any(term in corpus for term in ("fcra", "re-aging", "reaging", "violation", "duplicate reporting")):
        keys.add("fcra_violation")

    if "arbitration" in corpus:
        keys.add("arbitration_candidate")

    if any(term in corpus for term in ("identity", "fraud", "freeze", "breach")):
        keys.add("identity_risk")

    return keys
