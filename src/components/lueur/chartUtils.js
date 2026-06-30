export const COLORS = {
  TEAL: "#15b393",
  BLUE: "#5b8def",
  CORAL: "#ef8a6a",
  AMBER: "#d98a16",
  GREY: "#c5cad3",
  LBLUE: "#9cc0f5",
};

/**
 * Single source of truth: status zone → solid accent colour (rings, markers,
 * text accents). Every screen must resolve zone colours through this so a
 * tweak can't drift between cards (was duplicated/hardcoded in 7+ files).
 */
export function zoneColor(zone) {
  return (
    {
      green: COLORS.TEAL,
      yellow: COLORS.AMBER,
      red: COLORS.CORAL,
      blue: COLORS.BLUE,
      orange: COLORS.AMBER,
    }[zone] || COLORS.GREY
  );
}

/** Status zone → CSS pill/badge class suffix (`lueur-status-pill--<suffix>`). */
export function zonePill(zone) {
  return (
    {
      green: "teal",
      yellow: "amber",
      red: "coral",
      blue: "blue",
      orange: "amber",
    }[zone] || "neutral"
  );
}

const TAU = Math.PI * 2;

export function ringDash(radius, percent, drawn) {
  const c = TAU * radius;
  const o = TAU * radius * (1 - (drawn ? percent / 100 : 0));
  return { strokeDasharray: c.toFixed(1), strokeDashoffset: o.toFixed(1) };
}

export function ringDashValue(radius, value, max, drawn) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return ringDash(radius, pct, drawn);
}

export function lineChart(vals, w, h, pad) {
  if (!vals?.length) return { line: "", area: "" };
  const filtered = vals.filter((v) => v != null && !Number.isNaN(v));
  if (filtered.length < 2) return { line: "", area: "" };

  const mn = Math.min(...filtered);
  const mx = Math.max(...filtered);
  const rg = mx - mn || 1;
  const n = vals.length;
  const X = (i) => pad + ((w - 2 * pad) * i) / (n - 1);
  const Y = (v) => {
    const val = v == null || Number.isNaN(v) ? mn : v;
    return pad + (h - 2 * pad) * (1 - (val - mn) / rg);
  };

  const pts = vals.map((v, i) => ({ x: X(i), y: Y(v) }));
  const line = smoothLinePath(pts);
  const area = smoothAreaPath(pts, h - pad);
  return { line, area };
}

export function lineChartPoints(vals, w, h, pad) {
  if (!vals?.length) return [];
  const filtered = vals.filter((v) => v != null && !Number.isNaN(v));
  if (filtered.length < 2) return [];

  const mn = Math.min(...filtered);
  const mx = Math.max(...filtered);
  const rg = mx - mn || 1;
  const n = vals.length;
  const X = (i) => pad + ((w - 2 * pad) * i) / (n - 1);
  const Y = (v) => {
    const val = v == null || Number.isNaN(v) ? mn : v;
    return pad + (h - 2 * pad) * (1 - (val - mn) / rg);
  };

  return vals.map((v, i) => ({
    x: X(i),
    y: Y(v),
    value: v,
    index: i,
  }));
}

export function formatChartDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Align first/last x labels so they stay inside the chart edges. */
export function xLabelAlign(index, total) {
  if (total <= 1) return "middle";
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
}

/**
 * Pick x-axis labels that won't overlap (always keeps first & last when possible).
 * @param {Array<{ x: number, date: string }>} points sorted by x
 */
export function pickVisibleXLabels(points, width, { minGapPx } = {}) {
  if (!points?.length) return [];
  const gap = minGapPx ?? Math.max(48, width / 7);

  if (points.length <= 2) {
    return points.map((pt, i) => ({
      ...pt,
      labelAlign: xLabelAlign(i, points.length),
    }));
  }

  const picked = [{ idx: 0, pt: points[0] }];
  let lastX = points[0].x;
  const lastIdx = points.length - 1;

  for (let i = 1; i < lastIdx; i++) {
    const pt = points[i];
    if (pt.x - lastX >= gap && points[lastIdx].x - pt.x >= gap * 0.85) {
      picked.push({ idx: i, pt });
      lastX = pt.x;
    }
  }

  if (picked[picked.length - 1].idx !== lastIdx) {
    const endPt = points[lastIdx];
    if (endPt.x - lastX < gap * 0.65 && picked.length > 1) {
      picked[picked.length - 1] = { idx: lastIdx, pt: endPt };
    } else {
      picked.push({ idx: lastIdx, pt: endPt });
    }
  }

  const total = picked.length;
  return picked.map(({ pt }, i) => ({
    ...pt,
    labelAlign: xLabelAlign(i, total),
  }));
}

export function xLabelStyle(pt, width) {
  return {
    left: `${(pt.x / width) * 100}%`,
    textAlign: pt.labelAlign,
    transform:
      pt.labelAlign === "start"
        ? "translateX(0)"
        : pt.labelAlign === "end"
          ? "translateX(-100%)"
          : "translateX(-50%)",
  };
}

export function formatSleepDuration(hours) {
  if (hours == null || Number.isNaN(hours)) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}`;
}

/** Secondary line when naps contribute to the day's total sleep. */
export function formatSleepNapSubtitle(sleep) {
  if (!sleep?.naps_hours || sleep.naps_hours <= 0) return null;
  const main = sleep.main_hours ?? Math.max(0, (sleep.hours ?? 0) - sleep.naps_hours);
  return `${formatSleepDuration(main)} nuit · +${formatSleepDuration(sleep.naps_hours)} sieste`;
}

export function formatMinutes(min) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m}`;
}

/** ISO instant → heure locale courte (ex. 23:18) */
export function formatClockTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export function pctFromZ(z) {
  if (z == null || Number.isNaN(z)) return null;
  const erf = (x) => {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const y =
      1 -
      (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t *
        Math.exp(-ax * ax));
    return sign * y;
  };
  return Math.max(0, Math.min(100, Math.round(100 * 0.5 * (1 + erf(z / Math.sqrt(2))))));
}

export function recoveryContributorStatus(z) {
  return scoreStatusLabel(pctFromZ(z));
}

export function scoreStatusLabel(pct) {
  if (pct == null) return { text: "—", color: COLORS.GREY };
  if (pct >= 85) return { text: "Optimal", color: COLORS.TEAL };
  if (pct >= 70) return { text: "Bon", color: COLORS.BLUE };
  return { text: "À surveiller", color: COLORS.CORAL };
}

export function formatDateLong(iso) {
  if (!iso) return "";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

export function formatDateShort(iso) {
  if (!iso) return "";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

export function formatSyncTime(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export function weekdayShort(iso) {
  if (!iso) return "";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" });
  } catch {
    return iso.slice(8);
  }
}

export function stepsToKm(steps) {
  if (steps == null) return null;
  return Math.round((steps * 0.000762) * 10) / 10;
}

/** Fitbit distance when synced, otherwise estimate from steps (~76 cm/pas). */
export function resolveDistanceKm(steps, distanceKm) {
  if (distanceKm != null && !Number.isNaN(distanceKm)) return distanceKm;
  return stepsToKm(steps);
}

export function formatKm(km) {
  if (km == null || Number.isNaN(km)) return null;
  return km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatStepsWithKm(steps, distanceKm) {
  if (steps == null) return null;
  const pas = `${steps.toLocaleString("fr-FR")} pas`;
  const km = formatKm(resolveDistanceKm(steps, distanceKm));
  return km ? `${pas} · ${km} km` : pas;
}

/** Merge adjacent timeline chunks with the same stage (Health Connect → 1 min slices). */
function coalesceHypnoTimeline(timeline) {
  if (!timeline?.length) return [];
  const sorted = [...timeline].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    const prevLane = prev.lane ?? 2;
    const curLane = cur.lane ?? 2;
    const prevEnd = new Date(prev.end).getTime();
    const curStart = new Date(cur.start).getTime();
    const curEnd = new Date(cur.end).getTime();
    if (prevLane === curLane && curStart <= prevEnd + 60_000) {
      prev.end = new Date(Math.max(prevEnd, curEnd)).toISOString();
      continue;
    }
    merged.push({ ...cur });
  }
  return merged;
}

/** Build hypnogram rects from API stage timeline (chronological). */
export function timelineToHypnoRects(timeline, width, laneY, barH) {
  if (!timeline?.length) return { rects: [], spanMs: 0 };

  const parsed = coalesceHypnoTimeline(timeline)
    .map((seg) => ({
      ...seg,
      t0: new Date(seg.start).getTime(),
      t1: new Date(seg.end).getTime(),
      lane: seg.lane ?? 2,
    }))
    .filter((s) => !Number.isNaN(s.t0) && !Number.isNaN(s.t1) && s.t1 > s.t0);

  if (!parsed.length) return { rects: [], spanMs: 0 };

  const minT = Math.min(...parsed.map((s) => s.t0));
  const maxT = Math.max(...parsed.map((s) => s.t1));
  const spanMs = maxT - minT || 1;
  const stCol = [COLORS.GREY, COLORS.BLUE, COLORS.LBLUE, COLORS.TEAL];

  const rects = parsed.map((seg, i) => {
    const x0 = ((seg.t0 - minT) / spanMs) * width;
    const x1 = ((seg.t1 - minT) / spanMs) * width;
    const w = Math.max(1, x1 - x0);
    const lane = Math.min(3, Math.max(0, seg.lane));
    return {
      key: i,
      x: x0.toFixed(1),
      y: laneY[lane],
      w: w.toFixed(1),
      h: barH,
      color: stCol[lane],
    };
  });

  return { rects, spanMs, start: parsed[0].start, end: parsed[parsed.length - 1].end };
}

/** Fallback when timeline missing — synthetic from minute totals */
export function stagesToHypnoSegments(stages, width, laneY, barH) {
  if (!stages) return [];
  const stageOrder = [
    { key: "awake_min", idx: 0 },
    { key: "rem_min", idx: 1 },
    { key: "light_min", idx: 2 },
    { key: "deep_min", idx: 3 },
  ];
  const stCol = [COLORS.GREY, COLORS.BLUE, COLORS.LBLUE, COLORS.TEAL];
  const mins = stageOrder.map((s) => Math.max(0, stages[s.key] || 0));
  const total = mins.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  const chunk = Math.max(1, Math.floor(total / 22));
  const segs = [];
  let remaining = [...mins];
  while (remaining.some((m) => m > 0)) {
    for (let i = 0; i < 4; i++) {
      if (remaining[i] <= 0) continue;
      const take = Math.min(chunk, remaining[i]);
      segs.push([i, take]);
      remaining[i] -= take;
    }
  }

  const segTotal = segs.reduce((s, x) => s + x[1], 0);
  const sc = width / segTotal;
  let x = 0;
  return segs.map(([idx, m]) => {
    const rect = {
      x: x.toFixed(1),
      y: laneY[idx],
      w: Math.max(2, m * sc - 1.5).toFixed(1),
      h: barH,
      color: stCol[idx],
    };
    x += m * sc;
    return rect;
  });
}

/** Mean / stdev / min / max for numeric series (null-safe). */
export function seriesStats(values) {
  const nums = (values ?? []).filter((v) => v != null && !Number.isNaN(Number(v))).map(Number);
  if (!nums.length) return null;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const sd =
    nums.length > 1
      ? Math.sqrt(nums.reduce((a, b) => a + (b - avg) ** 2, 0) / nums.length)
      : 0;
  return {
    avg,
    sd: sd || 0,
    min: Math.min(...nums),
    max: Math.max(...nums),
    minIndex: nums.indexOf(Math.min(...nums)),
    maxIndex: nums.indexOf(Math.max(...nums)),
  };
}

/** Catmull-Rom style smooth SVG path through {x,y} points. */
export function smoothLinePath(points) {
  if (!points?.length) return "";
  if (points.length < 2) {
    return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Closed SVG area under a smooth curve down to baseY. */
export function smoothAreaPath(points, baseY) {
  if (!points?.length) return "";
  const line =
    points.length >= 2
      ? smoothLinePath(points)
      : `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last.x.toFixed(1)} ${baseY} L${first.x.toFixed(1)} ${baseY} Z`;
}

/** Single-letter weekday label (L M M J V S D). */
export function weekdayLetter(iso) {
  if (!iso) return "";
  const labels = ["D", "L", "M", "M", "J", "V", "S"];
  return labels[new Date(`${iso}T12:00:00`).getDay()];
}
