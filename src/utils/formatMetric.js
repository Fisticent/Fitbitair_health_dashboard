/** Format health metric values for display (no float noise). */
export function formatMetricValue(name, value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);

  const key = (name || "").toLowerCase();
  if (key.includes("hrv") || key.includes("vfc")) return String(Math.round(n));
  if (key.includes("repos") || key.includes("rhr") || key.includes("fc repos")) {
    return String(Math.round(n));
  }
  if (key.includes("resp")) return String(Math.round(n));
  if (key.includes("spo")) return String(Math.round(n));
  if (key.includes("poids") || key.includes("weight")) return n.toFixed(1);
  if (key.includes("body fat") || key.includes("fat")) return n.toFixed(1);

  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString();
}

/** Format a delta (value − baseline) without float artifacts. */
export function formatDeltaAbs(name, delta) {
  if (delta == null || delta === "") return "—";
  const n = Number(delta);
  if (Number.isNaN(n)) return String(delta);

  const key = (name || "").toLowerCase();
  if (
    key.includes("hrv") ||
    key.includes("vfc") ||
    key.includes("repos") ||
    key.includes("rhr") ||
    key.includes("fc") ||
    key.includes("resp") ||
    key.includes("spo")
  ) {
    return String(Math.round(n));
  }
  if (key.includes("poids") || key.includes("weight") || key.includes("fat")) {
    return (Math.round(n * 10) / 10).toString();
  }

  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
