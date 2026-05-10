from datetime import datetime

from pydantic import BaseModel


class AccountOut(BaseModel):
    id:               str
    creditor_name:    str
    account_type:     str | None
    balance:          float | None
    status:           str | None
    negative_flag:    bool
    verified_by_user: bool

    model_config = {"from_attributes": True}


class UploadResponse(BaseModel):
    audit_id:       str
    accounts_found: int
    accounts:       list[AccountOut]


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


class AuditListItem(BaseModel):
    id:         str
    created_at: datetime
    status:     str
    risk_score: int | None

    model_config = {"from_attributes": True}
