"""Per-user manual settings (profile overrides, body fat, goals)."""

from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_lock = threading.Lock()
_STORE: dict[str, dict[str, Any]] | None = None

DEFAULT_SETTINGS: dict[str, Any] = {
    "profile_overrides": {},
    "body_fat": {},
    "steps_goal": None,
    "calories_goal": None,
}


def _store_path() -> Path:
    raw = os.getenv("USER_SETTINGS_PATH")
    if raw:
        return Path(raw)
    return Path(__file__).resolve().parent / "data" / "user_settings.json"


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _sanitize_settings(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not raw or not isinstance(raw, dict):
        return {**DEFAULT_SETTINGS}

    out: dict[str, Any] = {**DEFAULT_SETTINGS}

    po = raw.get("profile_overrides")
    if isinstance(po, dict):
        clean: dict[str, Any] = {}
        if po.get("sex") in ("male", "female"):
            clean["sex"] = po["sex"]
        dob = po.get("dateOfBirth")
        if isinstance(dob, str) and len(dob) >= 10:
            clean["dateOfBirth"] = dob[:10]
        h = po.get("height_cm")
        if isinstance(h, (int, float)) and 100 <= h <= 250:
            clean["height_cm"] = int(h)
        w = po.get("weight_kg")
        if isinstance(w, (int, float)) and 30 <= w <= 300:
            clean["weight_kg"] = round(float(w), 1)
        out["profile_overrides"] = clean

    bf = raw.get("body_fat")
    if isinstance(bf, dict):
        clean_bf: dict[str, float] = {}
        for day, pct in bf.items():
            if not isinstance(day, str) or len(day) < 10:
                continue
            try:
                n = float(pct)
            except (TypeError, ValueError):
                continue
            if 3 <= n <= 60:
                clean_bf[day[:10]] = round(n, 1)
        out["body_fat"] = clean_bf

    sg = raw.get("steps_goal")
    if isinstance(sg, (int, float)) and 1000 <= sg <= 100000:
        out["steps_goal"] = int(sg)

    cg = raw.get("calories_goal")
    if isinstance(cg, (int, float)) and 500 <= cg <= 10000:
        out["calories_goal"] = int(cg)

    return out


def _load_store() -> dict[str, dict[str, Any]]:
    global _STORE
    if _STORE is not None:
        return _STORE

    path = _store_path()
    if path.is_file():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                _STORE = {
                    _normalize_email(k): _sanitize_settings(v)
                    for k, v in raw.items()
                    if isinstance(k, str) and isinstance(v, dict)
                }
                return _STORE
        except (OSError, json.JSONDecodeError):
            pass

    _STORE = {}
    return _STORE


def _persist_store(store: dict[str, dict[str, Any]]) -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, indent=2, ensure_ascii=False), encoding="utf-8")


def get_settings(email: str) -> dict[str, Any]:
    key = _normalize_email(email)
    with _lock:
        store = _load_store()
        return _sanitize_settings(store.get(key))


def save_settings(email: str, patch: dict[str, Any]) -> dict[str, Any]:
    key = _normalize_email(email)
    with _lock:
        store = _load_store()
        current = _sanitize_settings(store.get(key))
        merged = _sanitize_settings({**current, **patch})
        merged["updated_at"] = datetime.now(timezone.utc).isoformat()
        store[key] = merged
        _persist_store(store)
        return merged


def replace_settings(email: str, data: dict[str, Any]) -> dict[str, Any]:
    key = _normalize_email(email)
    with _lock:
        store = _load_store()
        merged = _sanitize_settings(data)
        merged["updated_at"] = datetime.now(timezone.utc).isoformat()
        store[key] = merged
        _persist_store(store)
        return merged


def resolve_manual_body_fat(series: dict[str, float] | None, focus: str) -> tuple[float | None, str | None]:
    if not series:
        return None, None
    if focus in series:
        return series[focus], focus
    prior = sorted(d for d in series if d <= focus)
    if not prior:
        return None, None
    src = prior[-1]
    return series[src], src


def profile_overrides_to_api(po: dict[str, Any]) -> dict[str, Any]:
    if not po:
        return {}
    out: dict[str, Any] = {}
    if po.get("sex") in ("male", "female"):
        out["sex"] = po["sex"]
    if po.get("dateOfBirth"):
        out["dob"] = po["dateOfBirth"]
    if po.get("height_cm"):
        out["height_cm"] = po["height_cm"]
    if po.get("weight_kg"):
        out["weight_kg"] = po["weight_kg"]
    return out
