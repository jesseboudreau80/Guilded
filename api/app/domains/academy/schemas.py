from datetime import datetime

from pydantic import BaseModel


class AcademyLessonOut(BaseModel):
    id:          str
    title:       str
    order_index: int
    content_key: str
    is_preview:  bool

    model_config = {"from_attributes": True}


class AcademyModuleOut(BaseModel):
    id:                str
    slug:              str
    title:             str
    description:       str
    curriculum_topic:  str
    tier_required:     str
    order_index:       int
    estimated_minutes: int
    badge_label:       str | None
    lesson_count:      int
    is_locked:         bool


class AcademyProgressOut(BaseModel):
    module_id:    str
    status:       str
    started_at:   datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class RecommendedModuleOut(BaseModel):
    module:          AcademyModuleOut
    triggers_matched: list[str]
    reason:          str
    priority:        int
    is_locked:       bool
    progress:        AcademyProgressOut | None


class StartModuleOut(BaseModel):
    module_id: str
    status:    str


class XPAwardRequest(BaseModel):
    event_type: str   # matches XPEventType values
    reference:  str | None = None


class XPAwardOut(BaseModel):
    xp_earned:  int
    total_xp:   int
    rank:       str
    new_badges: list[str]


class XPSummaryOut(BaseModel):
    total_xp:      int
    rank:          str
    next_xp:       int | None
    min_xp:        int
    progress_pct:  float
    xp_to_next:    int
    recent_events: list[dict]
    badges:        list[dict]
