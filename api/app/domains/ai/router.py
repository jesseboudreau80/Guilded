import logging

from fastapi import APIRouter, HTTPException
from openai import OpenAI
from app.core.llm import chat_completion
from pydantic import BaseModel, field_validator

from app.core.config import settings
from app.core.deps import DB, CurrentUser
from app.core.tiers import EDUCATIONAL_DISCLAIMER
from app.lib.aegis import aegis

from .service import atomic_consume_ai_message

# Counsel is educational self-help software, not a credit repair organization (CROA).
COUNSEL_SYSTEM_PROMPT = (
    "You are Plutus Counsel, an educational assistant inside DIY credit-recovery software. "
    "Explain consumer rights (FCRA, FDCPA), the dispute process, and how credit reports work "
    "in plain, friendly language. Rules: never promise or predict results, deletions, or score "
    "changes; never say you will repair, fix, or remove anything for the user — the user does "
    "the work themselves; only encourage disputing items the user believes are inaccurate, "
    "incomplete, or unverifiable, never accurate negative information; you are not a lawyer "
    "and do not give legal advice — for lawsuits, bankruptcy, or identity theft, suggest a "
    "consumer attorney or the official sources (consumerfinance.gov, identitytheft.gov, "
    "annualcreditreport.com). Keep answers short and practical."
)

logger = logging.getLogger(__name__)

router  = APIRouter(prefix="/api/ai", tags=["ai"])


class AiRequest(BaseModel):
    prompt: str

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 4:
            raise ValueError("Prompt too short")
        if len(v) > 4000:
            raise ValueError("Prompt too long")
        return v


@router.post("")
async def query_ai(body: AiRequest, db: DB, current_user: CurrentUser):
    """
    Execute an AI query with Aegis-governed limits.

    Governance flow:
      1. Resolve AI limits via Aegis (HTTP call, BEFORE the DB lock)
         → Falls back to local AI_LIMITS[tier] when Aegis is unreachable
      2. Acquire SELECT FOR UPDATE row lock on user row
      3. Check and decrement message counter atomically
      4. Execute OpenAI call using Aegis-governed max_tokens
      5. Return response with governance source metadata
    """
    # ── Step 1: Resolve Aegis limits BEFORE entering the DB lock ─────────────
    # Critical ordering: HTTP calls cannot happen inside SELECT FOR UPDATE.
    msg_limit, max_tokens, limit_source = await aegis.resolve_ai_limits(
        email=current_user.email or "",
        local_tier=current_user.tier,
    )
    logger.info(
        "AI request user=%s tier=%s limit=%d tokens=%d governance=%s",
        current_user.id, current_user.tier.value, msg_limit, max_tokens, limit_source,
    )

    # ── Step 2 & 3: Atomically consume one message slot ───────────────────────
    result = await atomic_consume_ai_message(
        db,
        current_user.id,
        current_user.tier,
        limit_override=msg_limit if limit_source == "aegis" else None,
    )

    if result == "no_access":
        raise HTTPException(
            403,
            detail={"error": "AI access requires a paid subscription.", "upgradeRequired": True},
        )
    if result == "cap_exceeded":
        raise HTTPException(
            429,
            detail={
                "error": f"AI message cap reached ({msg_limit}/{current_user.tier.value.lower()}).",
                "upgradeRequired":   True,
                "governance_source": limit_source,
            },
        )

    # ── Step 4: Execute the model call ───────────────────────────────────────
    try:
        completion = chat_completion(
            messages=[
                {"role": "system", "content": COUNSEL_SYSTEM_PROMPT},
                {"role": "user", "content": body.prompt},
            ],
            max_tokens=max_tokens,
        )
    except Exception:
        logger.exception("Plutus Counsel model call failed for user %s", current_user.id)
        raise HTTPException(
            503, "Plutus Counsel is temporarily unavailable. Please try again later."
        )
    text = completion.choices[0].message.content or "No response generated."

    return {
        "response": f"{EDUCATIONAL_DISCLAIMER}\n\n{text}",
        "governance": {
            "limit_source": limit_source,
            "msg_limit":    msg_limit,
            "max_tokens":   max_tokens,
        },
    }
