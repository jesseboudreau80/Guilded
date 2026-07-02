"""
Audit Service Orchestrator
==========================
Thin orchestrator — coordinates OCR, parsing, and analysis services.

Pipeline:
  extract_accounts()  →  ocr_service → parse_service → DB
  run_audit()         →  analysis_service → DB
  update_account()    →  DB update + audit log

All heavy lifting is in the dedicated service modules:
  ocr_service.py      — PDF text extraction
  parse_service.py    — LLM account extraction + confidence scoring
  analysis_service.py — LLM analysis + recommendation generation + account linking
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import (
    Audit, AuditAccount, AuditRecommendation,
    AuditStatusEnum,
)
from app.models.audit_log import AuditLogEntry, AuditEvent
from app.models.user import TierEnum

from .ocr_service      import extract_pdf_text
from .parse_service    import extract_accounts as _parse_accounts
from .analysis_service import run_analysis

logger = logging.getLogger(__name__)


# ── Logging helper ────────────────────────────────────────────────────────────

async def _log(db: AsyncSession, audit_id: str, event_type: str, data: dict) -> None:
    db.add(AuditLogEntry(audit_id=audit_id, event_type=event_type, data=data))
    await db.flush()


# ── Account extraction ────────────────────────────────────────────────────────

async def extract_accounts(
    db: AsyncSession,
    user_id: str,
    file_bytes: bytes,
) -> Audit:
    """
    Full extraction pipeline: PDF bytes → AuditAccount rows.

    1. OCR: extract raw text via pdfplumber
    2. Parse: LLM extracts structured accounts with confidence scores
    3. Persist: create Audit + AuditAccount rows
    4. Log: OCR + extraction events to audit_thinking_logs
    """
    logger.info("Audit started for user %s — OCR pipeline", user_id)

    # Step 1: OCR
    ocr_result = extract_pdf_text(file_bytes)
    logger.info("OCR: %d chars, %d pages", ocr_result.char_count, ocr_result.page_count)

    # Step 2: LLM extraction
    parsed_accounts = _parse_accounts(ocr_result.text)
    logger.info("Parse: %d accounts extracted", len(parsed_accounts))

    # Step 3: Persist Audit + accounts
    audit = Audit(
        user_id        = user_id,
        status         = AuditStatusEnum.UPLOADED,
        ocr_char_count = ocr_result.char_count,
        ocr_page_count = ocr_result.page_count,
        pii_scan_json  = ocr_result.pii_scan.to_dict(),  # PII counts — never raw text
    )
    db.add(audit)
    await db.flush()

    for acc in parsed_accounts:
        db.add(AuditAccount(
            audit_id        = audit.id,
            creditor_name   = acc.creditor_name,
            account_type    = acc.account_type,
            account_number  = acc.account_number,
            balance         = acc.balance,
            status          = acc.status,
            negative_flag   = acc.negative_flag,
            verified_by_user = False,
            confidence      = acc.confidence,
            extraction_flags = acc.extraction_flags,
        ))

    await db.flush()

    # Step 4: Log events
    await _log(db, audit.id, AuditEvent.OCR_COMPLETED, {
        "char_count": ocr_result.char_count,
        "page_count": ocr_result.page_count,
        "truncated":  ocr_result.truncated,
    })
    low_count = sum(1 for a in parsed_accounts if a.confidence == "low")
    med_count = sum(1 for a in parsed_accounts if a.confidence == "medium")
    await _log(db, audit.id, AuditEvent.EXTRACTION_COMPLETED, {
        "account_count":      len(parsed_accounts),
        "low_confidence":     low_count,
        "medium_confidence":  med_count,
        "high_confidence":    len(parsed_accounts) - low_count - med_count,
    })

    result = await db.execute(select(Audit).where(Audit.id == audit.id))
    return result.scalar_one()


# ── Account verification ──────────────────────────────────────────────────────

async def verify_accounts(
    db: AsyncSession,
    audit_id: str,
    user_id: str,
    verified_ids: list[str],
) -> int:
    result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == user_id)
    )
    audit = result.scalar_one_or_none()
    if not audit:
        raise ValueError("Audit not found")

    count = 0
    for acc_id in verified_ids:
        r = await db.execute(
            select(AuditAccount).where(
                AuditAccount.id       == acc_id,
                AuditAccount.audit_id == audit_id,
            )
        )
        acc = r.scalar_one_or_none()
        if acc:
            acc.verified_by_user = True
            count += 1

    audit.status = AuditStatusEnum.VERIFIED
    await _log(db, audit_id, AuditEvent.VERIFICATION_COMPLETED, {"verified_count": count})
    await db.flush()
    return count


# ── Account update (user correction of OCR errors) ────────────────────────────

async def update_account(
    db: AsyncSession,
    audit_id: str,
    account_id: str,
    user_id: str,
    updates: dict,
) -> AuditAccount:
    """
    Allow users to correct OCR extraction errors before running analysis.

    Marks the account as user-verified and logs the edit event.
    """
    # Verify ownership
    audit_result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == user_id)
    )
    if not audit_result.scalar_one_or_none():
        raise ValueError("Audit not found")

    acc_result = await db.execute(
        select(AuditAccount).where(
            AuditAccount.id       == account_id,
            AuditAccount.audit_id == audit_id,
        )
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise ValueError("Account not found")

    # Apply field updates
    changed: dict = {}
    for field in ("creditor_name", "account_type", "account_number", "balance", "status"):
        if field in updates and updates[field] is not None:
            old = getattr(account, field)
            setattr(account, field, updates[field])
            if old != updates[field]:
                changed[field] = {"from": old, "to": updates[field]}

    # Mark as user-verified and upgrade confidence after manual edit
    account.verified_by_user = True
    account.confidence       = "high"   # user has confirmed the data

    await _log(db, audit_id, AuditEvent.ACCOUNT_EDITED, {
        "account_id": account_id,
        "fields_changed": list(changed.keys()),
    })
    await db.flush()
    return account


# ── Full audit analysis ───────────────────────────────────────────────────────

async def run_audit(
    db: AsyncSession,
    audit_id: str,
    user_id: str,
    tier: TierEnum,
) -> Audit:
    """
    Full analysis pipeline: accounts → risk score + recommendations.

    Uses analysis_service which includes account-to-recommendation linking.
    Recommendations are stored with account_id where the LLM identifies one.
    Tier gating is applied dynamically at read time (not stored).
    """
    result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == user_id)
    )
    audit = result.scalar_one_or_none()
    if not audit:
        raise ValueError("Audit not found")

    accs_result = await db.execute(
        select(AuditAccount).where(AuditAccount.audit_id == audit_id)
    )
    accounts = accs_result.scalars().all()

    # Build account data WITH IDs for the analysis LLM to reference
    accounts_data = [
        {
            "id":            a.id,
            "creditor_name": a.creditor_name,
            "account_type":  a.account_type,
            "balance":       a.balance,
            "status":        a.status,
            "negative_flag": a.negative_flag,
        }
        for a in accounts
    ]

    negative_count = sum(1 for a in accounts if a.negative_flag)
    total_count    = len(accounts)

    await _log(db, audit_id, AuditEvent.ANALYSIS_STARTED, {
        "account_count": total_count,
        "negative_count": negative_count,
        "tier": tier.value,
    })

    analysis, recommendations = run_analysis(
        accounts_data  = accounts_data,
        audit_id       = audit_id,
        tier           = tier,
        negative_count = negative_count,
        total_count    = total_count,
    )

    audit.risk_score   = analysis.risk_score
    audit.summary_json = {
        "negative_accounts": analysis.summary.get("negative_accounts", negative_count),
        "total_accounts":    analysis.summary.get("total_accounts", total_count),
        "collections":       analysis.summary.get("collections", 0),
        "late_payments":     analysis.summary.get("late_payments", 0),
        "charge_offs":       analysis.summary.get("charge_offs", 0),
    }
    audit.status = AuditStatusEnum.COMPLETED

    for rec in recommendations:
        db.add(rec)

    linked_count = sum(1 for r in recommendations if r.account_id)
    await _log(db, audit_id, AuditEvent.ANALYSIS_COMPLETED, {
        "risk_score":    analysis.risk_score,
        "rec_count":     len(recommendations),
        "linked_count":  linked_count,
    })

    await db.flush()
    logger.info(
        "Audit %s completed — risk=%d recs=%d linked=%d tier=%s",
        audit_id, analysis.risk_score, len(recommendations), linked_count, tier.value,
    )
    return audit


# ── Results retrieval ─────────────────────────────────────────────────────────

async def get_audit_results(
    db: AsyncSession,
    audit_id: str,
    user_id: str,
) -> Audit:
    result = await db.execute(
        select(Audit).where(Audit.id == audit_id, Audit.user_id == user_id)
    )
    audit = result.scalar_one_or_none()
    if not audit:
        raise ValueError("Audit not found")
    return audit
