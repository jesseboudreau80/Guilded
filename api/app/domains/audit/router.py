import asyncio
import logging
from openai import RateLimitError, APITimeoutError, APIConnectionError

from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy import select

from app.core.deps import DB, CurrentUser
from app.core.tiers import TIER_LEVEL
from app.models.audit import Audit, AuditAccount, AuditRecommendation, AuditStatusEnum
from app.models.user import TierEnum

# Tier unlock limits: how many recommendations are visible per tier level.
# None means unlimited.
_UNLOCK_LIMIT: dict[int, int | None] = {
    0: 3,    # APPRENTICE
    1: 50,   # JOURNEYMAN
    2: None, # MASTER
    3: None, # HERO
}

from .schemas import (
    AccountOut, AccountUpdate, AuditListItem, AuditResultsResponse, AuditSummary,
    PiiScanSummary, RecommendationOut, UploadResponse, VerifyRequest, VerifyResponse,
)
from .service import extract_accounts, get_audit_results, run_audit, update_account, verify_accounts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["audit"])

MAX_PDF_BYTES = 20 * 1024 * 1024  # 20 MB


# ── Upload + extract ──────────────────────────────────────────────────────────

@router.post("/upload", response_model=UploadResponse)
async def upload_audit(
    db: DB,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted.")

    content = await file.read()
    if len(content) > MAX_PDF_BYTES:
        raise HTTPException(413, "File exceeds 20 MB limit.")

    try:
        audit = await extract_accounts(db, current_user.id, content)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except RateLimitError:
        logger.error("OpenAI rate limit hit during upload for user %s", current_user.id)
        raise HTTPException(503, "Analysis service is temporarily busy. Please try again in a moment.")
    except (APITimeoutError, APIConnectionError):
        logger.error("OpenAI timeout/connection error during upload for user %s", current_user.id)
        raise HTTPException(503, "Analysis service timed out. Your file was received — please try again.")
    except Exception:
        logger.exception("Audit upload failed for user %s", current_user.id)
        raise HTTPException(500, "Failed to process the credit report. If this persists, contact support.")

    accs_result = await db.execute(
        select(AuditAccount).where(AuditAccount.audit_id == audit.id)
    )
    accounts = accs_result.scalars().all()

    # Build PII scan summary from stored audit data
    pii_scan = None
    if audit.pii_scan_json:
        try:
            pii_scan = PiiScanSummary(**audit.pii_scan_json)
        except Exception:
            pass

    return UploadResponse(
        audit_id=audit.id,
        accounts_found=len(accounts),
        accounts=[AccountOut.model_validate(a) for a in accounts],
        pii_scan=pii_scan,
    )


# ── List accounts for an audit ───────────────────────────────────────────────

@router.get("/{audit_id}/accounts", response_model=list[AccountOut])
async def list_audit_accounts(
    audit_id: str,
    db: DB,
    current_user: CurrentUser,
):
    audit_result = await db.execute(
        select(Audit).where(Audit.id == audit_id)
    )
    audit = audit_result.scalar_one_or_none()
    if audit is None or audit.user_id != current_user.id:
        raise HTTPException(404, "Audit not found.")

    accs_result = await db.execute(
        select(AuditAccount).where(AuditAccount.audit_id == audit_id)
    )
    accounts = accs_result.scalars().all()
    return [AccountOut.model_validate(a) for a in accounts]


# ── Data Safety Receipt ───────────────────────────────────────────────────────

@router.get("/{audit_id}/safety-receipt")
async def audit_safety_receipt(audit_id: str, db: DB, current_user: CurrentUser):
    """Return the PII scan summary for this audit — available at any status."""
    audit_result = await db.execute(select(Audit).where(Audit.id == audit_id))
    audit = audit_result.scalar_one_or_none()
    if not audit or audit.user_id != current_user.id:
        raise HTTPException(404, "Audit not found.")

    pii = audit.pii_scan_json or {}
    return {
        "audit_id":    audit_id,
        "pii_scan":    pii,
        "pdf_deleted": True,   # always — deleted immediately after OCR extraction
    }


# ── Update account (OCR correction by user) ───────────────────────────────────

@router.patch("/{audit_id}/accounts/{account_id}", response_model=AccountOut)
async def patch_audit_account(
    audit_id:   str,
    account_id: str,
    body:       AccountUpdate,
    db:         DB,
    current_user: CurrentUser,
):
    """
    Allow users to correct OCR extraction errors before running analysis.
    Sets verified_by_user=True and upgrades confidence to "high" after edit.
    """
    try:
        account = await update_account(
            db, audit_id, account_id, current_user.id,
            updates=body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception:
        logger.exception("Account update failed %s/%s", audit_id, account_id)
        raise HTTPException(500, "Failed to update account.")
    return AccountOut.model_validate(account)


# ── Verify accounts ───────────────────────────────────────────────────────────

@router.post("/{audit_id}/verify", response_model=VerifyResponse)
async def verify_audit_accounts(
    audit_id: str,
    body: VerifyRequest,
    db: DB,
    current_user: CurrentUser,
):
    try:
        count = await verify_accounts(db, audit_id, current_user.id, body.verified_account_ids)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except Exception:
        logger.exception("Verify failed for audit %s", audit_id)
        raise HTTPException(500, "Failed to verify accounts.")

    return VerifyResponse(audit_id=audit_id, verified_count=count)


# ── Run full audit ────────────────────────────────────────────────────────────

@router.post("/{audit_id}/run", response_model=AuditResultsResponse)
async def run_audit_endpoint(
    audit_id: str,
    db: DB,
    current_user: CurrentUser,
):
    try:
        audit = await run_audit(db, audit_id, current_user.id, current_user.tier)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    except RateLimitError:
        logger.error("OpenAI rate limit hit during run for audit %s", audit_id)
        raise HTTPException(503, "Analysis service is temporarily busy. Please try again in a moment.")
    except (APITimeoutError, APIConnectionError):
        logger.error("OpenAI timeout during run for audit %s", audit_id)
        raise HTTPException(503, "Analysis timed out. Please try again — your accounts are saved.")
    except Exception:
        logger.exception("Run audit failed for audit %s", audit_id)
        raise HTTPException(500, "Failed to run audit analysis.")

    # Fire-and-forget audit complete email (non-blocking)
    if current_user.email:
        async def _notify() -> None:
            try:
                from app.lib.email import email_service as _es
                await _es.send_audit_complete(
                    to_email=current_user.email,
                    user_name=current_user.name or "",
                    audit_id=audit_id,
                    risk_score=audit.risk_score,
                )
            except Exception:
                logger.exception("Audit complete email failed for audit %s", audit_id)
        asyncio.create_task(_notify())

    return await _build_results_response(db, audit, current_user.tier)


# ── Get results ───────────────────────────────────────────────────────────────

@router.get("/{audit_id}/results", response_model=AuditResultsResponse)
async def get_results(
    audit_id: str,
    db: DB,
    current_user: CurrentUser,
):
    try:
        audit = await get_audit_results(db, audit_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(404, str(exc))

    if audit.status != AuditStatusEnum.COMPLETED:
        raise HTTPException(400, f"Audit is not complete (status: {audit.status.value}).")

    return await _build_results_response(db, audit, current_user.tier)


# ── List user audits ──────────────────────────────────────────────────────────

@router.get("/", response_model=list[AuditListItem])
async def list_audits(
    db: DB,
    current_user: CurrentUser,
):
    result = await db.execute(
        select(Audit)
        .where(Audit.user_id == current_user.id)
        .order_by(Audit.created_at.desc())
        .limit(20)
    )
    audits = result.scalars().all()
    return [AuditListItem.model_validate(a) for a in audits]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _build_results_response(db, audit: Audit, tier: TierEnum) -> AuditResultsResponse:
    accs_result = await db.execute(
        select(AuditAccount).where(AuditAccount.audit_id == audit.id)
    )
    accounts = accs_result.scalars().all()

    recs_result = await db.execute(
        select(AuditRecommendation)
        .where(AuditRecommendation.audit_id == audit.id)
        .order_by(AuditRecommendation.severity)
    )
    recs = recs_result.scalars().all()

    summary = None
    if audit.summary_json:
        s = audit.summary_json
        summary = AuditSummary(
            negative_accounts=s.get("negative_accounts", 0),
            total_accounts=s.get("total_accounts", 0),
            collections=s.get("collections", 0),
            late_payments=s.get("late_payments", 0),
            charge_offs=s.get("charge_offs", 0),
        )

    # Dynamic tier gating — computed from current tier, not stored DB value.
    tier_level = TIER_LEVEL.get(tier, 0)
    limit      = _UNLOCK_LIMIT.get(tier_level)

    rec_out: list[RecommendationOut] = []
    for i, r in enumerate(recs):
        locked = limit is not None and i >= limit
        rec_out.append(RecommendationOut(
            id=r.id,
            severity=r.severity.value,
            title=r.title,
            description=r.description,
            locked=locked,
        ))

    unlocked = sum(1 for r in rec_out if not r.locked)

    # PII scan summary — shown in results page as Data Safety Receipt
    pii_scan = None
    if audit.pii_scan_json:
        try:
            pii_scan = PiiScanSummary(**audit.pii_scan_json)
        except Exception:
            pass

    return AuditResultsResponse(
        audit_id=audit.id,
        status=audit.status.value,
        risk_score=audit.risk_score,
        total_recommendations=len(rec_out),
        unlocked_count=unlocked,
        summary=summary,
        accounts=[AccountOut.model_validate(a) for a in accounts],
        recommendations=rec_out,
        pii_scan=pii_scan,
    )
