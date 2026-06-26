"""Google Health API v4 client — env vars (prod) or ~/.google-health-mcp (local)."""

from __future__ import annotations

import json
import os
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import requests

BASE = "https://health.googleapis.com/v4"
MCP_DIR = Path.home() / ".google-health-mcp"
_RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
_MAX_REQUEST_RETRIES = 4

_env_access_token: str | None = None
_env_expires_at: float = 0.0


class PartialDataError(Exception):
    """Some pages were fetched before the API failed (transient outage)."""

    def __init__(self, points: list[dict], cause: Exception):
        self.points = points
        self.cause = cause
        super().__init__(str(cause))


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def _health_config() -> dict[str, str]:
    client_id = os.getenv("GOOGLE_HEALTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_HEALTH_CLIENT_SECRET")
    if client_id and client_secret:
        return {
            "GOOGLE_HEALTH_CLIENT_ID": client_id,
            "GOOGLE_HEALTH_CLIENT_SECRET": client_secret,
        }
    config_path = MCP_DIR / "config.json"
    if config_path.exists():
        return _load_json(config_path)
    raise FileNotFoundError(
        "GOOGLE_HEALTH_CLIENT_ID manquant — configure les variables d'environnement ou google-health-mcp"
    )


def _save_tokens(tokens: dict) -> None:
    MCP_DIR.joinpath("tokens.json").write_text(
        json.dumps(tokens, indent=2), encoding="utf-8"
    )


def _refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    global _env_access_token, _env_expires_at

    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    access_token = data["access_token"]
    _env_access_token = access_token
    _env_expires_at = time.time() + int(data.get("expires_in", 3600))
    return access_token


def get_access_token() -> str:
    global _env_access_token, _env_expires_at

    env_refresh = os.getenv("GOOGLE_HEALTH_REFRESH_TOKEN")
    if env_refresh:
        if _env_access_token and _env_expires_at > time.time() + 120:
            return _env_access_token
        config = _health_config()
        return _refresh_access_token(
            config["GOOGLE_HEALTH_CLIENT_ID"],
            config["GOOGLE_HEALTH_CLIENT_SECRET"],
            env_refresh,
        )

    tokens_path = MCP_DIR / "tokens.json"
    if not tokens_path.exists():
        raise FileNotFoundError("tokens.json manquant — lance google-health-mcp auth")

    tokens = _load_json(tokens_path)
    config = _health_config()
    expires_at = tokens.get("expires_at", 0)

    if expires_at < time.time() + 120:
        access_token = _refresh_access_token(
            config["GOOGLE_HEALTH_CLIENT_ID"],
            config["GOOGLE_HEALTH_CLIENT_SECRET"],
            tokens["refresh_token"],
        )
        tokens["access_token"] = access_token
        tokens["expires_in"] = 3600
        tokens["expires_at"] = int(time.time()) + 3600
        _save_tokens(tokens)
        return access_token

    return tokens["access_token"]


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {get_access_token()}",
        "Accept": "application/json",
    }


# Filter field prefix uses snake_case per Google Health API (AIP-160).
_FILTER_PREFIX: dict[str, str] = {
    "steps": "steps",
    "distance": "distance",
    "exercise": "exercise",
    "active-energy-burned": "active_energy_burned",
    "sedentary-period": "sedentary_period",
    "heart-rate-variability": "heart_rate_variability",
    "oxygen-saturation": "oxygen_saturation",
    "daily-oxygen-saturation": "daily_oxygen_saturation",
}

# Instant samples use sample_time instead of interval.
_SAMPLE_TIME_PREFIX: dict[str, str] = {
    "heart-rate": "heart_rate",
    "oxygen-saturation": "oxygen_saturation",
}

# exercise/sleep cap page size at 25; most interval types allow up to 10_000.
_MAX_PAGE_SIZE: dict[str, int] = {
    "exercise": 25,
    "sleep": 25,
}


def civil_start_filter(data_type: str, days_back: int = 90) -> str | None:
    """Build AIP-160 filter for recent civil-start intervals."""
    prefix = _FILTER_PREFIX.get(data_type)
    if not prefix:
        return None
    cutoff = (date.today() - timedelta(days=days_back)).isoformat()
    return f'{prefix}.interval.civil_start_time >= "{cutoff}"'


def sample_time_filter(data_type: str, days_back: int = 90) -> str | None:
    """Build AIP-160 filter for instant samples (heart rate, SpO₂, etc.)."""
    prefix = _SAMPLE_TIME_PREFIX.get(data_type)
    if not prefix:
        return None
    cutoff = (date.today() - timedelta(days=days_back)).isoformat()
    return f'{prefix}.sample_time.civil_time.date >= "{cutoff}"'


def recent_filter(data_type: str, days_back: int = 90) -> str | None:
    return sample_time_filter(data_type, days_back) or civil_start_filter(data_type, days_back)


def _request_get(url: str, *, params: dict[str, Any], timeout: int = 60) -> requests.Response:
    last_exc: requests.HTTPError | None = None
    for attempt in range(_MAX_REQUEST_RETRIES):
        resp = requests.get(url, headers=_headers(), params=params, timeout=timeout)
        if resp.status_code in _RETRYABLE_STATUS:
            last_exc = requests.HTTPError(f"{resp.status_code} {resp.reason}", response=resp)
            if attempt < _MAX_REQUEST_RETRIES - 1:
                time.sleep(min(8.0, 1.5 * (2**attempt)))
                continue
            resp.raise_for_status()
        resp.raise_for_status()
        return resp
    if last_exc:
        raise last_exc
    raise RuntimeError("request failed without response")


def list_data_points(
    data_type: str,
    page_size: int = 500,
    max_pages: int = 15,
    *,
    filter: str | None = None,
) -> list[dict]:
    url = f"{BASE}/users/me/dataTypes/{data_type}/dataPoints"
    cap = _MAX_PAGE_SIZE.get(data_type, 10_000)
    page_size = min(page_size, cap)
    points: list[dict] = []
    page_token: str | None = None
    pages = 0

    while pages < max_pages:
        params: dict[str, Any] = {"pageSize": page_size}
        if filter:
            params["filter"] = filter
        if page_token:
            params["pageToken"] = page_token
        try:
            resp = _request_get(url, params=params)
        except requests.HTTPError as exc:
            if points and exc.response is not None and exc.response.status_code in _RETRYABLE_STATUS:
                raise PartialDataError(points, exc) from exc
            raise
        body = resp.json()
        points.extend(body.get("dataPoints", []))
        page_token = body.get("nextPageToken")
        pages += 1
        if not page_token:
            break

    return points


def list_recent_heart_rate_points(days: int = 90, max_pages: int = 15) -> list[dict]:
    """Heart-rate samples for stress proxy — filtered by date when the API allows it."""
    filt = sample_time_filter("heart-rate", days)
    try:
        return list_data_points("heart-rate", max_pages=max_pages, filter=filt)
    except requests.HTTPError as exc:
        if exc.response is None or exc.response.status_code != 400:
            raise
    # Filter field unsupported — fall back to fewer unfiltered pages (still retried on 503).
    return list_data_points("heart-rate", max_pages=min(max_pages, 6))


def list_recent_data_points(
    data_type: str, days: int = 90, page_size: int | None = None, max_pages: int = 20
) -> list[dict]:
    """Fetch interval data for the last N days (avoids missing recent days when paginating unfiltered)."""
    filt = recent_filter(data_type, days)
    if page_size is None:
        page_size = _MAX_PAGE_SIZE.get(data_type, 5000)
    return list_data_points(data_type, page_size=page_size, max_pages=max_pages, filter=filt)


def list_data_points_optional(
    data_type: str,
    page_size: int = 500,
    max_pages: int = 15,
    *,
    filter: str | None = None,
) -> list[dict]:
    """Fetch data type; return [] if unavailable (scope, device, or API 4xx)."""
    try:
        return list_data_points(
            data_type, page_size=page_size, max_pages=max_pages, filter=filter
        )
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code in (400, 403, 404):
            return []
        raise


def list_recent_data_points_optional(data_type: str, days: int = 90, **kwargs) -> list[dict]:
    try:
        return list_recent_data_points(data_type, days=days, **kwargs)
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code in (400, 403, 404):
            return []
        raise


def daily_rollup(data_type: str, days: int = 30) -> list[dict]:
    url = f"{BASE}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp"
    params = {"pageSize": min(days, 90), "windowSizeDays": 1}
    resp = requests.get(url, headers=_headers(), params=params, timeout=60)
    resp.raise_for_status()
    return resp.json().get("rollupDataPoints", [])


def daily_rollup_optional(data_type: str, days: int = 30) -> list[dict]:
    """Rollup journalier ; vide si le type ou l'endpoint n'est pas disponible (souvent 400 pour steps)."""
    try:
        return daily_rollup(data_type, days)
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code in (400, 403, 404):
            return []
        raise


def get_profile() -> dict:
    resp = requests.get(f"{BASE}/users/me/profile", headers=_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()
