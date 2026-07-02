"""
Parse Service — LLM-based account extraction with confidence scoring.

Responsibilities:
  1. Call OpenAI to extract structured account data from raw OCR text
  2. Normalize extracted fields (types, formats)
  3. Score extraction confidence per account
  4. Flag suspicious or likely-OCR-corrupted fields

Separated from OCR (upstream) and analysis (downstream) for:
  - independent testing
  - confidence-aware UI rendering
  - future replacement with fine-tuned extraction model
"""

import json
import logging
import re

from openai import OpenAI

from app.core.config import settings
from .prompts import EXTRACTION_SYSTEM, EXTRACTION_USER

logger = logging.getLogger(__name__)

_openai = OpenAI(api_key=settings.openai_api_key, timeout=90.0)

# Valid enum values from the extraction schema
_VALID_STATUSES = frozenset({
    "Current", "Late 30", "Late 60", "Late 90",
    "Derogatory", "Charge-off", "Collection", "Closed", "Unknown",
})

_VALID_TYPES = frozenset({
    "Credit Card", "Auto Loan", "Mortgage", "Student Loan",
    "Personal Loan", "Collection", "Medical", "Retail", "Other",
})


# ── Confidence scoring ────────────────────────────────────────────────────────

def score_confidence(account: dict) -> tuple[str, list[str]]:
    """
    Assess extraction confidence for a single account record.

    Returns:
        (confidence_level, [flag_names])
        confidence_level: "high" | "medium" | "low"
        flags: list of detected anomaly keys

    Flag keys match _CONTEXT_FLAG_LABELS in the dispute prompts.
    """
    flags: list[str] = []

    # ── Creditor name ──────────────────────────────────────────────────────────
    name = str(account.get("creditor_name", "")).strip()
    if len(name) < 2:
        flags.append("creditor_name_missing")
    elif re.search(r"[|\[\]{}<>\\@#$%^*]", name):
        flags.append("creditor_name_special_chars")
    elif len(name) > 80:
        flags.append("creditor_name_unusually_long")

    # ── Balance ───────────────────────────────────────────────────────────────
    balance = account.get("balance")
    if balance is not None:
        try:
            balance_f = float(balance)
            if balance_f < 0:
                flags.append("balance_negative")
            elif balance_f > 500_000:
                flags.append("balance_very_high")
            # Suspicious repetition pattern (OCR artifact like "111111")
            balance_str = str(int(balance_f))
            if len(balance_str) > 3 and len(set(balance_str)) == 1:
                flags.append("balance_likely_ocr_artifact")
        except (TypeError, ValueError):
            flags.append("balance_not_numeric")

    # ── Status ────────────────────────────────────────────────────────────────
    if account.get("status") not in _VALID_STATUSES:
        flags.append("status_unrecognized")

    # ── Account type ──────────────────────────────────────────────────────────
    if account.get("account_type") not in _VALID_TYPES:
        flags.append("account_type_unrecognized")

    # Determine overall confidence level
    if len(flags) >= 2:
        return "low", flags
    if len(flags) == 1:
        return "medium", flags
    return "high", []


# ── LLM extraction ────────────────────────────────────────────────────────────

def _call_extraction_llm(text: str) -> list[dict]:
    """Call OpenAI to extract structured accounts from credit report text."""
    response = _openai.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM},
            {"role": "user",   "content": EXTRACTION_USER.format(text=text)},
        ],
        max_tokens=2048,
        temperature=0.1,   # Low temp for consistent extraction
    )
    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    return data.get("accounts", [])


def _safe_float(value) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# ── Public API ────────────────────────────────────────────────────────────────

class ParsedAccount:
    """Normalized account extracted from a credit report."""
    __slots__ = (
        "creditor_name", "account_type", "account_number",
        "balance", "status", "negative_flag",
        "confidence", "extraction_flags",
    )

    def __init__(self, raw: dict) -> None:
        self.creditor_name  = str(raw.get("creditor_name") or "Unknown Creditor")[:255]
        self.account_type   = raw.get("account_type")
        self.account_number = raw.get("account_number")   # last 4 digits or null
        self.balance        = _safe_float(raw.get("balance"))
        self.status         = raw.get("status")
        self.negative_flag  = bool(raw.get("negative_flag", False))
        conf, flags         = score_confidence(raw)
        self.confidence     = conf
        self.extraction_flags = flags or None


def extract_accounts(text: str) -> list[ParsedAccount]:
    """
    Extract and score all credit accounts from OCR text.

    Returns a list of ParsedAccount objects with confidence scoring.
    Raises if the LLM returns unparseable JSON.
    """
    logger.info("Extraction LLM call — %d chars of OCR text", len(text))
    raw_accounts = _call_extraction_llm(text)
    logger.info("LLM returned %d raw accounts", len(raw_accounts))

    parsed = [ParsedAccount(acc) for acc in raw_accounts]
    low_count    = sum(1 for a in parsed if a.confidence == "low")
    medium_count = sum(1 for a in parsed if a.confidence == "medium")
    logger.info(
        "Confidence scoring: %d high, %d medium, %d low",
        len(parsed) - low_count - medium_count, medium_count, low_count,
    )
    return parsed
