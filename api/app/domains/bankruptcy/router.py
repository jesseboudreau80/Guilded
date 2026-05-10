from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.deps import DB, CurrentUser
from app.models.bankruptcy import (
    BANKRUPTCY_STEP_KEYS,
    STEP_LABELS,
    BankruptcyCase,
    BankruptcyStep,
    CaseStatusEnum,
    ChapterTypeEnum,
)

router = APIRouter(prefix="/api/bankruptcy", tags=["bankruptcy"])


def _case_out(case: BankruptcyCase, steps: list[BankruptcyStep]) -> dict:
    completed = {s.step_key for s in steps if s.completed_at}
    return {
        "id":           case.id,
        "chapter_type": case.chapter_type.value,
        "status":       case.status.value,
        "notes":        case.notes,
        "created_at":   case.created_at.isoformat(),
        "steps": [
            {
                "key":          key,
                "label":        STEP_LABELS[key],
                "completed":    key in completed,
                "completed_at": next(
                    (s.completed_at.isoformat() for s in steps if s.step_key == key and s.completed_at),
                    None,
                ),
            }
            for key in BANKRUPTCY_STEP_KEYS
        ],
    }


async def _get_case(db, user_id: str) -> BankruptcyCase | None:
    result = await db.execute(
        select(BankruptcyCase)
        .options(selectinload(BankruptcyCase.steps))
        .where(BankruptcyCase.user_id == user_id)
    )
    return result.scalar_one_or_none()


# ── Case management ───────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    chapter_type: ChapterTypeEnum
    notes:        str | None = None


class CaseUpdate(BaseModel):
    chapter_type: ChapterTypeEnum | None = None
    status:       CaseStatusEnum  | None = None
    notes:        str             | None = None


@router.get("/case")
async def get_case(db: DB, current_user: CurrentUser):
    case = await _get_case(db, current_user.id)
    if not case:
        return {"case": None}
    return {"case": _case_out(case, case.steps)}


@router.post("/case", status_code=201)
async def create_case(body: CaseCreate, db: DB, current_user: CurrentUser):
    existing = await _get_case(db, current_user.id)
    if existing:
        raise HTTPException(409, detail="A case already exists. Use PUT to update it.")

    case = BankruptcyCase(
        user_id=current_user.id,
        chapter_type=body.chapter_type,
        notes=body.notes,
    )
    db.add(case)
    await db.flush()

    # Pre-create step rows so completion state is explicit (not absent).
    for key in BANKRUPTCY_STEP_KEYS:
        db.add(BankruptcyStep(case_id=case.id, step_key=key))
    await db.flush()

    # Re-fetch with steps loaded.
    result = await db.execute(
        select(BankruptcyCase)
        .options(selectinload(BankruptcyCase.steps))
        .where(BankruptcyCase.id == case.id)
    )
    case = result.scalar_one()
    return {"case": _case_out(case, case.steps)}


@router.put("/case")
async def update_case(body: CaseUpdate, db: DB, current_user: CurrentUser):
    case = await _get_case(db, current_user.id)
    if not case:
        raise HTTPException(404, detail="No case found. Create one first.")

    if body.chapter_type is not None:
        case.chapter_type = body.chapter_type
    if body.status is not None:
        case.status = body.status
    if body.notes is not None:
        case.notes = body.notes

    await db.flush()
    return {"case": _case_out(case, case.steps)}


@router.delete("/case", status_code=204)
async def delete_case(db: DB, current_user: CurrentUser):
    case = await _get_case(db, current_user.id)
    if not case:
        raise HTTPException(404, detail="No case found")
    await db.delete(case)


# ── Step completion ───────────────────────────────────────────────────────────

@router.post("/case/steps/{step_key}/complete")
async def complete_step(step_key: str, db: DB, current_user: CurrentUser):
    if step_key not in BANKRUPTCY_STEP_KEYS:
        raise HTTPException(400, detail=f"Unknown step key: {step_key}")

    case = await _get_case(db, current_user.id)
    if not case:
        raise HTTPException(404, detail="No case found")

    step = next((s for s in case.steps if s.step_key == step_key), None)
    if not step:
        raise HTTPException(404, detail="Step not found")

    step.completed_at = datetime.utcnow()
    await db.flush()
    return {"step_key": step_key, "completed": True, "completed_at": step.completed_at.isoformat()}


@router.delete("/case/steps/{step_key}/complete")
async def uncomplete_step(step_key: str, db: DB, current_user: CurrentUser):
    if step_key not in BANKRUPTCY_STEP_KEYS:
        raise HTTPException(400, detail=f"Unknown step key: {step_key}")

    case = await _get_case(db, current_user.id)
    if not case:
        raise HTTPException(404, detail="No case found")

    step = next((s for s in case.steps if s.step_key == step_key), None)
    if not step:
        raise HTTPException(404, detail="Step not found")

    step.completed_at = None
    await db.flush()
    return {"step_key": step_key, "completed": False}


# ── Educational content ───────────────────────────────────────────────────────

@router.get("/info")
async def bankruptcy_info(current_user: CurrentUser):
    """Returns static educational content. No DB call needed."""
    return {
        "disclaimer": (
            "This information is for educational purposes only and does not constitute "
            "legal advice. Consult a licensed attorney before filing."
        ),
        "chapters": {
            "CHAPTER_7": {
                "name": "Chapter 7 — Liquidation",
                "summary": (
                    "Most unsecured debts are discharged within 3–6 months. "
                    "A trustee may liquidate non-exempt assets to pay creditors. "
                    "Requires passing the means test."
                ),
                "typical_duration": "3–6 months",
            },
            "CHAPTER_13": {
                "name": "Chapter 13 — Reorganization",
                "summary": (
                    "You keep your assets and repay debts over a 3–5 year plan. "
                    "Good option if you have regular income and want to save a home from foreclosure."
                ),
                "typical_duration": "3–5 years",
            },
        },
        "resources": [
            {"label": "US Courts — Bankruptcy Basics", "url": "https://www.uscourts.gov/services-forms/bankruptcy"},
            {"label": "CFPB — Bankruptcy", "url": "https://www.consumerfinance.gov/ask-cfpb/what-is-bankruptcy-en-173/"},
        ],
    }
