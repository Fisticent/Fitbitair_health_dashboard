/**
 * Compare a metric to its period baseline and previous day.
 */
export function metricComparison(history, key, focusDate, { lowerIsBetter = false } = {}) {
  const rows = history.filter((d) => d[key] != null && d[key] !== undefined);
  if (!rows.length) return null;

  const todayRow = rows.find((d) => d.date === focusDate) ?? rows[rows.length - 1];
  const value = todayRow[key];
  if (value == null) return null;

  const baseline = rows.reduce((s, d) => s + d[key], 0) / rows.length;
  const idx = rows.findIndex((d) => d.date === todayRow.date);
  const yesterday = idx > 0 ? rows[idx - 1][key] : null;
  const deltaPct = baseline ? ((value - baseline) / baseline) * 100 : 0;
  const deltaAbs = yesterday != null ? value - yesterday : null;

  const favorable = lowerIsBetter ? value <= baseline : value >= baseline;

  return {
    value,
    baseline: round(baseline, key),
    deltaPct: round(deltaPct, 1),
    deltaAbs: deltaAbs != null ? round(deltaAbs, key) : null,
    yesterday,
    favorable,
    periodDays: rows.length,
  };
}

function round(n, key) {
  if (key === "recovery" || key === "sleep" || key === "strain" || key === "stress") {
    return Math.round(n * 10) / 10;
  }
  if (key === "hrv" || key === "rhr" || key === "steps") {
    return Math.round(n);
  }
  return Math.round(n * 10) / 10;
}

export function formatDelta(comparison, { unit = "", showBaseline = false } = {}) {
  if (!comparison) return null;
  const sign = comparison.deltaPct >= 0 ? "+" : "";
  const parts = [`${sign}${comparison.deltaPct}% vs moy. ${comparison.periodDays}j`];
  if (comparison.deltaAbs != null) {
    const dSign = comparison.deltaAbs >= 0 ? "+" : "";
    parts.push(`${dSign}${comparison.deltaAbs}${unit} vs hier`);
  }
  if (showBaseline) {
    parts.push(`moy. ${comparison.baseline}${unit}`);
  }
  return parts.join(" · ");
}

export function buildChartRows(history, keys) {
  return history.map((d) => {
    const row = { date: d.date, label: d.date.slice(8) };
    keys.forEach((k) => {
      row[k] = d[k] ?? null;
    });
    return row;
  });
}

export function seriesBaseline(history, key) {
  const vals = history.map((d) => d[key]).filter((v) => v != null);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return round(avg, key);
}
