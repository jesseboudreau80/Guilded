"""
Fair Use Monitor — architecture-only, NOT enforced yet.

This module defines thresholds and check functions for detecting unusual
usage patterns. The FAIR_USE_ENABLED flag (config.fair_use_enabled) is
False by default. When True, check functions log violations but do NOT
block requests — enforcement hooks can be added later.

Usage patterns monitored:
  - AI message volume per user per day
  - OCR upload volume per user per day

Not enforced. Only logged. Override thresholds via environment:
  FAIR_USE_AI_DAILY_MAX   (default 500)
  FAIR_USE_OCR_DAILY_MAX  (default 50)
  FAIR_USE_ENABLED        (default false)
"""

import logging
from dataclasses import dataclass, field
from datetime import date
from typing import ClassVar

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class FairUseEvent:
    user_id:    str
    dimension:  str   # "ai_messages" | "ocr_uploads"
    count:      int
    threshold:  int
    today:      date  = field(default_factory=date.today)

    def log(self) -> None:
        logger.warning(
            "FAIR_USE flag: user=%s dimension=%s count=%d threshold=%d date=%s",
            self.user_id, self.dimension, self.count, self.threshold, self.today,
        )


class FairUseMonitor:
    """
    Lightweight in-process counters for fair use monitoring.

    Architecture-ready, enforcement-pending.
    All check methods return True (no-op) when fair_use_enabled=False.
    When enabled they return True normally and False on threshold breach
    — but callers are NOT required to act on False yet.
    """

    # Per-process daily counters: {user_id: {dimension: count}}
    _counts: ClassVar[dict[str, dict[str, int]]] = {}
    _today:  ClassVar[date | None] = None

    @classmethod
    def _reset_if_new_day(cls) -> None:
        today = date.today()
        if cls._today != today:
            cls._counts = {}
            cls._today  = today

    @classmethod
    def record(cls, user_id: str, dimension: str, delta: int = 1) -> bool:
        """
        Record usage and check threshold.

        Returns:
            True  — within fair use (or monitoring disabled)
            False — threshold exceeded (logged but NOT enforced)
        """
        if not settings.fair_use_enabled:
            return True

        cls._reset_if_new_day()
        user_bucket = cls._counts.setdefault(user_id, {})
        user_bucket[dimension] = user_bucket.get(dimension, 0) + delta

        threshold = cls._threshold_for(dimension)
        if threshold > 0 and user_bucket[dimension] > threshold:
            FairUseEvent(
                user_id=user_id,
                dimension=dimension,
                count=user_bucket[dimension],
                threshold=threshold,
            ).log()
            return False

        return True

    @classmethod
    def _threshold_for(cls, dimension: str) -> int:
        match dimension:
            case "ai_messages":
                return settings.fair_use_ai_daily_max
            case "ocr_uploads":
                return settings.fair_use_ocr_daily_max
            case _:
                return 0

    @classmethod
    def check_ai(cls, user_id: str) -> bool:
        return cls.record(user_id, "ai_messages")

    @classmethod
    def check_ocr(cls, user_id: str) -> bool:
        return cls.record(user_id, "ocr_uploads")

    @classmethod
    def current_counts(cls, user_id: str) -> dict[str, int]:
        cls._reset_if_new_day()
        return dict(cls._counts.get(user_id, {}))


# Module-level singleton
fair_use = FairUseMonitor()
