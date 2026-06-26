export const COLORS = {
  TEAL: "#15b393",
  BLUE: "#5b8def",
  CORAL: "#ef8a6a",
  GREY: "#c5cad3",
  LBLUE: "#9cc0f5",
};

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

  let d = `M${X(0).toFixed(1)} ${Y(vals[0]).toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    d += ` L${X(i).toFixed(1)} ${Y(vals[i]).toFixed(1)}`;
  }
  const a = `${d} L${X(n - 1).toFixed(1)} ${(h - pad).toFixed(1)} L${X(0).toFixed(1)} ${(h - pad).toFixed(1)} Z`;
  return { line: d, area: a };
}

/** Coordinates for each point (for hover tooltips). */
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

export function formatSleepDuration(hours) {
  if (hours == null || Number.isNaN(hours)) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}`;
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

/** Build hypnogram rects from API stage timeline (chronological). */
export function timelineToHypnoRects(timeline, width, laneY, barH) {
  if (!timeline?.length) return { rects: [], spanMs: 0 };

  const parsed = timeline
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
    const w = Math.max(2, x1 - x0 - 1);
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
