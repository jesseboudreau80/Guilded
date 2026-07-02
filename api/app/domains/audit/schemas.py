from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AccountOut(BaseModel):
    id:               str
    creditor_name:    str
    account_type:     str | None
    account_number:   str | None        # last 4 digits extracted from report
    balance:          float | None
    status:           str | None
    negative_flag:    bool
    verified_by_user: bool
    # Extraction confidence — surfaces to UI for trust indicators
    confidence:       str | None        # "high" | "medium" | "low"
    extraction_flags: list[str] | None  # list of anomaly keys

    model_config = {"from_attributes": True}


class AccountUpdate(BaseModel):
    """Fields a user may correct after reviewing OCR extraction."""
    creditor_name:  str | None = None
    account_type:   str | None = None
    account_number: str | None = None
    balance:        float | None = None
    status:         str | None = None


class PiiScanSummary(BaseModel):
    """User-facing safety receipt — what was detected and masked."""
    ssn_count:            int
    account_number_count: int
    phone_count:          int
    email_count:          int
    dob_count:            int
    total_detected:       int
    safety_summary:       str
    pdf_deleted:          bool = True
    text_minimized:       bool = True


class UploadResponse(BaseModel):
    audit_id:       str
    accounts_found: int
    accounts:       list[AccountOut]
    pii_scan:       PiiScanSummary | None = None


class VerifyRequest(BaseModel):
    verified_account_ids: list[str]


class VerifyResponse(BaseModel):
    audit_id:        str
    verified_count:  int


class RecommendationOut(BaseModel):
    id:          str
    severity:    str
    title:       str
    description: str
    locked:      bool
    # Linked account — populated when the AI linked this rec to a specific account
    account_id:  str | None = None

    model_config = {"from_attributes": True}


class AuditSummary(BaseModel):
    negative_accounts: int
    total_accounts:    int
    collections:       int
    late_payments:     int
    charge_offs:       int


class AuditResultsResponse(BaseModel):
    audit_id:              str
    status:                str
    risk_score:            int | None
    total_recommendations: int
    unlocked_count:        int
    summary:               AuditSummary | None
    recommendations:       list[RecommendationOut]
    accounts:              list[AccountOut]
    pii_scan:              PiiScanSummary | None = None


class AuditListItem(BaseModel):
    id:         str
    created_at: datetime
    status:     str
    risk_score: int | None

    model_config = {"from_attributes": True}
