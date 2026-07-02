from datetime import datetime

from pydantic import BaseModel


VALID_STRATEGIES = {"validation", "goodwill", "fcra_dispute", "pay_for_delete"}


class GenerateDisputeRequest(BaseModel):
    audit_id:           str
    recommendation_ids: list[str]
    strategy:           str
    # Context personalization
    context_flags:  list[str] = []
    context_notes:  str | None = None
    # Bureau targeting — which party receives this letter
    # Values: "experian" | "equifax" | "transunion" | "creditor" | "collector"
    bureau_targets: list[str] = ["experian", "equifax", "transunion"]


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


class DisputeListItem(BaseModel):
    id:              str
    audit_id:        str
    strategy_type:   str
    rec_count:       int    # number of recommendations included
    created_at:      datetime

    model_config = {"from_attributes": True}
