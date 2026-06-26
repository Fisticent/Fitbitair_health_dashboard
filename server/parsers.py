"""Parse Google Health API payloads into daily metrics."""

from __future__ import annotations

from datetime import datetime
from typing import Any


def date_key(d: dict) -> str:
    return f"{d['year']}-{int(d['month']):02d}-{int(d['day']):02d}"


def interval_day(interval: dict) -> str | None:
    """Civil date from interval (civilStartTime or ISO startTime)."""
    civil = interval.get("civilStartTime", {}).get("date")
    if civil and civil.get("year"):
        return date_key(civil)
    start = interval.get("startTime")
    if start:
        return start[:10]
    return None


def parse_duration_seconds(value: str | None) -> float:
    if not value:
        return 0.0
    if value.endswith("s"):
        try:
            return float(value[:-1])
        except ValueError:
            return 0.0
    return 0.0


def parse_iso_duration(start: str, end: str) -> float:
    s = datetime.fromisoformat(start.replace("Z", "+00:00"))
    e = datetime.fromisoformat(end.replace("Z", "+00:00"))
    return max(0.0, (e - s).total_seconds() / 60.0)


def parse_daily_rhr(points: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for p in points:
        rhr = p.get("dailyRestingHeartRate")
        if not rhr:
            continue
        key = date_key(rhr["date"])
        out[key] = float(rhr["beatsPerMinute"])
    return out


def parse_hrv_daily(points: list[dict]) -> dict[str, float]:
    """Average RMSSD per civil day (morning samples)."""
    buckets: dict[str, list[float]] = {}
    for p in points:
        hrv = p.get("heartRateVariability")
        if not hrv:
            continue
        civil = hrv.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        key = date_key(civil["date"])
        val = hrv.get("rootMeanSquareOfSuccessiveDifferencesMilliseconds")
        if val is not None:
            buckets.setdefault(key, []).append(float(val))
    return {k: sum(v) / len(v) for k, v in buckets.items() if v}


def parse_hr_daily_avg(
    points: list[dict], waking_start: int = 8, waking_end: int = 22
) -> dict[str, float]:
    """Average *daytime* HR per civil day.

    Restricting to waking hours keeps the stress proxy from being diluted by
    low nocturnal heart rate. Samples without a usable hour are kept as a
    fallback so days from sources lacking a time component aren't dropped.
    """
    buckets: dict[str, list[float]] = {}
    for p in points:
        hr = p.get("heartRate")
        if not hr:
            continue
        civil = hr.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        hour = civil.get("time", {}).get("hours")
        if hour is not None and not (waking_start <= hour < waking_end):
            continue
        key = date_key(civil["date"])
        bpm = hr.get("beatsPerMinute")
        if bpm is not None:
            buckets.setdefault(key, []).append(float(bpm))
    return {k: sum(v) / len(v) for k, v in buckets.items() if v}


def parse_exercise_daily(points: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for p in points:
        ex = p.get("exercise")
        if not ex:
            continue
        interval = ex.get("interval") or {}
        key = interval_day(interval)
        if not key:
            continue

        minutes = 0.0
        if interval.get("startTime") and interval.get("endTime"):
            minutes = parse_iso_duration(interval["startTime"], interval["endTime"])
        elif ex.get("activeDuration"):
            minutes = parse_duration_seconds(ex["activeDuration"]) / 60.0

        entry = out.setdefault(
            key,
            {"count": 0, "minutes": 0, "calories": 0, "types": {}, "sessions": []},
        )
        entry["count"] += 1
        entry["minutes"] += minutes

        cal = ex.get("activeCalories") or ex.get("calories")
        session_kcal = 0.0
        if cal is not None:
            if isinstance(cal, dict):
                session_kcal = float(cal.get("kilocalories", 0) or cal.get("kcal", 0) or 0)
            else:
                session_kcal = float(cal)
            entry["calories"] += session_kcal

        metrics = ex.get("metricsSummary") or {}
        avg_hr = metrics.get("averageHeartRateBpm") or metrics.get("averageHeartRate")
        dist_mm = metrics.get("distanceMillimeters")

        ex_type = ex.get("displayName") or ex.get("exerciseType") or "Autre"
        entry["types"][ex_type] = entry["types"].get(ex_type, 0) + 1
        entry["sessions"].append(
            {
                "type": ex_type,
                "minutes": round(minutes),
                "distance_m": round(float(dist_mm or 0) / 1000, 2) if dist_mm else None,
                "calories": round(session_kcal) if session_kcal else None,
                "avg_hr": round(float(avg_hr)) if avg_hr is not None else None,
                "start_time": interval.get("startTime"),
            }
        )

    for day in out.values():
        day["minutes"] = round(day["minutes"])
        day["calories"] = round(day["calories"])
    return out


def parse_body_fat(points: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for p in points:
        bf = p.get("bodyFat")
        if not bf:
            continue
        civil = bf.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        key = date_key(civil["date"])
        pct = bf.get("percentage")
        if pct is not None:
            out[key] = float(pct)
    return out


def parse_blood_pressure(points: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for p in points:
        bp = p.get("bloodPressure")
        if not bp:
            continue
        civil = bp.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        key = date_key(civil["date"])
        out[key] = {
            "systolic": float(bp.get("systolicMmHg", 0)),
            "diastolic": float(bp.get("diastolicMmHg", 0)),
        }
    return out


def parse_respiratory_daily(points: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for p in points:
        rr = p.get("dailyRespiratoryRate") or p.get("dailyRespiratoryRate")
        if not rr:
            rr = p.get("respiratoryRate")
        if not rr:
            continue
        date = rr.get("date") or rr.get("sampleTime", {}).get("civilTime", {}).get("date")
        if not date:
            continue
        key = date_key(date)
        rate = rr.get("breathsPerMinute") or rr.get("rate")
        if rate is not None:
            # Prefer Fitbit over HC duplicate for same day (later point wins if higher precision)
            val = float(rate)
            if key not in out or p.get("dataSource", {}).get("platform") == "FITBIT":
                out[key] = val
    return out


def parse_spo2_daily(points: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    point_vals: dict[str, list[float]] = {}
    for p in points:
        daily = p.get("dailyOxygenSaturation")
        if daily:
            date = daily.get("date")
            avg = daily.get("averagePercentage")
            if date and avg is not None:
                out[date_key(date)] = float(avg)
            continue

        spo2 = p.get("oxygenSaturation")
        if not spo2:
            continue
        civil = spo2.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        key = date_key(civil["date"])
        pct = spo2.get("percentage")
        if pct is not None:
            point_vals.setdefault(key, []).append(float(pct))

    for key, vals in point_vals.items():
        if key not in out and vals:
            sane = [v for v in vals if 70 <= v <= 100]
            pool = sane or vals
            out[key] = round(sum(pool) / len(pool), 1)
    return out


def _source_key(point: dict) -> str:
    ds = point.get("dataSource") or {}
    return str(ds.get("platform") or ds.get("device") or "default")


def parse_steps_from_points(points: list[dict]) -> dict[str, int]:
    """Per day: max total steps per data source (évite double comptage Fitbit + HC)."""
    by_day_source: dict[str, dict[str, int]] = {}
    for p in points:
        steps = p.get("steps")
        if not steps:
            continue
        civil = steps.get("interval", {}).get("civilStartTime", {}).get("date")
        if not civil:
            continue
        key = date_key(civil)
        count = int(steps.get("count", 0) or 0)
        if count <= 0:
            continue
        src = _source_key(p)
        by_day_source.setdefault(key, {})
        by_day_source[key][src] = by_day_source[key].get(src, 0) + count

    out: dict[str, int] = {}
    for key, per_src in by_day_source.items():
        out[key] = max(per_src.values())
    return out


def merge_daily_max(*series: dict[str, int]) -> dict[str, int]:
    out: dict[str, int] = {}
    for s in series:
        for k, v in s.items():
            if v is None:
                continue
            out[k] = max(out.get(k, 0), int(v))
    return out


def parse_active_energy_daily(points: list[dict]) -> dict[str, float]:
    """Max kcal actives par jour et par source (évite doublons multi-sources)."""
    by_day_source: dict[str, dict[str, float]] = {}
    for p in points:
        aeb = p.get("activeEnergyBurned")
        if not aeb:
            continue
        key = interval_day(aeb.get("interval") or {})
        if not key:
            continue
        kcal = float(aeb.get("kcal") or 0)
        if kcal <= 0:
            continue
        src = _source_key(p)
        by_day_source.setdefault(key, {})
        by_day_source[key][src] = by_day_source[key].get(src, 0.0) + kcal

    out: dict[str, float] = {}
    for key, per_src in by_day_source.items():
        out[key] = round(max(per_src.values()))
    return out


def parse_steps_rollup(rollups: list[dict]) -> dict[str, int]:
    out: dict[str, int] = {}
    for r in rollups:
        start = r.get("civilStartTime", {}).get("date")
        steps = r.get("steps", {}).get("countSum")
        if start and steps is not None:
            out[date_key(start)] = int(steps)
    return out


def parse_distance_daily(points: list[dict]) -> dict[str, float]:
    """Per day: max total km per data source (millimeters from API)."""
    by_day_source: dict[str, dict[str, float]] = {}
    for p in points:
        dist = p.get("distance")
        if not dist:
            continue
        key = interval_day(dist.get("interval") or {})
        if not key:
            continue
        mm = float(dist.get("millimeters") or 0)
        if mm <= 0:
            continue
        src = _source_key(p)
        by_day_source.setdefault(key, {})
        by_day_source[key][src] = by_day_source[key].get(src, 0.0) + mm

    out: dict[str, float] = {}
    for key, per_src in by_day_source.items():
        out[key] = round(max(per_src.values()) / 1_000_000, 2)
    return out


def parse_distance_rollup(rollups: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for r in rollups:
        start = r.get("civilStartTime", {}).get("date")
        dist = r.get("distance") or {}
        mm = dist.get("millimetersSum") or dist.get("millimeters")
        if start and mm is not None:
            out[date_key(start)] = round(float(mm) / 1_000_000, 2)
    return out


def merge_daily_max_float(*series: dict[str, float]) -> dict[str, float]:
    out: dict[str, float] = {}
    for s in series:
        for k, v in s.items():
            if v is None:
                continue
            out[k] = max(out.get(k, 0.0), float(v))
    return out


def parse_zone_minutes(points: list[dict]) -> dict[str, dict[str, int]]:
    """Per day: zone name -> minutes."""
    out: dict[str, dict[str, int]] = {}
    # Out-of-zone time is rest/light activity, not cardiovascular load → 0.
    # Geometric ramp (×2 per zone) approximating TRIMP's exponential weighting
    # of intensity — a minute at peak costs far more than a minute fat-burning.
    # CARDIO stays at 3 so the overall load scale (and STRAIN_LOAD_TAU) holds.
    zone_coeff = {
        "OUT_OF_ZONE": 0,
        "FAT_BURN": 1.5,
        "CARDIO": 3,
        "PEAK": 6,
    }
    zone_keys = {
        "FAT_BURN": "fat_burn",
        "CARDIO": "cardio",
        "PEAK": "peak",
    }
    for p in points:
        az = p.get("activeZoneMinutes")
        if not az:
            continue
        civil = az.get("interval", {}).get("civilStartTime", {}).get("date")
        if not civil:
            continue
        key = date_key(civil)
        zone = az.get("heartRateZone", "OUT_OF_ZONE")
        mins = int(az.get("activeZoneMinutes", 0))
        day = out.setdefault(
            key,
            {"load": 0, "minutes": 0, "fat_burn": 0, "cardio": 0, "peak": 0},
        )
        day["minutes"] += mins
        day["load"] += mins * zone_coeff.get(zone, 1)
        zone_field = zone_keys.get(zone)
        if zone_field:
            day[zone_field] += mins
    return out


STAGE_LANE: dict[str, int] = {
    "AWAKE": 0,
    "REM": 1,
    "LIGHT": 2,
    "CORE": 2,
    "DEEP": 3,
    "SWS": 3,
}


def _sleep_stage_timeline(stages: list[dict]) -> list[dict[str, Any]]:
    """Chronological sleep stages for hypnogram (lane 0=éveil … 3=profond)."""
    if not stages:
        return []
    ordered = sorted(stages, key=lambda s: s.get("startTime", ""))
    out: list[dict[str, Any]] = []
    for st in ordered:
        start = st.get("startTime")
        end = st.get("endTime")
        if not start or not end:
            continue
        t = st.get("type", "").upper()
        lane = STAGE_LANE.get(t)
        if lane is None:
            continue
        out.append({"start": start, "end": end, "type": t, "lane": lane})
    return out


def _sleep_latency_min(bed_start: str | None, stages: list[dict]) -> float | None:
    """Minutes from bed start until first non-AWAKE stage."""
    if not bed_start or not stages:
        return None
    bed_dt = datetime.fromisoformat(bed_start.replace("Z", "+00:00"))
    ordered = sorted(stages, key=lambda s: s.get("startTime", ""))
    for st in ordered:
        t = st.get("type", "").upper()
        if t and t != "AWAKE":
            sleep_start = datetime.fromisoformat(st["startTime"].replace("Z", "+00:00"))
            return max(0.0, (sleep_start - bed_dt).total_seconds() / 60.0)
    return None


def parse_sleep_sessions(points: list[dict]) -> dict[str, dict[str, float]]:
    """Best sleep session per end-date (minutes by stage)."""
    sessions: list[dict[str, Any]] = []
    for p in points:
        sleep = p.get("sleep")
        if not sleep:
            continue
        interval = sleep.get("interval", {})
        end = interval.get("endTime")
        start = interval.get("startTime")
        if not end:
            continue
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        key = end_dt.strftime("%Y-%m-%d")

        stages = sleep.get("stages", [])
        stage_mins = {"deep": 0.0, "rem": 0.0, "light": 0.0, "awake": 0.0}
        for st in stages:
            dur = parse_iso_duration(st["startTime"], st["endTime"])
            t = st.get("type", "").upper()
            if t in ("DEEP", "SWS"):
                stage_mins["deep"] += dur
            elif t == "REM":
                stage_mins["rem"] += dur
            elif t in ("LIGHT", "CORE"):
                stage_mins["light"] += dur
            elif t == "AWAKE":
                stage_mins["awake"] += dur

        total = sum(stage_mins.values()) or parse_iso_duration(
            interval["startTime"], interval["endTime"]
        )
        asleep = total - stage_mins["awake"]
        latency = _sleep_latency_min(start, stages)
        timeline = _sleep_stage_timeline(stages)
        sessions.append(
            {
                "date": key,
                "total_min": total,
                "asleep_min": max(0, asleep),
                "efficiency": (asleep / total * 100) if total else 0,
                "bedtime": start,
                "wakeup": end,
                "latency_min": latency,
                "stage_timeline": timeline,
                **stage_mins,
            }
        )

    by_date: dict[str, dict] = {}
    for s in sessions:
        prev = by_date.get(s["date"])
        if not prev or s["asleep_min"] > prev["asleep_min"]:
            by_date[s["date"]] = s
    return by_date


def _sample_time_sort_key(sample_time: dict | None) -> str:
    """Sortable ISO-ish key from a Google Health sampleTime block."""
    if not sample_time:
        return ""
    physical = sample_time.get("physicalTime")
    if physical:
        return physical
    civil = sample_time.get("civilTime") or {}
    d = civil.get("date") or {}
    t = civil.get("time") or {}
    if not d.get("year"):
        return ""
    return (
        f"{date_key(d)}T"
        f"{int(t.get('hours', 0)):02d}:"
        f"{int(t.get('minutes', 0)):02d}:"
        f"{int(t.get('seconds', 0)):02d}"
    )


def parse_weight(points: list[dict]) -> dict[str, float]:
    """Latest weight per civil day (multiple syncs may arrive out of order)."""
    best: dict[str, tuple[str, float]] = {}
    for p in points:
        w = p.get("weight")
        if not w:
            continue
        civil = w.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        key = date_key(civil["date"])
        kg = w.get("kilograms")
        if kg is None and w.get("weightGrams") is not None:
            kg = float(w["weightGrams"]) / 1000.0
        if kg is None and w.get("pounds") is not None:
            kg = float(w["pounds"]) * 0.45359237
        if kg is None:
            continue
        ts = _sample_time_sort_key(w.get("sampleTime"))
        prev = best.get(key)
        if prev is None or ts >= prev[0]:
            best[key] = (ts, float(kg))
    return {day: kg for day, (_, kg) in best.items()}


def parse_height(points: list[dict]) -> dict[str, float]:
    """Height in meters per measurement date."""
    out: dict[str, float] = {}
    for p in points:
        h = p.get("height")
        if not h:
            continue
        civil = h.get("sampleTime", {}).get("civilTime", {})
        if not civil.get("date"):
            continue
        key = date_key(civil["date"])
        meters = h.get("meters")
        if meters is None and h.get("heightMillimeters") is not None:
            meters = float(h["heightMillimeters"]) / 1000.0
        if meters is None and h.get("heightMeters") is not None:
            meters = float(h["heightMeters"])
        if meters is not None:
            out[key] = float(meters)
    return out


def parse_vo2max(points: list[dict]) -> dict[str, float]:
    out: dict[str, float] = {}
    for p in points:
        vo2 = p.get("dailyVo2Max") or p.get("vo2Max")
        if not vo2:
            continue
        date = vo2.get("date")
        if not date:
            continue
        key = date_key(date)
        val = vo2.get("millilitersPerKilogramPerMinute") or vo2.get("value")
        if val is not None:
            out[key] = float(val)
    return out
