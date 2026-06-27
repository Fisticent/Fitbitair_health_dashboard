"""FastAPI backend — Google Health + X-Scores."""

from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date as date_type, datetime, timedelta, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from fastapi import Depends, FastAPI, HTTPException, Query, Request

from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

import auth
import health_client as hc
import parsers as p
import scores as s
import user_settings as us

app = FastAPI(title="X-Health API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=auth.cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=auth.session_secret(),
    same_site="lax",
    https_only=auth.public_url().startswith("https"),
    max_age=60 * 60 * 24 * 14,
)

_raw_cache: dict | None = None
_synced_at: str | None = None
_fetch_errors: list[str] = []
_cache_built_at: float = 0.0
_CACHE_TTL_SECONDS = 900  # auto-refresh after 15 min so data never goes stale forever
_fetch_lock = threading.Lock()


def _today() -> str:
    return date_type.today().isoformat()


def _derive_age(profile: dict) -> int:
    """Age from the Health profile, computed from date of birth when present.

    The API typically returns a date of birth, not an ``age`` field, so a naive
    ``profile.get("age", 30)`` silently falls back to 30 and skews BMR and the
    physiological-age baseline. Handle both shapes defensively.
    """
    age = profile.get("age")
    if isinstance(age, (int, float)) and age > 0:
        return int(age)

    dob = profile.get("dateOfBirth") or profile.get("birthDate") or profile.get("dob")
    born: date_type | None = None
    if isinstance(dob, dict) and dob.get("year"):
        try:
            born = date_type(int(dob["year"]), int(dob.get("month", 1)), int(dob.get("day", 1)))
        except (ValueError, TypeError):
            born = None
    elif isinstance(dob, str) and len(dob) >= 4:
        try:
            born = date_type.fromisoformat(dob[:10])
        except ValueError:
            born = None

    if born is not None:
        today = date_type.today()
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

    return 30


def _derive_sex(profile: dict) -> str:
    """Normalise the profile's sex/gender to 'male' | 'female' | 'unknown'."""
    raw = profile.get("sex") or profile.get("gender") or profile.get("biologicalSex")
    if not isinstance(raw, str):
        return "unknown"
    val = raw.strip().lower()
    if val in ("male", "m", "homme", "man"):
        return "male"
    if val in ("female", "f", "femme", "woman"):
        return "female"
    return "unknown"


def _extract_dob_iso(profile: dict) -> str | None:
    dob = profile.get("dateOfBirth") or profile.get("birthDate") or profile.get("dob")
    if isinstance(dob, dict) and dob.get("year"):
        try:
            return date_type(
                int(dob["year"]), int(dob.get("month", 1)), int(dob.get("day", 1))
            ).isoformat()
        except (ValueError, TypeError):
            return None
    if isinstance(dob, str) and len(dob) >= 10:
        try:
            return date_type.fromisoformat(dob[:10]).isoformat()
        except ValueError:
            return None
    return None


def _merge_profile_overrides(profile: dict, overrides: dict | None) -> dict:
    if not overrides:
        return profile
    merged = dict(profile)
    if overrides.get("sex") in ("male", "female"):
        merged["sex"] = overrides["sex"]
    if overrides.get("dob"):
        merged["dateOfBirth"] = overrides["dob"]
    return merged


def _parse_profile_overrides(
    sex: str | None = None,
    dob: str | None = None,
    height_cm: float | None = None,
    weight_kg: float | None = None,
) -> dict:
    out: dict = {}
    if sex in ("male", "female"):
        out["sex"] = sex
    if dob:
        try:
            out["dob"] = date_type.fromisoformat(dob[:10]).isoformat()
        except ValueError:
            pass
    if height_cm is not None and 100 <= height_cm <= 250:
        out["height_cm"] = round(height_cm)
    if weight_kg is not None and 30 <= weight_kg <= 300:
        out["weight_kg"] = round(weight_kg, 1)
    return out


def _resolve_dashboard_context(
    sex: str | None,
    dob: str | None,
    height_cm: float | None,
    weight_kg: float | None,
    user: dict | None,
) -> tuple[dict, dict]:
    query_overrides = _parse_profile_overrides(
        sex=sex, dob=dob, height_cm=height_cm, weight_kg=weight_kg
    )
    if user and user.get("email"):
        stored = us.get_settings(user["email"])
    elif not auth.auth_enabled():
        stored = us.get_settings(us.LOCAL_DEV_USER)
    else:
        stored = {}
    stored_overrides = us.profile_overrides_to_api(stored.get("profile_overrides") or {})
    overrides = {**stored_overrides, **query_overrides}
    return overrides, stored


def _apply_body_overrides(body: dict, overrides: dict) -> dict:
    result = dict(body)
    if overrides.get("height_cm"):
        h_cm = overrides["height_cm"]
        result["height_cm"] = h_cm
        result["height_m"] = round(h_cm / 100, 2)
        result["height_date"] = None
    if overrides.get("weight_kg"):
        result["weight_kg"] = overrides["weight_kg"]
        result["weight_date"] = None
    if result.get("weight_kg") and result.get("height_m"):
        result["bmi"] = round(result["weight_kg"] / (result["height_m"] ** 2), 1)
        result["bmi_category"] = s.bmi_category(result["bmi"])
    return result


def _safe_fetch(label: str, fn, errors: list[str]):
    try:
        return fn()
    except FileNotFoundError:
        raise
    except hc.PartialDataError as exc:
        errors.append(
            f"{label}: sync partielle ({exc.cause}) — {len(exc.points)} points conservés"
        )
        return exc.points
    except Exception as exc:
        errors.append(f"{label}: {exc}")
        return []


def _cache_fresh() -> bool:
    return _raw_cache is not None and (time.monotonic() - _cache_built_at) < _CACHE_TTL_SECONDS


def _refresh_in_background() -> None:
    """Refresh the raw cache off the request path (stale-while-revalidate).

    Non-blocking lock acquire: if a fetch (foreground or another background one)
    is already running, skip — it will populate the cache for everyone.
    """
    if not _fetch_lock.acquire(blocking=False):
        return

    def _run() -> None:
        try:
            _fetch_raw_locked()
        except Exception:
            pass  # errors are captured into _fetch_errors by the fetch itself
        finally:
            _fetch_lock.release()

    threading.Thread(target=_run, name="raw-refresh", daemon=True).start()


def fetch_raw(force: bool = False) -> dict:
    global _raw_cache, _synced_at, _fetch_errors, _cache_built_at

    if not force and _cache_fresh():
        return _raw_cache  # type: ignore[return-value]

    # Stale-while-revalidate: a stale-but-present cache is served instantly while
    # a background refresh updates it — nobody waits ~18s for the TTL to lapse.
    if not force and _raw_cache is not None:
        _refresh_in_background()
        return _raw_cache

    # No cache yet (first ever load) or an explicit refresh → block on a real fetch.
    with _fetch_lock:
        # Re-check: another thread may have populated the cache while we waited.
        if not force and _cache_fresh():
            return _raw_cache  # type: ignore[return-value]
        return _fetch_raw_locked()


def _fetch_raw_locked() -> dict:
    global _raw_cache, _synced_at, _fetch_errors, _cache_built_at

    errors: list[str] = []
    try:
        profile = hc.get_profile()
    except FileNotFoundError:
        raise
    except Exception as exc:
        raise FileNotFoundError(f"Profil Google Health inaccessible: {exc}") from exc

    # Warm the OAuth token once before fanning out, so the parallel workers don't
    # each trigger a concurrent refresh (the token cache uses unguarded globals).
    try:
        hc.get_access_token()
    except Exception:
        pass  # each fetch surfaces the real error via _safe_fetch

    # Every fetch below is independent → run them concurrently instead of in
    # series (the sequential version took ~70s cold). Bounded pool stays under
    # Google's rate limit; transient 429/503 are still retried in the client.
    tasks: dict[str, tuple[str, object]] = {
        "hrv_pts": ("hrv", lambda: hc.list_data_points("heart-rate-variability")),
        "daily_hrv_pts": ("daily-hrv", lambda: hc.list_data_points_optional("daily-heart-rate-variability")),
        "skin_temp_pts": ("skin-temp", lambda: hc.list_data_points_optional("daily-sleep-temperature-derivations")),
        "sedentary_pts": ("sedentary", lambda: hc.list_recent_data_points_optional("sedentary-period", days=30, max_pages=10)),
        "rhr_pts": ("rhr", lambda: hc.list_data_points("daily-resting-heart-rate")),
        "sleep_pts": ("sleep", lambda: hc.list_data_points("sleep", max_pages=8)),
        "resp_pts": ("resp", lambda: hc.list_data_points("daily-respiratory-rate")),
        "zone_pts": ("zones", lambda: hc.list_data_points("active-zone-minutes")),
        "weight_pts": ("weight", lambda: hc.list_data_points("weight")),
        "height_pts": ("height", lambda: hc.list_data_points("height", max_pages=2)),
        "vo2_pts": ("vo2", lambda: hc.list_data_points("daily-vo2-max")),
        "steps_pts": ("steps", lambda: hc.list_recent_data_points("steps", days=90, max_pages=15)),
        "steps_rollups": ("steps-rollup", lambda: hc.daily_rollup_optional("steps", 90)),
        "distance_pts": ("distance", lambda: hc.list_recent_data_points("distance", days=90, max_pages=15)),
        "distance_rollups": ("distance-rollup", lambda: hc.daily_rollup_optional("distance", 90)),
        "hr_pts": ("heart-rate", lambda: hc.list_recent_heart_rate_points(days=90, max_pages=15)),
        "exercise_pts": ("exercise", lambda: hc.list_recent_data_points("exercise", days=90, max_pages=20)),
        "active_energy_pts": ("active-energy", lambda: hc.list_recent_data_points("active-energy-burned", days=90, max_pages=20)),
        "body_fat_pts": ("body-fat", lambda: hc.list_data_points_optional("body-fat", max_pages=3)),
        "spo2_pts": ("spo2", lambda: hc.list_data_points_optional("daily-oxygen-saturation", max_pages=3)
                     or hc.list_data_points_optional("oxygen-saturation", max_pages=5)),
    }

    results: dict[str, object] = {"profile": profile}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(_safe_fetch, label, fn, errors): key
            for key, (label, fn) in tasks.items()
        }
        for fut in as_completed(futures):
            results[futures[fut]] = fut.result()

    _raw_cache = results
    _fetch_errors = errors
    _synced_at = datetime.now(timezone.utc).isoformat()
    _cache_built_at = time.monotonic()
    return _raw_cache


def parse_raw(raw: dict) -> dict:
    steps_pts = p.parse_steps_from_points(raw.get("steps_pts") or [])
    steps_roll = p.parse_steps_rollup(raw.get("steps_rollups") or [])
    steps = p.merge_daily_max(steps_pts, steps_roll)
    distance_pts = p.parse_distance_daily(raw.get("distance_pts") or [])
    distance_roll = p.parse_distance_rollup(raw.get("distance_rollups") or [])
    distance = p.merge_daily_max_float(distance_pts, distance_roll)
    # HRV: prefer Fitbit's own nightly aggregate, fall back to our instant-sample
    # average for any day the aggregate is missing.
    hrv = {**p.parse_hrv_daily(raw["hrv_pts"]), **p.parse_daily_hrv_aggregate(raw.get("daily_hrv_pts") or [])}
    return {
        "profile": raw["profile"],
        "hrv": hrv,
        "skin_temp": p.parse_skin_temp_daily(raw.get("skin_temp_pts") or []),
        "sedentary": p.parse_sedentary_daily(raw.get("sedentary_pts") or []),
        "rhr": p.parse_daily_rhr(raw["rhr_pts"]),
        "sleep": p.parse_sleep_sessions(raw["sleep_pts"]),
        "resp": p.parse_respiratory_daily(raw["resp_pts"]),
        "zones": p.parse_zone_minutes(raw["zone_pts"]),
        "steps": steps,
        "distance": distance,
        "weight": p.parse_weight(raw["weight_pts"]),
        "height": p.parse_height(raw["height_pts"]),
        "vo2": p.parse_vo2max(raw["vo2_pts"]),
        "hr_avg": p.parse_hr_daily_avg(raw["hr_pts"]),
        "exercise": p.parse_exercise_daily(raw["exercise_pts"]),
        "active_energy": p.parse_active_energy_daily(raw["active_energy_pts"]),
        "body_fat": p.parse_body_fat(raw["body_fat_pts"]),
        "spo2": p.parse_spo2_daily(raw.get("spo2_pts") or []),
    }


def _strain_ctx(parsed: dict) -> dict:
    return {
        "steps": parsed["steps"],
        "active_energy": parsed["active_energy"],
        "exercise": parsed["exercise"],
    }


def _build_activity_recent(
    exercise: dict[str, dict],
    steps: dict[str, int],
    distance: dict[str, float] | None = None,
    *,
    limit: int = 14,
) -> list[dict]:
    """Recent days with Fitbit sessions and/or steps (walking without a logged workout)."""
    dates = sorted(set(exercise) | set(steps), reverse=True)[:limit]
    dist = distance or {}
    recent: list[dict] = []
    for d in dates:
        ex = exercise.get(d, {})
        step_count = steps.get(d)
        dist_km = dist.get(d)
        if ex.get("count", 0) > 0:
            recent.append(
                {
                    "date": d,
                    "count": ex.get("count", 0),
                    "minutes": ex.get("minutes", 0),
                    "types": ex.get("types", {}),
                    "sessions": ex.get("sessions", []),
                    "steps": step_count,
                    "distance_km": dist_km,
                    "kind": "session",
                }
            )
        elif step_count:
            recent.append(
                {
                    "date": d,
                    "count": 0,
                    "minutes": 0,
                    "types": {},
                    "sessions": [],
                    "steps": step_count,
                    "distance_km": dist_km,
                    "kind": "steps",
                }
            )
    return recent


def build_dashboard(
    focus_date: str | None = None,
    raw: dict | None = None,
    overrides: dict | None = None,
    stored_settings: dict | None = None,
) -> dict:
    raw = raw or fetch_raw()
    parsed = parse_raw(raw)
    google_profile = parsed["profile"]
    profile = _merge_profile_overrides(google_profile, overrides)
    age = _derive_age(profile)
    sex = _derive_sex(profile)
    google_age = _derive_age(google_profile)
    google_sex = _derive_sex(google_profile)

    hrv = parsed["hrv"]
    rhr = parsed["rhr"]
    sleep = parsed["sleep"]
    resp = parsed["resp"]
    zones = parsed["zones"]
    steps = parsed["steps"]
    distance = parsed["distance"]
    weight = parsed["weight"]
    height = parsed["height"]
    vo2 = parsed["vo2"]
    hr_avg = parsed["hr_avg"]
    exercise = parsed["exercise"]
    active_energy = parsed["active_energy"]
    body_fat = parsed["body_fat"]
    spo2 = parsed["spo2"]
    skin_temp = parsed["skin_temp"]
    sedentary = parsed["sedentary"]

    all_dates = sorted(
        set(hrv)
        | set(rhr)
        | set(sleep)
        | set(zones)
        | set(steps)
        | set(distance)
        | set(resp)
        | set(spo2)
        | set(hr_avg)
        | set(exercise)
        | set(active_energy)
        | set(skin_temp)
    )

    today = _today()
    focus = focus_date or today
    if focus > today:
        focus = today

    prior_day = (date_type.fromisoformat(focus) - timedelta(days=1)).isoformat()
    strain_kw = _strain_ctx(parsed)
    # Strain per day, computed once and reused (stress motion-compensation,
    # history series, and ACWR load balance all consume it).
    strain_by_day = {d: s.compute_strain(d, zones, **strain_kw)["score"] for d in all_dates}
    prior_strain = strain_by_day.get(prior_day, s.compute_strain(prior_day, zones, **strain_kw)["score"])

    debt = s.recent_sleep_debt_h(focus, sleep)
    recovery = s.compute_recovery(focus, hrv, rhr, sleep, resp, prior_strain, debt, skin_temp)
    strain = s.compute_strain(focus, zones, **strain_kw)
    sleep_score = s.compute_sleep_score(focus, sleep, need=s.sleep_need_hours(prior_strain, debt))
    monitor = s.health_monitor(focus, hrv, rhr, resp, spo2, skin_temp)
    stress = s.compute_stress_proxy(focus, hr_avg, rhr, hrv, strain_by_day, skin_temp)
    x_age = s.compute_physiological_age(
        focus, age, rhr, hrv, sleep, steps, zones, vo2, body_fat, sex=sex
    )

    history = []
    # Only the last 14 days are returned; reuse strain_by_day instead of
    # recomputing compute_strain for each day and its prior day.
    for d in all_dates[-14:]:
        prior_d = (date_type.fromisoformat(d) - timedelta(days=1)).isoformat()
        ps = strain_by_day.get(prior_d, 0)
        ex_d = exercise.get(d, {})
        w_date_d, w_kg_d = s.nearest_metric(weight, d)
        ps_debt = s.recent_sleep_debt_h(d, sleep)
        sleep_row = s.compute_sleep_score(d, sleep, need=s.sleep_need_hours(ps, ps_debt))
        history.append(
            {
                "date": d,
                "recovery": s.compute_recovery(d, hrv, rhr, sleep, resp, ps, ps_debt, skin_temp)["score"],
                "strain": strain_by_day.get(d, 0),
                "sleep": sleep_row["score"],
                "sleep_hours": sleep_row["hours"],
                "sleep_need": sleep_row["need"],
                "sleep_debt": sleep_row["debt_hours"],
                "steps": steps.get(d),
                "distance_km": distance.get(d),
                "hrv": hrv.get(d),
                "rhr": rhr.get(d),
                "respiratory": resp.get(d),
                "spo2": spo2.get(d),
                "skin_temp_dev": (skin_temp.get(d) or {}).get("deviation"),
                "stress": s.compute_stress_proxy(d, hr_avg, rhr, hrv, strain_by_day, skin_temp).get("score"),
                "exercise_minutes": ex_d.get("minutes", 0),
                "exercise_count": ex_d.get("count", 0),
                "weight": round(w_kg_d, 1) if w_kg_d is not None else None,
                "weight_date": w_date_d,
                "active_calories": active_energy.get(d),
            }
        )

    # Pace of aging: dedicated ~60-day series, lightly smoothed (3-day window)
    # so the regression — not a pre-smoothing — does the trend extraction.
    age_history = [
        (
            d,
            s.compute_physiological_age(
                d, age, rhr, hrv, sleep, steps, zones, vo2, body_fat, window_days=3, sex=sex
            )["functional_age"],
        )
        for d in all_dates[-60:]
    ]
    pace = s.compute_pace_of_aging(age_history)

    # Advanced signals (Oura/Whoop-style), all derived from existing data.
    # compute_load_balance windows strain_by_day internally (28d chronic + 14d series).
    sleep_regularity = s.compute_sleep_regularity(focus, sleep)
    load_balance = s.compute_load_balance(focus, strain_by_day)
    hrv_balance = s.compute_hrv_balance(focus, hrv)

    manual_bf_series = (stored_settings or {}).get("body_fat") or {}
    _, google_bf_focus = s.nearest_metric(body_fat, focus)
    body_fat_for_calc = body_fat
    if google_bf_focus is None and manual_bf_series:
        manual_bf, _ = us.resolve_manual_body_fat(manual_bf_series, focus)
        if manual_bf is not None:
            body_fat_for_calc = {**body_fat, focus: manual_bf}

    body = s.compute_body_composition(focus, weight, height, body_fat_for_calc, age=age, sex=sex)
    body = _apply_body_overrides(body, overrides or {})
    calories = s.compute_calories_summary(
        focus,
        active_energy,
        body["weight_kg"],
        body["height_cm"],
        age,
        sex,
    )

    ex_day = exercise.get(focus, {})
    focus_steps = steps.get(focus) or 0

    exercise_recent = _build_activity_recent(exercise, steps, distance)

    # KPI coverage map (hors capteurs hardware : ECG, AFib, TA)
    kpi_coverage = [
        {"id": "recovery", "name": "Récupération %", "status": "active", "has_data": recovery["components"]["hrv"]["value"] is not None},
        {"id": "strain", "name": "Charge %", "status": "active", "has_data": strain["source"] != "none"},
        {"id": "sleep", "name": "Performance sommeil", "status": "active", "has_data": sleep_score["hours"] > 0},
        {"id": "health_monitor", "name": "Moniteur santé", "status": "active", "has_data": len(monitor) > 0},
        {"id": "journal", "name": "Journal", "status": "manual", "has_data": False},
        {"id": "stress", "name": "Moniteur stress", "status": "proxy", "has_data": stress.get("score") is not None},
        {"id": "cycle", "name": "Cycle menstruel", "status": "partial", "has_data": False},
        {"id": "x_age", "name": "Âge physiologique / rythme", "status": "calibrating" if pace.get("status") == "calibrating" else "active", "has_data": x_age["delta_years"] != 0 or len(x_age["factors"]) > 0},
        {"id": "strength", "name": "Entraînement", "status": "partial", "has_data": ex_day.get("count", 0) > 0 or focus_steps > 0},
        {"id": "pdf", "name": "Rapport PDF", "status": "planned", "has_data": False},
        {"id": "vo2", "name": "VO₂ Max", "status": "proxy" if not vo2.get(focus) else "active", "has_data": bool(vo2.get(focus) or vo2)},
        {"id": "weight", "name": "Poids / IMC", "status": "active", "has_data": body["weight_kg"] is not None},
        {"id": "calories", "name": "Calories", "status": "active", "has_data": calories.get("active_kcal") is not None},
        {"id": "sleep_regularity", "name": "Régularité sommeil", "status": "calibrating" if sleep_regularity.get("status") == "calibrating" else "active", "has_data": sleep_regularity.get("score") is not None},
        {"id": "load_balance", "name": "Équilibre de charge", "status": "calibrating" if load_balance.get("status") == "calibrating" else "active", "has_data": load_balance.get("ratio") is not None},
        {"id": "hrv_balance", "name": "HRV Balance", "status": "calibrating" if hrv_balance.get("status") == "calibrating" else "active", "has_data": hrv_balance.get("score") is not None},
        {"id": "skin_temp", "name": "Température cutanée", "status": "active", "has_data": skin_temp.get(focus) is not None},
        {"id": "sedentary", "name": "Temps assis", "status": "active", "has_data": sedentary.get(focus) is not None},
    ]

    return {
        "profile": {
            "age": age,
            "sex": sex,
            "date_of_birth": _extract_dob_iso(profile),
            "google_age": google_age,
            "google_sex": google_sex,
            "height_cm": body["height_cm"],
            "weight_kg": body["weight_kg"],
            "override_fields": list((overrides or {}).keys()),
        },
        "focus_date": focus,
        "today": today,
        "available_dates": sorted(set(all_dates) | {today}, reverse=True),
        "synced_at": _synced_at,
        "sync_warnings": _fetch_errors,
        "dates_with_data": sorted(all_dates, reverse=True),
        "recovery": recovery,
        "strain": strain,
        "sleep": sleep_score,
        "health_monitor": monitor,
        "stress": stress,
        "physiological_age": x_age,
        "pace_of_aging": pace,
        "sleep_regularity": sleep_regularity,
        "load_balance": load_balance,
        "hrv_balance": hrv_balance,
        "vitals": {
            "steps": steps.get(focus),
            "distance_km": distance.get(focus),
            "weight_kg": body["weight_kg"],
            "weight_date": body["weight_date"],
            "height_cm": body["height_cm"],
            "height_m": body["height_m"],
            "bmi": body["bmi"],
            "bmi_category": body["bmi_category"],
            "lean_mass_kg": body["lean_mass_kg"],
            "fat_mass_kg": body["fat_mass_kg"],
            "weight_delta_7d": body["weight_delta_7d"],
            "weight_history": body["weight_history"],
            "vo2_max": vo2.get(focus) or s.nearest_metric(vo2, focus)[1],
            "body_fat_pct": body["body_fat_pct"] or body_fat.get(focus) or s.nearest_metric(body_fat, focus)[1],
            "ideal_weight": body.get("ideal_weight"),
            "ideal_body_fat": body.get("ideal_body_fat"),
            "respiratory": resp.get(focus),
            "spo2": spo2.get(focus),
            "skin_temp": skin_temp.get(focus),
            "sedentary": sedentary.get(focus),
            "active_calories": calories.get("active_kcal"),
            "bmr_kcal": calories.get("bmr_kcal"),
            "total_calories_est": calories.get("total_est_kcal"),
            "calories_avg_14d": calories.get("avg_active_14d"),
            "calories_delta_7d": calories.get("delta_active_7d"),
            "calories_history": calories.get("history", []),
        },
        "calories": calories,
        "body_composition": body,
        "exercise": {
            "count": ex_day.get("count", 0),
            "minutes": round(ex_day.get("minutes", 0)),
            "calories": round(ex_day.get("calories", 0)),
            "types": ex_day.get("types", {}),
            "sessions": ex_day.get("sessions", []),
        },
        "exercise_recent": exercise_recent,
        "kpi_coverage": kpi_coverage,
        "history": history,
        "source": "google_health_api",
    }


@app.get("/api/health")
def health():
    return {"ok": True, "synced_at": _synced_at, "auth": auth.auth_enabled()}


@app.get("/api/auth/login")
def auth_login(request: Request):
    return auth.login_redirect(request)


@app.get("/api/auth/callback")
def auth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
):
    return auth.callback_handler(request, code=code, state=state, error=error)


@app.get("/api/auth/me")
def auth_me(request: Request):
    return auth.me_payload(request)


@app.post("/api/auth/logout")
def auth_logout(request: Request):
    return auth.logout(request)


def _settings_user(user: dict | None) -> str:
    if user:
        return user["email"]
    if not auth.auth_enabled():
        return us.LOCAL_DEV_USER
    raise HTTPException(status_code=401, detail="Authentification requise")


@app.get("/api/user-settings")
def get_user_settings(user: dict | None = Depends(auth.require_user)):
    return us.get_settings(_settings_user(user))


@app.put("/api/user-settings")
async def put_user_settings(request: Request, user: dict | None = Depends(auth.require_user)):
    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="JSON invalide") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Corps de requête invalide")
    return us.replace_settings(_settings_user(user), payload)


@app.get("/api/dashboard")
def dashboard(
    day: str | None = Query(None, alias="date", description="YYYY-MM-DD"),
    sex: str | None = Query(None, pattern="^(male|female)$"),
    dob: str | None = Query(None, description="YYYY-MM-DD"),
    height_cm: float | None = Query(None, ge=100, le=250),
    weight_kg: float | None = Query(None, ge=30, le=300),
    _user: dict | None = Depends(auth.require_user),
):
    try:
        if day:
            try:
                date_type.fromisoformat(day)
            except ValueError as e:
                raise HTTPException(400, "Format date invalide (YYYY-MM-DD)") from e
        overrides, stored = _resolve_dashboard_context(sex, dob, height_cm, weight_kg, _user)
        return build_dashboard(focus_date=day, overrides=overrides, stored_settings=stored)
    except FileNotFoundError as e:
        raise HTTPException(503, str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Google Health API: {e}") from e


@app.post("/api/refresh")
def refresh(
    day: str | None = Query(None, alias="date"),
    sex: str | None = Query(None, pattern="^(male|female)$"),
    dob: str | None = Query(None, description="YYYY-MM-DD"),
    height_cm: float | None = Query(None, ge=100, le=250),
    weight_kg: float | None = Query(None, ge=30, le=300),
    _user: dict | None = Depends(auth.require_user),
):
    global _raw_cache
    _raw_cache = None
    try:
        raw = fetch_raw(force=True)
        if not raw.get("hrv_pts") and not raw.get("sleep_pts") and not raw.get("steps_pts"):
            raise HTTPException(
                503,
                "Synchronisation partielle — aucune donnée vitale. Vérifie l'auth Google Health.",
            )
        overrides, stored = _resolve_dashboard_context(sex, dob, height_cm, weight_kg, _user)
        return build_dashboard(focus_date=day, raw=raw, overrides=overrides, stored_settings=stored)
    except FileNotFoundError as e:
        raise HTTPException(503, str(e)) from e
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Erreur synchronisation: {e}") from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
