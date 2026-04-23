from __future__ import annotations

"""
In-memory request metrics for lightweight monitoring.
"""
from collections import Counter, deque


class MetricsService:
    def __init__(self, limit: int = 300) -> None:
        self._events = deque(maxlen=limit)

    def record(self, *, path: str, method: str, status_code: int, duration_ms: float) -> None:
        self._events.append(
            {
                "path": path,
                "method": method,
                "status_code": int(status_code),
                "duration_ms": float(duration_ms),
            }
        )

    def summary(self) -> dict:
        if not self._events:
            return {
                "request_count": 0,
                "avg_duration_ms": 0.0,
                "slow_request_count": 0,
                "error_count": 0,
                "top_paths": [],
            }

        request_count = len(self._events)
        avg_duration_ms = sum(item["duration_ms"] for item in self._events) / request_count
        slow_request_count = sum(1 for item in self._events if item["duration_ms"] >= 3000)
        error_count = sum(1 for item in self._events if item["status_code"] >= 400)
        path_counter = Counter(item["path"] for item in self._events)
        top_paths = [
            {"path": path, "count": count}
            for path, count in path_counter.most_common(6)
        ]
        return {
            "request_count": request_count,
            "avg_duration_ms": round(avg_duration_ms, 2),
            "slow_request_count": slow_request_count,
            "error_count": error_count,
            "top_paths": top_paths,
        }


metrics_service = MetricsService()
