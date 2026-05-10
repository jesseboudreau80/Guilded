import json
import logging
import os
import tempfile

import pdfplumber
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.audit import (
    Audit, AuditAccount, AuditRecommendation,
    AuditStatusEnum, SeverityEnum,
)
from app.models.user import TierEnum

from .prompts import (
    ANALYSIS_SYSTEM, ANALYSIS_USER,
    EXTRACTION_SYSTEM, EXTRACTION_USER,
)

logger = logging.getLogger(__name__)

_openai = OpenAI(api_key=settings.openai_api_key, timeout=90.0)



# ── PDF extraction ────────────────────────────────────────────────────────────

def extract_pdf_text(file_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        pages: list[str] = []
        with pdfplumber.open(tmp_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
        return "\n".join(pages).strip()
    finally:
        os.unlink(tmp_path)


# ── LLM helpers ───────────────────────────────────────────────────────────────

def _call_llm(system: str, user: str, max_tokens: int = 4096) -> dict:
    response = _openai.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0.2,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


# ── Account extraction ────────────────────────────────────────────────────────

async def extract_accounts(
    db: AsyncSession,
    user_id: str,
    file_bytes: bytes,
) -> Audit:
    logger.info("Audit started for user %s — extracting PDF text", user_id)

    text = extract_pdf_text(file_bytes)
    if not text:
        raise ValueError("No text could be extracted from the PDF. The file may be scanned or image-only.")

    # Truncate to avoid token overflow (~12 000 chars ≈ ~3 000 tokens)
    truncated = text[:12_000]

    prompt = EXTRACTION_USER.format(text=truncated)
    data = _call_llm(EXTRACTION_SYSTEM, prompt, max_tokens=2048)

    raw_accounts: list[dict] = data.get("accounts", [])
    logger.info("Accounts extracted for user %s: %d found", user_id, len(raw_accounts))

    audit = Audit(user_id=user_id, status=AuditStatusEnum.UPLOADED)
    db.add(audit)
    await db.flush()  # populate audit.id

    for acc in raw_accounts:
        account = AuditAccount(
            audit_id=audit.id,
            creditor_name=(acc.get("creditor_name") or "Unknown Creditor")[:255],
            account_type=acc.get("account_type"),
            balance=_safe_float(acc.get("balance")),
            status=acc.get("status"),
            negative_flag=bool(acc.get("negative_flag", False)),
            verified_by_user=False,
        )
        db.add(account)

    await db.flush()

    # Re-fetch with accounts loaded
    result = await db.execute(
        select(Audit).where(Audit.id == audit.id)
    )
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
                AuditAccount.id == acc_id,
                AuditAccount.audit_id == audit_id,
            )
        )
        acc = r.scalar_one_or_none()
        if acc:
            acc.verified_by_user = True
            count += 1

    audit.status = AuditStatusEnum.VERIFIED
    await db.flush()
    return count


# ── Full audit analysis ───────────────────────────────────────────────────────

async def run_audit(
    db: AsyncSession,
    audit_id: str,
    user_id: str,
    tier: TierEnum,
) -> Audit:
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

    accounts_json = json.dumps([
        {
            "creditor_name": a.creditor_name,
            "account_type":  a.account_type,
            "balance":       a.balance,
            "status":        a.status,
            "negative_flag": a.negative_flag,
        }
        for a in accounts
    ], indent=2)

    negative_count = sum(1 for a in accounts if a.negative_flag)
    total_count    = len(accounts)

    prompt = ANALYSIS_USER.format(
        accounts_json=accounts_json,
        negative_count=negative_count,
        total_count=total_count,
    )
    data = _call_llm(ANALYSIS_SYSTEM, prompt, max_tokens=4096)

    risk_score = int(max(0, min(100, data.get("risk_score", 50))))
    summary    = data.get("summary", {})
    recs_raw   = data.get("recommendations", [])

    logger.info(
        "Audit completed for user %s — risk_score=%d recs=%d",
        user_id, risk_score, len(recs_raw),
    )

    audit.risk_score   = risk_score
    audit.summary_json = {
        "negative_accounts": summary.get("negative_accounts", negative_count),
        "total_accounts":    summary.get("total_accounts", total_count),
        "collections":       summary.get("collections", 0),
        "late_payments":     summary.get("late_payments", 0),
        "charge_offs":       summary.get("charge_offs", 0),
    }
    audit.status = AuditStatusEnum.COMPLETED

    # Store all recommendations unlocked; tier gating is applied dynamically at read time.
    for rec in recs_raw:
        sev_str = rec.get("severity", "low")
        try:
            severity = SeverityEnum(sev_str)
        except ValueError:
            severity = SeverityEnum.LOW

        db.add(AuditRecommendation(
            audit_id=audit.id,
            severity=severity,
            title=(rec.get("title") or "Recommendation")[:255],
            description=rec.get("description") or "",
            locked=False,
        ))

    await db.flush()

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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
