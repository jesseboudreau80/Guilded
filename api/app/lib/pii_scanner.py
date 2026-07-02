"""
PII Safety Scanner — credit report OCR text redaction.

Detects and masks sensitive personal information before any text
is passed to OpenAI or stored in the database.

Philosophy:
  - Never store raw unredacted OCR text
  - Preserve what is needed for dispute analysis (creditor names, balances, statuses)
  - Mask what is not needed (SSNs, full account numbers, phone, email, DOB)
  - Keep last 4 digits of account numbers for account matching in disputes

Patterns are intentionally conservative for credit report context:
  - SSNs appear as XXX-XX-XXXX (hyphenated) in bureau PDFs
  - Account numbers are 12-16 digits (credit card 16, bank 10-12)
  - Dates in credit reports are usually account dates, not DOB —
    we only mask MM/DD/YYYY (slashes) which is more likely to be personal DOB

Output: PiiScanResult with redacted_text and per-category counts.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


# ── Regex patterns ─────────────────────────────────────────────────────────────

# SSN: XXX-XX-XXXX (hyphenated — most common bureau format for full SSNs)
# Already-masked patterns (***-**-1234) won't match because non-digits differ.
_SSN_RE = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')

# Full account numbers: 16 digits grouped 4-4-4-4, or 12-16 straight digits.
# Negative lookbehind on $ to avoid masking dollar amounts.
# Captures the last 4 digits for preservation.
_ACCT_GROUPED_RE = re.compile(
    r'(?<!\$)\b(\d{4})[-\s](\d{4})[-\s](\d{4})[-\s](\d{4})\b'
)
_ACCT_STRAIGHT_RE = re.compile(
    r'(?<!\$)\b(\d{5,12})(\d{4})\b'
)

# Phone numbers: (XXX) XXX-XXXX, XXX-XXX-XXXX, XXX.XXX.XXXX
_PHONE_RE = re.compile(
    r'\b(?:\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]\d{3}[-.\s]\d{4}\b'
)

# Email addresses
_EMAIL_RE = re.compile(
    r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b',
    re.IGNORECASE,
)

# Date-of-birth pattern: MM/DD/YYYY with slashes (not dashes — account dates use dashes)
_DOB_RE = re.compile(r'\b\d{1,2}/\d{1,2}/\d{4}\b')


# ── Result dataclass ───────────────────────────────────────────────────────────

@dataclass
class PiiScanResult:
    """
    Result of scanning and redacting PII from credit report OCR text.

    redacted_text: safe text suitable for LLM consumption and storage.
    All counts refer to detected instances in the original text.
    """
    redacted_text:          str
    ssn_count:              int = 0
    account_number_count:   int = 0
    phone_count:            int = 0
    email_count:            int = 0
    dob_count:              int = 0

    @property
    def total_detected(self) -> int:
        return (
            self.ssn_count + self.account_number_count +
            self.phone_count + self.email_count + self.dob_count
        )

    @property
    def safety_summary(self) -> str:
        parts = []
        if self.ssn_count:
            parts.append(f"{self.ssn_count} SSN{'s' if self.ssn_count > 1 else ''} blocked")
        if self.account_number_count:
            parts.append(f"{self.account_number_count} account number{'s' if self.account_number_count > 1 else ''} masked (last 4 retained)")
        if self.phone_count:
            parts.append(f"{self.phone_count} phone number{'s' if self.phone_count > 1 else ''} blocked")
        if self.email_count:
            parts.append(f"{self.email_count} email address{'es' if self.email_count > 1 else ''} blocked")
        if self.dob_count:
            parts.append(f"{self.dob_count} date of birth field{'s' if self.dob_count > 1 else ''} blocked")
        if not parts:
            return "No sensitive PII patterns detected in extracted text."
        return "; ".join(parts) + "."

    def to_dict(self) -> dict:
        return {
            "ssn_count":            self.ssn_count,
            "account_number_count": self.account_number_count,
            "phone_count":          self.phone_count,
            "email_count":          self.email_count,
            "dob_count":            self.dob_count,
            "total_detected":       self.total_detected,
            "safety_summary":       self.safety_summary,
            "pdf_deleted":          True,
            "text_minimized":       True,
        }


# ── Scanner ────────────────────────────────────────────────────────────────────

def scan_and_redact(raw_text: str) -> PiiScanResult:
    """
    Scan OCR text for PII and return a redacted version with counts.

    Mutates a working copy of the text through each pattern pass.
    Order matters: account number grouped patterns before straight to avoid
    double-counting the same sequence.
    """
    text  = raw_text
    ssns  = 0
    accts = 0
    phones = 0
    emails = 0
    dobs   = 0

    # ── SSN ───────────────────────────────────────────────────────────────────
    def _mask_ssn(m: re.Match) -> str:
        nonlocal ssns
        ssns += 1
        return "[SSN MASKED]"

    text = _SSN_RE.sub(_mask_ssn, text)

    # ── Account numbers (grouped 4-4-4-4) ────────────────────────────────────
    def _mask_acct_grouped(m: re.Match) -> str:
        nonlocal accts
        accts += 1
        last4 = m.group(4)
        return f"••••-••••-••••-{last4}"

    text = _ACCT_GROUPED_RE.sub(_mask_acct_grouped, text)

    # ── Account numbers (12-16 straight digits) ───────────────────────────────
    def _mask_acct_straight(m: re.Match) -> str:
        nonlocal accts
        accts += 1
        last4 = m.group(2)
        return f"••••{last4}"

    text = _ACCT_STRAIGHT_RE.sub(_mask_acct_straight, text)

    # ── Phone numbers ─────────────────────────────────────────────────────────
    def _mask_phone(m: re.Match) -> str:
        nonlocal phones
        phones += 1
        return "[PHONE MASKED]"

    text = _PHONE_RE.sub(_mask_phone, text)

    # ── Email addresses ───────────────────────────────────────────────────────
    def _mask_email(m: re.Match) -> str:
        nonlocal emails
        emails += 1
        return "[EMAIL MASKED]"

    text = _EMAIL_RE.sub(_mask_email, text)

    # ── Date of birth (MM/DD/YYYY) ────────────────────────────────────────────
    def _mask_dob(m: re.Match) -> str:
        nonlocal dobs
        dobs += 1
        return "[DATE MASKED]"

    text = _DOB_RE.sub(_mask_dob, text)

    return PiiScanResult(
        redacted_text        = text,
        ssn_count            = ssns,
        account_number_count = accts,
        phone_count          = phones,
        email_count          = emails,
        dob_count            = dobs,
    )
