"""
Simple in-process TTL cache for Aegis governance decisions.

Prevents per-request HTTP calls to Aegis for high-frequency paths
(AI requests, academy module listing, etc.)

Not distributed — each API worker has its own cache.
TTL of 300s (5 minutes) is the default governance freshness window.
"""

from __future__ import annotations

import threading
from datetime import datetime, timedelta
from typing import Any


class TTLCache:
    """Thread-safe in-memory cache with per-entry TTL."""

    def __init__(self, default_ttl_seconds: int = 300) -> None:
        self._store:  dict[str, tuple[Any, datetime]] = {}
        self._lock    = threading.Lock()
        self._default = timedelta(seconds=default_ttl_seconds)

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if datetime.utcnow() >= expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        ttl = timedelta(seconds=ttl_seconds) if ttl_seconds is not None else self._default
        with self._lock:
            self._store[key] = (value, datetime.utcnow() + ttl)

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


# Module-level singleton used by AegisClient
_governance_cache = TTLCache(default_ttl_seconds=300)
