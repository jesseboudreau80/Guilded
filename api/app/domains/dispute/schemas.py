from datetime import datetime

from pydantic import BaseModel


VALID_STRATEGIES = {"validation", "goodwill", "fcra_dispute", "pay_for_delete"}


class GenerateDisputeRequest(BaseModel):
    audit_id:           str
    recommendation_ids: list[str]
    strategy:           str


class DisputeDraftOut(BaseModel):
    id:            str
    audit_id:      str
    strategy_type: str
    content:       str

    model_config = {"from_attributes": True}


class DisputeRecOut(BaseModel):
    id:       str
    severity: str
    title:    str

    model_config = {"from_attributes": True}


class DisputeDraftDetail(BaseModel):
    id:                 str
    audit_id:           str
    strategy_type:      str
    content:            str
    created_at:         datetime
    recommendation_ids: list[str]
    recommendations:    list[DisputeRecOut]
