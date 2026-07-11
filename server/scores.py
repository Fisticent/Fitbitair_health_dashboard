"""X-Score calculations — inspired by WHOOP, not proprietary algo."""

from __future__ import annotations

import math
import statistics
from datetime import date
from typing import Any


def z_score(value: float, history: list[float]) -> float:
    if len(history) < 3:
        return 0.0
    mu = statistics.mean(history)
    sigma = statistics.stdev(history) or 1.0
    return (value - mu) / sigma


def _pct_from_z(z: float) -> int:
    """Map a personal-baseline z-score to a 0–100 score via the normal CDF.

    Reads off "where today sits in your own distribution": z 0 → 50, +0.44 →
    ~67 (top third → green), −0.44 → ~33. Uses the full 0–100 range at realistic
    z values instead of clustering near 50 like a linear 50+k·z map — Oura/WHOOP
    present recovery/readiness as a personal percentile for the same reason.
    """
    return max(0, min(100, round(100 * 0.5 * (1 + math.erf(z / math.sqrt(2))))))


def recovery_zone(pct: float) -> str:
    if pct >= 67:
        return "green"
    if pct >= 34:
        return "yellow"
    return "red"


def recovery_color(zone: str) -> str:
    return {"green": "#00D68F", "yellow": "#FFB020", "red": "#FF4D4D"}.get(zone, "#888")


def total_asleep_min(session: dict | None) -> float:
    """Asleep minutes for a day, including naps when aggregated by the parser."""
    if not session:
        return 0.0
    return float(session.get("total_asleep_min", session.get("asleep_min", 0)))


def sleep_need_hours(prior_strain: float = 0.0, recent_debt_h: float = 0.0) -> float:
    """Sleep need in hours, rising with the previous day's strain (0–100 %) and
    with accumulated sleep debt from recent nights.

    Single source of truth shared by recovery and the sleep score so the
    two never disagree on the target.
    """
    # ~57 % ≈ ancien seuil 12/21 — même courbe de besoin de sommeil.
    base = 7.5 + max(0, (prior_strain - 57) * 0.0525)
    # Repay part of the recent shortfall, à la WHOOP: ~50 % of accrued debt,
    # capped at +1 h so a rough week doesn't push the target out of reach.
    return base + min(1.0, max(0.0, recent_debt_h) * 0.5)


def recent_sleep_debt_h(
    day: str, sleep: dict[str, dict], baseline_h: float = 7.5, nights: int = 3
) -> float:
    """Accumulated sleep shortfall vs a baseline over the prior N nights (hours).

    Feeds ``sleep_need_hours`` so tonight's target rises after short nights,
    mirroring how WHOOP rolls recent debt into sleep need. Missing nights
    simply don't contribute.
    """
    from datetime import date as date_type, timedelta

    try:
        f = date_type.fromisoformat(day)
    except ValueError:
        return 0.0
    debt = 0.0
    for i in range(1, nights + 1):
        s = sleep.get((f - timedelta(days=i)).isoformat())
        if not s:
            continue
        debt += max(0.0, baseline_h - total_asleep_min(s) / 60)
    return round(debt, 2)


def compute_recovery(
    day: str,
    hrv: dict[str, float],
    rhr: dict[str, float],
    sleep: dict[str, dict],
    resp: dict[str, float],
    prior_strain: float = 0.0,
    recent_debt_h: float = 0.0,
    skin_temp: dict[str, dict] | None = None,
) -> dict[str, Any]:
    dates = sorted(set(hrv) | set(rhr) | set(sleep))
    # Keep requested day even if metrics are still syncing in
    hist_dates = [d for d in dates if d < day][-14:]
    hrv_hist = [hrv[d] for d in hist_dates if d in hrv]
    rhr_hist = [rhr[d] for d in hist_dates if d in rhr]
    sleep_hist = [total_asleep_min(sleep[d]) / 60 for d in hist_dates if d in sleep]
    resp_hist = [resp[d] for d in hist_dates if d in resp]

    hrv_val = hrv.get(day)
    rhr_val = rhr.get(day)
    sleep_val = total_asleep_min(sleep.get(day)) / 60
    resp_val = resp.get(day)
    temp_today = (skin_temp or {}).get(day) or {}
    temp_dev = temp_today.get("deviation")

    need = sleep_need_hours(prior_strain, recent_debt_h)
    # Floor the sleep scale at 0.5 h so a very regular sleeper's tiny σ can't
    # amplify a normal shortfall into a runaway z — mirrors the floors used by
    # _robust_z on the other components.
    sleep_sigma = max(statistics.stdev(sleep_hist) if len(sleep_hist) > 2 else 1.0, 0.5)

    # Only weight components that actually have data, then renormalise the
    # weights — a partial day shouldn't be dragged toward 50% by the absent
    # metrics, and missing data shouldn't be confused with a bad value.
    # Each autonomic signal uses the same robust median/MAD basis as the stress
    # proxy, and HRV is z-scored on ln(RMSSD) (lnRMSSD) since it is log-normally
    # distributed — one consistent treatment of HRV across every screen.
    weighted: list[tuple[float, float]] = []
    z_hrv_impact: float | None = None
    z_rhr_impact: float | None = None
    z_sleep_impact: float | None = None
    z_resp_impact: float | None = None
    z_temp_impact: float | None = None

    if hrv_val and hrv_val > 0 and hrv_hist:
        z_hrv = _robust_z(
            math.log(hrv_val),
            [math.log(h) for h in hrv_hist if h > 0],
            floor=0.12,
            min_n=3,
        )
        if z_hrv is not None:
            z_hrv_impact = z_hrv
            weighted.append((0.40, z_hrv))
    if rhr_val and rhr_hist:
        z_rhr = _robust_z(rhr_val, rhr_hist, floor=2.0, min_n=3)
        if z_rhr is not None:
            z_rhr_impact = -z_rhr  # lower resting HR is better
            weighted.append((0.25, z_rhr_impact))
    if sleep_val:
        z_sleep_impact = (sleep_val - need) / (sleep_sigma or 1.0)
        weighted.append((0.25, z_sleep_impact))
    if resp_val and resp_hist:
        z_resp = _robust_z(resp_val, resp_hist, floor=0.5, min_n=3)
        if z_resp is not None:
            z_resp_impact = -z_resp  # lower respiratory rate is better
            weighted.append((0.10, z_resp_impact))
    if temp_dev is not None:
        temp_hist = [
            skin_temp[d]["deviation"]
            for d in hist_dates
            if d in (skin_temp or {}) and skin_temp[d].get("deviation") is not None
        ]
        z_temp = _robust_z(temp_dev, temp_hist, floor=0.15, min_n=3)
        if z_temp is not None:
            z_temp_impact = -z_temp  # warmer than baseline = worse recovery
            weighted.append((0.10, z_temp_impact))

    if weighted:
        total_w = sum(w for w, _ in weighted)
        z_composite = sum(w * z for w, z in weighted) / total_w
    else:
        z_composite = 0.0
    pct = _pct_from_z(z_composite)

    def _round_z(z: float | None) -> float | None:
        return round(z, 2) if z is not None else None

    return {
        "date": day,
        "score": pct,
        "zone": recovery_zone(pct),
        "color": recovery_color(recovery_zone(pct)),
        "components": {
            "hrv": {
                "value": round(hrv_val) if hrv_val is not None else None,
                "unit": "ms",
                "z": _round_z(z_hrv_impact),
            },
            "rhr": {
                "value": round(rhr_val) if rhr_val is not None else None,
                "unit": "bpm",
                "z": _round_z(z_rhr_impact),
            },
            "sleep_hours": {
                "value": round(sleep_val, 1),
                "need": round(need, 1),
                "z": _round_z(z_sleep_impact),
            },
            "respiratory": {
                "value": round(resp_val) if resp_val is not None else None,
                "unit": "/min",
                "z": _round_z(z_resp_impact),
            },
            "skin_temp": {
                "value": temp_dev,
                "unit": "°C",
                "nightly": temp_today.get("nightly"),
                "z": _round_z(z_temp_impact),
            },
        },
    }


# Load (intensity-weighted minutes) giving ~63 % of the strain scale.
STRAIN_LOAD_TAU = 120.0


def _strain_from_load(load: float) -> float:
    """Single 0–100 % mapping so every load source shares one continuous curve."""
    if load <= 0:
        return 0.0
    return round(min(100.0, max(0.0, 100 * (1 - math.exp(-load / STRAIN_LOAD_TAU)))))


def compute_strain(
    day: str,
    zones: dict[str, dict],
    *,
    steps: dict[str, int] | None = None,
    active_energy: dict[str, float] | None = None,
    exercise: dict[str, dict] | None = None,
) -> dict[str, Any]:
    z = zones.get(day) or {}
    load = float(z.get("load", 0) or 0)
    minutes = int(z.get("minutes", 0) or 0)
    source = "zones"
    notice: str | None = None

    if load <= 0:
        # No weighted load: either only out-of-zone minutes were recorded, or
        # heart-rate zones are missing entirely and we fall back to activity.
        if minutes > 0:
            load = float(minutes)  # light effort, fed through the same curve
        else:
            step_count = int((steps or {}).get(day) or 0)
            kcal = float((active_energy or {}).get(day) or 0)
            ex = (exercise or {}).get(day) or {}
            ex_min = int(ex.get("minutes", 0) or 0)
            if step_count > 0 or kcal > 0 or ex_min > 0:
                source = "estimation"
                load = kcal * 0.12 + ex_min * 2.5 + min(step_count, 20000) / 400
                minutes = ex_min if ex_min > 0 else max(1, round(step_count / 120))
                notice = (
                    "Estimation depuis pas, calories ou exercice — zones FC non disponibles ce jour-là."
                )
            else:
                source = "none"
                notice = "Aucune zone cardio ni activité détectée pour ce jour."

    score = _strain_from_load(load)

    if score < 48:
        label = "Léger"
    elif score < 67:
        label = "Modéré"
    elif score < 86:
        label = "Élevé"
    else:
        label = "Maximal"

    return {
        "date": day,
        "score": score,
        "max": 100,
        "label": label,
        "zone_minutes": minutes,
        "load": round(load, 1),
        "source": source,
        "notice": notice,
        "zones": {
            "fat_burn": int(z.get("fat_burn", 0) or 0),
            "cardio": int(z.get("cardio", 0) or 0),
            "peak": int(z.get("peak", 0) or 0),
        },
    }


def compute_sleep_score(day: str, sleep: dict[str, dict], need: float = 7.5) -> dict[str, Any]:
    s = sleep.get(day, {})
    main_asleep_min = s.get("asleep_min", 0)
    day_total_min = total_asleep_min(s)
    main_asleep_h = main_asleep_min / 60
    total_asleep_h = day_total_min / 60
    perf_dur = min(100, (main_asleep_h / need) * 100) if need else 0
    deep_pct = (s.get("deep", 0) / max(main_asleep_min, 1)) * 100
    rem_pct = (s.get("rem", 0) / max(main_asleep_min, 1)) * 100
    perf_qual = min(100, 0.5 * min(100, deep_pct / 15 * 100) + 0.5 * min(100, rem_pct / 22 * 100))

    # Oura/Garmin-style weighted blend. Duration leads; efficiency and onset
    # latency join when the night actually carries that data, with the weights
    # renormalised so their absence never drags the score down.
    parts: list[tuple[float, float]] = [(0.55, perf_dur), (0.20, perf_qual)]
    efficiency = s.get("efficiency")
    if efficiency:
        # ≥90 % of time-in-bed spent asleep = full marks.
        parts.append((0.15, min(100, efficiency / 90 * 100)))
    latency = s.get("latency_min")
    if latency is not None:
        # ≤15 min to fall asleep is ideal; each extra minute costs ~2 pts.
        parts.append((0.10, max(0, 100 - max(0, latency - 15) * 2)))
    total_w = sum(w for w, _ in parts)
    score = round(sum(w * v for w, v in parts) / total_w)

    total_min = s.get("total_min", 0)
    debt_hours = round(max(0.0, need - total_asleep_h), 2) if need else None
    naps_min = s.get("naps_min", 0)
    return {
        "date": day,
        "score": score,
        "hours": round(total_asleep_h, 2),
        "main_hours": round(main_asleep_h, 2),
        "naps_hours": round(naps_min / 60, 2),
        "nap_count": int(s.get("nap_count", 0)),
        "need": need,
        "debt_hours": debt_hours,
        "efficiency": round(s.get("efficiency", 0)),
        "time_in_bed_hours": round(total_min / 60, 2) if total_min else None,
        "bedtime": s.get("bedtime"),
        "wakeup": s.get("wakeup"),
        "latency_min": round(s["latency_min"]) if s.get("latency_min") is not None else None,
        "stage_timeline": s.get("stage_timeline") or [],
        "stages": {
            "deep_min": round(s.get("deep", 0)),
            "rem_min": round(s.get("rem", 0)),
            "light_min": round(s.get("light", 0)),
            "awake_min": round(s.get("awake", 0)),
        },
    }


def _display_metric(name: str, val: float) -> float | int:
    """Round values for UI display."""
    if name == "VFC":
        return round(val)
    if name in ("FC repos", "Respiration", "SpO₂"):
        return round(val)
    return round(val, 1)


def health_monitor(
    day: str,
    hrv: dict[str, float],
    rhr: dict[str, float],
    resp: dict[str, float],
    spo2: dict[str, float] | None = None,
    skin_temp: dict[str, dict] | None = None,
) -> list[dict[str, Any]]:
    spo2 = spo2 or {}
    skin_temp = skin_temp or {}
    dates = sorted(set(hrv) | set(rhr) | set(resp) | set(spo2) | set(skin_temp))
    hist = [d for d in dates if d < day][-30:]
    metrics = []

    def row(
        name: str,
        unit: str,
        val: float | None,
        hist_vals: list[float],
        *,
        invert: bool = False,
        low_only: bool = False,
        floor: float = 1.0,
    ):
        if val is None:
            return None
        # Median/MAD z like every other score here — a single odd day in the
        # window can't inflate σ and mask (or fake) a real anomaly.
        z = _robust_z(val, hist_vals, floor=floor, min_n=5) if hist_vals else None
        if z is None:
            z = 0.0
        if invert:
            z = -z
        # After `invert`, z is oriented so positive = better-than-baseline,
        # negative = worse. Two-sided metrics flag any deviation; SpO₂ is
        # clinically one-sided — only a *drop* matters (Fitbit/Garmin alert on
        # low O₂ only), so an unusually high reading never trips a warning.
        risk = max(0.0, -z) if low_only else abs(z)
        status = "normal" if risk < 1 else "warning" if risk < 2 else "alert"
        baseline = round(statistics.median(hist_vals), 1) if hist_vals else _display_metric(name, val)
        return {
            "name": name,
            "value": _display_metric(name, val),
            "unit": unit,
            "baseline": baseline,
            "status": status,
            "z": round(z, 2),
        }

    for item in [
        row("FC repos", "bpm", rhr.get(day), [rhr[d] for d in hist if d in rhr], invert=True, floor=2.0),
        row("VFC", "ms", hrv.get(day), [hrv[d] for d in hist if d in hrv], floor=3.0),
        row("Respiration", "/min", resp.get(day), [resp[d] for d in hist if d in resp], invert=True, floor=0.5),
        row("SpO₂", "%", spo2.get(day), [spo2[d] for d in hist if d in spo2], low_only=True, floor=1.0),
        row(
            "Temp. peau", "°C",
            (skin_temp.get(day) or {}).get("nightly"),
            [skin_temp[d]["nightly"] for d in hist if d in skin_temp and skin_temp[d].get("nightly") is not None],
            invert=True,  # warmer than baseline = worse
            floor=0.15,
        ),
    ]:
        if item:
            metrics.append(item)
    return metrics


def compute_sleep_regularity(
    focus: str,
    sleep: dict[str, dict],
    window_days: int = 14,
    min_nights: int = 4,
) -> dict[str, Any]:
    """Sleep timing consistency (Oura/Whoop style), 0–100.

    Low day-to-day variance in bed/wake times protects the circadian rhythm —
    a strong health predictor independent of duration. We use the standard
    deviation of bedtime and wake time over the recent window. Pre-noon clock
    times are shifted +24h so a 23:30 vs 00:30 bedtime isn't seen as ~24h apart.
    """
    from datetime import datetime

    dates = sorted(d for d in sleep if d <= focus)[-window_days:]
    rows: list[tuple[str, int, int]] = []
    for d in dates:
        sess = sleep[d]
        bt, wt = sess.get("bedtime"), sess.get("wakeup")
        if not bt or not wt:
            continue
        try:
            b = datetime.fromisoformat(bt.replace("Z", "+00:00"))
            w = datetime.fromisoformat(wt.replace("Z", "+00:00"))
        except ValueError:
            continue
        bm = b.hour * 60 + b.minute
        wm = w.hour * 60 + w.minute
        # Shift pre-noon clock times +24h so an evening bedtime and a small-hours
        # bedtime sit on a contiguous axis (and bed < wake for plotting).
        if bm < 720:
            bm += 1440
        if wm < 720:
            wm += 1440
        rows.append((d, bm, wm))

    nights = len(rows)
    if nights < min_nights:
        return {
            "score": None,
            "status": "calibrating",
            "label": "En calibrage",
            "nights": nights,
            "nights_needed": min_nights,
            "series": [],
        }

    beds = [bm for _, bm, _ in rows]
    wakes = [wm for _, _, wm in rows]
    sb = statistics.pstdev(beds) if len(beds) > 1 else 0.0
    sw = statistics.pstdev(wakes) if len(wakes) > 1 else 0.0
    score = max(0, min(100, round(100 - 0.25 * (sb + sw))))
    if score >= 85:
        label = "Très régulier"
    elif score >= 70:
        label = "Régulier"
    elif score >= 50:
        label = "Irrégulier"
    else:
        label = "Très irrégulier"

    def _clock(mins: float) -> str:
        m = int(round(mins)) % 1440
        return f"{m // 60:02d}:{m % 60:02d}"

    return {
        "score": score,
        "status": "ok",
        "label": label,
        "nights": nights,
        "bedtime_sigma_min": round(sb),
        "wakeup_sigma_min": round(sw),
        "avg_bedtime": _clock(statistics.mean(beds)),
        "avg_wakeup": _clock(statistics.mean(wakes)),
        "avg_bed_min": round(statistics.mean(beds)),
        "avg_wake_min": round(statistics.mean(wakes)),
        "series": [{"date": d, "bed_min": bm, "wake_min": wm} for d, bm, wm in rows],
    }


def compute_load_balance(
    focus: str,
    strain_by_day: dict[str, float],
    acute_days: int = 7,
    chronic_days: int = 28,
    min_days: int = 14,
    series_days: int = 14,
) -> dict[str, Any]:
    """Acute:Chronic Workload Ratio — recent load vs habitual load.

    The sports-science standard for over/under-training. Missing calendar days
    count as rest (load 0). Needs enough tracked days in the chronic window
    before it's meaningful.
    """
    from datetime import date as date_type, timedelta

    try:
        f = date_type.fromisoformat(focus)
    except ValueError:
        return {"ratio": None, "status": "calibrating", "label": "En calibrage",
                "days": 0, "days_needed": min_days, "series": []}

    def _acwr_at(end: date_type) -> tuple[float, float, float] | None:
        """(ratio, acute, chronic) ending on `end`, or None if too little data."""
        covered = sum(
            1 for i in range(chronic_days) if (end - timedelta(days=i)).isoformat() in strain_by_day
        )
        if covered < min_days:
            return None
        acute = statistics.mean(
            float(strain_by_day.get((end - timedelta(days=i)).isoformat(), 0.0)) for i in range(acute_days)
        )
        chronic = statistics.mean(
            float(strain_by_day.get((end - timedelta(days=i)).isoformat(), 0.0)) for i in range(chronic_days)
        )
        ratio = round(acute / chronic, 2) if chronic > 0 else 0.0
        return ratio, acute, chronic

    today = _acwr_at(f)
    if today is None:
        covered = sum(
            1 for i in range(chronic_days) if (f - timedelta(days=i)).isoformat() in strain_by_day
        )
        return {"ratio": None, "status": "calibrating", "label": "En calibrage",
                "days": covered, "days_needed": min_days, "series": []}

    ratio, acute, chronic = today
    if ratio < 0.8:
        zone, label = "low", "Sous-charge"
    elif ratio <= 1.3:
        zone, label = "optimal", "Optimal"
    elif ratio <= 1.5:
        zone, label = "caution", "Prudence"
    else:
        zone, label = "high", "Surcharge"

    series = []
    for i in range(series_days - 1, -1, -1):
        d = f - timedelta(days=i)
        r = _acwr_at(d)
        if r is not None:
            series.append({"date": d.isoformat(), "ratio": r[0]})

    return {
        "ratio": ratio,
        "acute": round(acute, 1),
        "chronic": round(chronic, 1),
        "zone": zone,
        "label": label,
        "status": "ok",
        "days": sum(1 for i in range(chronic_days) if (f - timedelta(days=i)).isoformat() in strain_by_day),
        "series": series,
    }


def compute_hrv_balance(
    focus: str,
    hrv: dict[str, float],
    recent_days: int = 7,
    base_days: int = 90,
    min_base: int = 14,
) -> dict[str, Any]:
    """HRV relative to the person's own baseline (Oura "HRV Balance"), 0–100.

    Absolute HRV is meaningless across people; what matters is whether your
    recent HRV is drifting below your long-term normal (accumulated stress,
    illness, overtraining) or sitting comfortably within it.
    """
    dates = sorted(d for d in hrv if d <= focus)
    if len(dates) < min_base:
        return {"score": None, "status": "calibrating", "label": "En calibrage",
                "days": len(dates), "days_needed": min_base}

    base_raw = [hrv[d] for d in dates[-base_days:]]
    recent_raw = [hrv[d] for d in dates[-recent_days:]]
    # z on ln(RMSSD) (log-normal) — same HRV treatment as recovery/stress.
    base_ln = [math.log(v) for v in base_raw if v > 0]
    recent_ln = [math.log(v) for v in recent_raw if v > 0]
    if not base_ln or not recent_ln:
        return {"score": None, "status": "calibrating", "label": "En calibrage",
                "days": len(dates), "days_needed": min_base}
    mu = statistics.mean(base_ln)
    sigma = statistics.stdev(base_ln) if len(base_ln) > 2 else 1.0
    z = (statistics.mean(recent_ln) - mu) / (sigma or 1.0)
    score = _pct_from_z(z)
    if score >= 65:
        label = "Au-dessus de ta base"
    elif score >= 35:
        label = "Équilibré"
    else:
        label = "Sous ta base"

    return {
        "score": score,
        "status": "ok",
        "label": label,
        "recent_avg": round(statistics.mean(recent_raw)),
        "baseline_avg": round(statistics.mean(base_raw)),
        "z": round(z, 2),
    }


def _robust_z(value: float, history: list[float], floor: float, min_n: int = 10) -> float | None:
    """Median/MAD z-score — resists outliers and tiny samples far better than
    mean/σ (a single odd day can shrink σ and blow a normal day up to a huge z).

    ``floor`` clamps the scale in the metric's own units so a nearly-flat
    history can't amplify normal variation. Returns ``None`` below ``min_n``.
    """
    if not math.isfinite(value):
        return None
    # Drop any non-finite history values (a sensor can emit nan/inf) so the
    # median/MAD — and the pstdev fallback — never choke.
    h = [x for x in history[-14:] if math.isfinite(x)]  # ~14-day rolling baseline
    if len(h) < min_n:
        return None
    mu = statistics.median(h)
    mad = statistics.median([abs(x - mu) for x in h])
    sigma = 1.4826 * mad if mad > 0 else (statistics.pstdev(h) or floor)
    return (value - mu) / max(sigma, floor)


def _exertion_factor(strain_score: float | None) -> float:
    """Shrink exercise-driven HR elevation toward 0 on hard-training days.

    WHOOP/Oura/Fitbit all discount exertion so a workout isn't read as stress.
    Our nocturnal HRV is unaffected by daytime exercise, but daytime-HR
    elevation is — so on a high-strain day we damp only the HR signal:
    strain 0 → 1.0 (no damping), strain 100 → 0.3.
    """
    if not strain_score or strain_score <= 0:
        return 1.0
    return max(0.3, 1.0 - 0.7 * min(100.0, strain_score) / 100.0)


def compute_stress_proxy(
    day: str,
    hr_avg: dict[str, float],
    rhr: dict[str, float],
    hrv: dict[str, float] | None = None,
    strain_by_day: dict[str, float] | None = None,
    skin_temp: dict[str, dict] | None = None,
) -> dict[str, Any]:
    """Relative acute-stress index from autonomic signals vs the person's own baseline.

    If daytime average heart rate (hr_avg) is missing (common for older history due to density),
    it falls back to using the resting heart rate (RHR) deviation from baseline.
    """
    baseline = rhr.get(day)
    if not baseline:
        return {
            "date": day,
            "score": None,
            "label": "Données insuffisantes",
            "level": None,
            "status": "calibrating",
            "proxy_pct": None,
            "basis": None,
            "days": 0,
            "days_needed": 10,
            "progress": 0.0,
        }

    avg = hr_avg.get(day) if hr_avg else None
    proxy_pct = round((avg - baseline) / baseline * 100, 1) if avg else None

    # --- HR-elevation signal vs personal baseline ---
    z_hr = None
    elev_hist: list[float] = []
    rhr_hist: list[float] = []

    if avg:
        for d in sorted(set(hr_avg) & set(rhr)):
            if d >= day:
                continue
            a, b = hr_avg[d], rhr[d]
            if a and b:
                elev_hist.append((a - b) / b * 100)
        z_hr = _robust_z(proxy_pct, elev_hist, floor=3.0)
        if z_hr is not None and z_hr > 0:
            z_hr *= _exertion_factor((strain_by_day or {}).get(day))
    else:
        # Fallback: RHR z-score against history
        rhr_hist = [rhr[d] for d in sorted(rhr) if d < day and rhr.get(d)]
        z_hr = _robust_z(baseline, rhr_hist, floor=2.0)
        if z_hr is not None and z_hr > 0:
            z_hr *= _exertion_factor((strain_by_day or {}).get(day))

    # --- HRV-depression signal vs personal baseline, on ln(HRV) (lnRMSSD) ---
    z_hrv = None
    ln_hist: list[float] = []
    if hrv:
        ln_hist = [math.log(hrv[d]) for d in sorted(hrv) if d < day and hrv.get(d) and hrv[d] > 0]
        if hrv.get(day) and hrv[day] > 0:
            zr = _robust_z(math.log(hrv[day]), ln_hist, floor=0.12)
            if zr is not None:
                z_hrv = -zr  # stress rises as HRV falls

    # --- Skin-temperature deviation vs personal baseline (warmer = more stress) ---
    z_temp = None
    if skin_temp and skin_temp.get(day) and skin_temp[day].get("deviation") is not None:
        dev_hist = [
            skin_temp[d]["deviation"]
            for d in sorted(skin_temp)
            if d < day and skin_temp[d].get("deviation") is not None
        ]
        z_temp = _robust_z(skin_temp[day]["deviation"], dev_hist, floor=0.15)

    parts: list[tuple[float, float]] = []
    if z_hrv is not None:
        parts.append((0.6, z_hrv))
    if z_hr is not None:
        parts.append((0.4, z_hr))
    if z_temp is not None:
        parts.append((0.2, z_temp))

    if parts:
        total_w = sum(w for w, _ in parts)
        z = sum(w * v for w, v in parts) / total_w
        score = round(100 / (1 + math.exp(-0.85 * z)))
        if z < -0.5:
            label, level = "Bas", "low"
        elif z < 1.0:
            label, level = "Modéré", "medium"
        else:
            label, level = "Élevé", "high"
        basis = "personal"
        status = "ok"
        baseline_pct = round(statistics.median(elev_hist), 1) if elev_hist else None
    else:
        # Fallback to neutral score when no baseline history can be computed
        score = 50
        label, level = "Modéré", "medium"
        basis = "absolute"
        status = "calibrating"
        baseline_pct = None

    # Calibration progress based on active signals
    days_needed = 10
    days_have = min(days_needed, max(len(elev_hist) if avg else len(rhr_hist), len(ln_hist)))

    return {
        "date": day,
        "score": score,
        "label": label,
        "level": level,
        "status": status,
        "proxy_pct": proxy_pct,
        "hr_avg": round(avg, 1) if avg else None,
        "rhr_baseline": baseline,
        "baseline_pct": baseline_pct,
        "basis": basis,
        "days": days_have,
        "days_needed": days_needed,
        "progress": round(days_have / days_needed, 2) if days_needed else 0.0,
        "components": {
            "hrv_z": round(z_hrv, 2) if z_hrv is not None else None,
            "hr_z": round(z_hr, 2) if z_hr is not None else None,
            "temp_z": round(z_temp, 2) if z_temp is not None else None,
        },
        "skin_temp": skin_temp.get(day) if skin_temp else None,
    }


def _graded(value: float, neutral: float, per_unit: float, lo: float, hi: float) -> float:
    """Linear year-delta around a neutral point, clamped — avoids threshold cliffs.

    ``per_unit`` is years added per unit *above* neutral (use a negative
    ``per_unit`` for metrics where higher is better, e.g. HRV, steps, VO₂).
    """
    return max(lo, min(hi, (value - neutral) * per_unit))


def compute_physiological_age(
    day: str,
    age: int,
    rhr: dict[str, float],
    hrv: dict[str, float],
    sleep: dict[str, dict],
    steps: dict[str, int],
    zones: dict[str, dict],
    vo2: dict[str, float],
    body_fat: dict[str, float],
    window_days: int = 14,
    sex: str = "unknown",
    vo2_max_age_days: int = 90,
) -> dict[str, Any]:
    """Simplified Healthspan-style functional age.

    Heuristic (not a validated biological-age model): each domain contributes a
    graded, clamped year-delta around a sex-aware neutral point instead of a
    binary threshold. Confidence reflects how many *domains* carry data.
    """
    dates = sorted(d for d in set(rhr) | set(sleep) | set(steps) if d <= day)[-window_days:]
    if not dates:
        return {
            "functional_age": age,
            "delta_years": 0,
            "real_age": age,
            "confidence": "low",
            "factors": [],
        }

    factors: list[tuple[str, float]] = []
    domains = 0

    rhr_vals = [rhr[d] for d in dates if d in rhr]
    if rhr_vals:
        domains += 1
        # Neutral resting HR is a few bpm higher for women.
        neutral = 66 if sex == "female" else 62
        factors.append(("FC repos", round(_graded(sum(rhr_vals) / len(rhr_vals), neutral, 0.1, -1.0, 2.0), 2)))

    sleep_h = [total_asleep_min(sleep[d]) / 60 for d in dates if d in sleep]
    if sleep_h:
        domains += 1
        # Below 7.5h penalises; modest credit for sleeping at/above target.
        factors.append(("Sommeil", round(_graded(sum(sleep_h) / len(sleep_h), 7.5, -0.8, -0.5, 2.0), 2)))

    step_vals = [steps[d] for d in dates if d in steps]
    if step_vals:
        domains += 1
        factors.append(("Pas", round(_graded(sum(step_vals) / len(step_vals), 8000, -0.00025, -0.5, 1.5), 2)))

    zone_mins = [zones[d]["minutes"] for d in dates if d in zones]
    if zone_mins:
        domains += 1
        # ~21 min/day ≈ WHO 150 min/week of activity.
        factors.append(("Zones cardio", round(_graded(sum(zone_mins) / len(zone_mins), 21, -0.05, -0.5, 1.0), 2)))

    hrv_vals = [hrv[d] for d in dates if d in hrv]
    if hrv_vals:
        domains += 1
        # RMSSD falls ~1 %/yr from age 30 (≈62 ms @30, 48 @40, 38 @50, 24 @65),
        # so a fixed neutral would penalise older users. Age-track the neutral —
        # what counts is being above/below the norm for *your* age, not for a 30yo.
        hrv_neutral = max(25.0, min(75.0, 75 - (age - 20) * 1.1))
        factors.append(("VFC", round(_graded(sum(hrv_vals) / len(hrv_vals), hrv_neutral, -0.015, -0.5, 0.5), 2)))

    # VO₂ max: only count a recent reading, never an indefinitely stale one.
    vo2_date, vo2_val = nearest_metric(vo2, day)
    if vo2_val is not None and vo2_date is not None:
        from datetime import date as date_type

        try:
            stale = (date_type.fromisoformat(day) - date_type.fromisoformat(vo2_date)).days > vo2_max_age_days
        except ValueError:
            stale = False
        if not stale:
            domains += 1
            neutral = 34 if sex == "female" else 40
            factors.append(("VO₂ max", round(_graded(vo2_val, neutral, -0.12, -1.0, 2.0), 2)))

    # Drop negligible contributions so the factor list stays meaningful.
    factors = [(n, d) for n, d in factors if abs(d) >= 0.05]

    total_delta = max(-5.0, min(8.0, sum(d for _, d in factors)))
    functional = age + total_delta

    if domains >= 5:
        confidence = "high"
    elif domains >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "functional_age": round(functional, 1),
        "delta_years": round(total_delta, 1),
        "real_age": age,
        "confidence": confidence,
        "factors": [{"name": n, "impact": d} for n, d in factors],
    }


def compute_pace_of_aging(
    history_ages: list[tuple[str, float]],
    min_points: int = 14,
    min_span_days: int = 21,
) -> dict[str, Any]:
    """Pace = annualised robust (Theil–Sen) slope of functional age.

    Improvements over a plain OLS fit:
      * regresses on **real calendar ordinals**, so missing days don't distort
        the per-day slope (and therefore the ×365 annualisation);
      * **Theil–Sen** (median of pairwise slopes) resists outlier days such as
        a single sleepless night;
      * a **noise gate** keeps us from labelling statistical noise as a trend —
        if the slope is within its own standard error of zero we report
        "Stable" with low confidence;
      * while the window is too short it returns a **calibrating** status with
        progress, instead of a misleading number.
    """
    pts: list[tuple[int, float]] = []
    for d, a in history_ages:
        if a is None:
            continue
        try:
            pts.append((date.fromisoformat(d).toordinal(), float(a)))
        except (ValueError, TypeError):
            continue
    pts.sort()

    span_days = (pts[-1][0] - pts[0][0]) if len(pts) >= 2 else 0
    if len(pts) < min_points or span_days < min_span_days:
        return {
            "pace_years_per_year": None,
            "label": "En calibrage",
            "status": "calibrating",
            "confidence": "low",
            "points": len(pts),
            "window_days": span_days,
            "days_needed": min_span_days,
            "progress": round(min(1.0, span_days / min_span_days), 2) if min_span_days else 0.0,
        }

    # Theil–Sen slope: median of all pairwise slopes (functional years / day).
    slopes = [
        (pts[j][1] - pts[i][1]) / (pts[j][0] - pts[i][0])
        for i in range(len(pts))
        for j in range(i + 1, len(pts))
        if pts[j][0] != pts[i][0]
    ]
    if not slopes:
        return {
            "pace_years_per_year": None,
            "label": "En calibrage",
            "status": "calibrating",
            "confidence": "low",
            "points": len(pts),
            "window_days": span_days,
            "days_needed": min_span_days,
            "progress": 0.0,
        }
    slope = statistics.median(slopes)
    intercept = statistics.median(a - slope * x for x, a in pts)

    # Robust noise estimate (MAD→σ) → standard error of the slope.
    resid = [a - (slope * x + intercept) for x, a in pts]
    sigma = (statistics.median(abs(r) for r in resid) * 1.4826) or 1e-9
    sx = statistics.pstdev([x for x, _ in pts]) or 1.0
    se = sigma / (sx * len(pts) ** 0.5)

    pace = max(-5.0, min(5.0, round(slope * 365, 2)))

    if abs(slope) < se:  # indistinguishable from zero
        label, confidence = "Stable", "low"
        pace = 0.0  # don't show a number the data can't support
    else:
        snr = abs(slope) / se
        confidence = "high" if (span_days >= 45 and snr >= 2) else "medium"
        if pace < -0.5:
            label = "Rajeunissement"
        elif pace > 0.5:
            label = "Vieillissement accéléré"
        else:
            label = "Stable"

    return {
        "pace_years_per_year": pace,
        "label": label,
        "status": "ok",
        "confidence": confidence,
        "points": len(pts),
        "window_days": span_days,
        "days_needed": min_span_days,
        "progress": 1.0,
    }


def nearest_metric(
    series: dict[str, float], focus: str
) -> tuple[str | None, float | None]:
    """Latest value on or before focus date."""
    if not series:
        return None, None
    if focus in series:
        return focus, series[focus]
    prior = [d for d in sorted(series) if d <= focus]
    if prior:
        d = prior[-1]
        return d, series[d]
    d = sorted(series)[-1]
    return d, series[d]


def bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Insuffisance pondérale"
    if bmi < 25:
        return "Normal"
    if bmi < 30:
        return "Surpoids"
    return "Obésité"


def ideal_weight_range(height_m: float | None) -> dict[str, Any] | None:
    """Healthy weight band from WHO BMI 18.5–24.9 for the given height."""
    if height_m is None or height_m <= 0:
        return None
    h2 = height_m * height_m
    min_kg = round(18.5 * h2, 1)
    max_kg = round(24.9 * h2, 1)
    target_kg = round(21.75 * h2, 1)
    return {
        "min_kg": min_kg,
        "max_kg": max_kg,
        "target_kg": target_kg,
        "bmi_min": 18.5,
        "bmi_max": 24.9,
        "bmi_target": 21.75,
    }


def ideal_body_fat_range(age: int | None, sex: str = "unknown") -> dict[str, Any] | None:
    """Healthy body-fat band by age and sex (ACE-style reference ranges)."""
    if age is None or age <= 0:
        return None
    if sex == "female":
        if age < 40:
            lo, hi = 21, 32
        elif age < 60:
            lo, hi = 23, 33
        else:
            lo, hi = 24, 35
    elif sex == "male":
        if age < 40:
            lo, hi = 8, 19
        elif age < 60:
            lo, hi = 11, 21
        else:
            lo, hi = 13, 25
    else:
        if age < 40:
            lo, hi = 14, 26
        elif age < 60:
            lo, hi = 16, 28
        else:
            lo, hi = 18, 30
    return {
        "min_pct": lo,
        "max_pct": hi,
        "target_pct": round((lo + hi) / 2, 1),
        "source": "ace",
    }


def _enrich_ideal_targets(
    *,
    weight_kg: float | None,
    body_fat_pct: float | None,
    ideal_weight: dict[str, Any] | None,
    ideal_body_fat: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    if ideal_weight and weight_kg is not None:
        ideal_weight = {
            **ideal_weight,
            "delta_kg": round(weight_kg - ideal_weight["target_kg"], 1),
            "in_range": ideal_weight["min_kg"] <= weight_kg <= ideal_weight["max_kg"],
        }
    if ideal_body_fat and body_fat_pct is not None:
        ideal_body_fat = {
            **ideal_body_fat,
            "delta_pct": round(body_fat_pct - ideal_body_fat["target_pct"], 1),
            "in_range": ideal_body_fat["min_pct"] <= body_fat_pct <= ideal_body_fat["max_pct"],
        }
    return ideal_weight, ideal_body_fat


def estimate_bmr_kcal(
    weight_kg: float | None, height_cm: float | None, age: int, sex: str = "unknown"
) -> int | None:
    """Mifflin-St Jeor. Sex-specific constant (+5 homme, −161 femme).

    Unknown sex uses the midpoint (−78) rather than silently assuming male.
    """
    if weight_kg is None or height_cm is None or not age:
        return None
    constant = {"male": 5, "female": -161}.get(sex, -78)
    return round(10 * weight_kg + 6.25 * height_cm - 5 * age + constant)


def compute_calories_summary(
    focus: str,
    active: dict[str, float],
    weight_kg: float | None,
    height_cm: float | None,
    age: int,
    sex: str = "unknown",
) -> dict[str, Any]:
    active_kcal = active.get(focus)
    bmr = estimate_bmr_kcal(weight_kg, height_cm, age, sex)
    total_est = None
    if active_kcal is not None and bmr is not None:
        total_est = round(active_kcal + bmr)

    hist_vals = [v for d, v in sorted(active.items()) if d <= focus][-14:]
    avg_active = round(sum(hist_vals) / len(hist_vals)) if hist_vals else None

    delta_7d = None
    if active_kcal is not None and focus:
        from datetime import date as date_type, timedelta

        week_ago = (date_type.fromisoformat(focus) - timedelta(days=7)).isoformat()
        prior_dates = [d for d in sorted(active) if d <= week_ago]
        if prior_dates:
            prior = active.get(prior_dates[-1])
            if prior is not None:
                delta_7d = round(active_kcal - prior)

    history = [{"date": d, "value": v} for d, v in sorted(active.items()) if d <= focus][-30:]

    return {
        "active_kcal": active_kcal,
        "bmr_kcal": bmr,
        "total_est_kcal": total_est,
        "avg_active_14d": avg_active,
        "delta_active_7d": delta_7d,
        "history": history,
        "source": "active-energy-burned",
    }


def compute_body_composition(
    focus: str,
    weight: dict[str, float],
    height: dict[str, float],
    body_fat: dict[str, float],
    *,
    age: int | None = None,
    sex: str = "unknown",
) -> dict[str, Any]:
    w_date, w_kg = nearest_metric(weight, focus)
    h_date, h_m = nearest_metric(height, focus)
    _, bf_pct = nearest_metric(body_fat, focus)

    bmi = None
    if w_kg is not None and h_m and h_m > 0:
        bmi = round(w_kg / (h_m * h_m), 1)

    lean_kg = None
    fat_mass_kg = None
    if w_kg is not None and bf_pct is not None:
        fat_mass_kg = round(w_kg * bf_pct / 100, 1)
        lean_kg = round(w_kg - fat_mass_kg, 1)

    # Weight trend: delta vs ~7 days earlier
    weight_delta_7d = None
    if w_kg is not None and w_date:
        from datetime import date as date_type, timedelta

        week_ago = (date_type.fromisoformat(w_date) - timedelta(days=7)).isoformat()
        _, w_old = nearest_metric(weight, week_ago)
        if w_old is not None:
            weight_delta_7d = round(w_kg - w_old, 1)

    weight_history = [
        {"date": d, "value": round(v, 1)}
        for d, v in sorted(weight.items())
        if d <= focus
    ][-90:]

    ideal_weight = ideal_weight_range(h_m)
    ideal_body_fat = ideal_body_fat_range(age, sex)
    ideal_weight, ideal_body_fat = _enrich_ideal_targets(
        weight_kg=w_kg,
        body_fat_pct=bf_pct,
        ideal_weight=ideal_weight,
        ideal_body_fat=ideal_body_fat,
    )

    return {
        "weight_kg": round(w_kg, 1) if w_kg is not None else None,
        "weight_date": w_date,
        "height_m": round(h_m, 2) if h_m is not None else None,
        "height_cm": round(h_m * 100) if h_m is not None else None,
        "height_date": h_date,
        "bmi": bmi,
        "bmi_category": bmi_category(bmi) if bmi is not None else None,
        "body_fat_pct": round(bf_pct, 1) if bf_pct is not None else None,
        "lean_mass_kg": lean_kg,
        "fat_mass_kg": fat_mass_kg,
        "weight_delta_7d": weight_delta_7d,
        "weight_history": weight_history,
        "ideal_weight": ideal_weight,
        "ideal_body_fat": ideal_body_fat,
    }
