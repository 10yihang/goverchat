"""运行时可修改的开关，DB 持久化 + 内存缓存"""

from __future__ import annotations
import threading
from models.admin_settings import get_setting, set_setting, get_all_settings


class AdminSettings:
    def __init__(self):
        self._cache: dict[str, str] = {}
        self._lock = threading.RLock()
        self._loaded = False

    def _ensure_loaded(self):
        if self._loaded:
            return
        with self._lock:
            if self._loaded:
                return
            self._cache = get_all_settings()
            self._loaded = True

    def get_bool(self, key: str, default: bool = False) -> bool:
        self._ensure_loaded()
        with self._lock:
            v = self._cache.get(key)
        if v is None:
            return default
        return v.lower() == "true"

    def set_bool(self, key: str, value: bool) -> None:
        self._ensure_loaded()
        v = "true" if value else "false"
        set_setting(key, v)
        with self._lock:
            self._cache[key] = v


admin_settings = AdminSettings()
