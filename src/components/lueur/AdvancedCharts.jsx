import { COLORS } from "./chartUtils";

const AMBER = "#d98a16";
const SLEEP = "#8b7fd4";
const INK = "#2b2f37";

function clock(min) {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

/** One vertical bar per night, from bedtime (top) to wake (bottom). Aligned
 *  bars = regular schedule; staggered bars = irregular. */
export function SleepWindowChart({ series, avgBed, avgWake }) {
  if (!series?.length) return null;
  const VW = 520;
  const VH = 150;
  const pad = { t: 14, r: 14, b: 8, l: 42 };
  const plotW = VW - pad.l - pad.r;
  const plotH = VH - pad.t - pad.b;
  const beds = series.map((s) => s.bed_min);
  const wakes = series.map((s) => s.wake_min);
  const lo = Math.min(...beds) - 15;
  const hi = Math.max(...wakes) + 15;
  const y = (t) => pad.t + (plotH * (t - lo)) / (hi - lo || 1);
  const n = series.length;
  const step = plotW / n;
  const barW = Math.min(16, step * 0.55);
  const ticks = [lo, lo + (hi - lo) / 3, lo + (2 * (hi - lo)) / 3, hi];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block" }} aria-hidden="true">
      <rect x={pad.l} y={pad.t} width={plotW} height={plotH} rx="10" fill="#f8f9fb" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={VW - pad.r} y2={y(t)} stroke="#e8eaee" strokeWidth="1" />
          <text x={pad.l - 7} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#9aa0ab" fontFamily="var(--lueur-mono)">
            {clock(t)}
          </text>
        </g>
      ))}
      {avgBed != null && (
        <line x1={pad.l} y1={y(avgBed)} x2={VW - pad.r} y2={y(avgBed)} stroke={SLEEP} strokeDasharray="4 4" strokeOpacity="0.5" />
      )}
      {avgWake != null && (
        <line x1={pad.l} y1={y(avgWake)} x2={VW - pad.r} y2={y(avgWake)} stroke={SLEEP} strokeDasharray="4 4" strokeOpacity="0.5" />
      )}
      {series.map((s, i) => {
        const cx = pad.l + step * (i + 0.5);
        const yb = y(s.bed_min);
        const yw = y(s.wake_min);
        return (
          <rect key={s.date} x={cx - barW / 2} y={yb} width={barW} height={Math.max(3, yw - yb)} rx={barW / 2} fill={SLEEP} fillOpacity="0.85" />
        );
      })}
    </svg>
  );
}

/** ACWR ratio over colored zones: blue = under-load, teal = safe (0.8–1.3),
 *  amber = caution (1.3–1.5), coral = overload (>1.5). */
export function LoadBalanceChart({ series }) {
  if (!series?.length) return null;
  const VW = 520;
  const VH = 150;
  const pad = { t: 14, r: 14, b: 8, l: 34 };
  const plotW = VW - pad.l - pad.r;
  const plotH = VH - pad.t - pad.b;
  const ratios = series.map((s) => s.ratio);
  const lo = 0.4;
  const hi = Math.max(1.6, Math.max(...ratios) + 0.15);
  const y = (r) => pad.t + plotH * (1 - (Math.max(lo, Math.min(hi, r)) - lo) / (hi - lo || 1));
  const n = series.length;
  const step = plotW / Math.max(n - 1, 1);
  const x = (i) => pad.l + step * i;

  const band = (r1, r2, fill, op) => {
    const yA = y(Math.min(r2, hi));
    const yB = y(Math.max(r1, lo));
    return <rect x={pad.l} y={yA} width={plotW} height={Math.max(0, yB - yA)} fill={fill} fillOpacity={op} />;
  };

  const line = ratios.map((r, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(r).toFixed(1)}`).join(" ");
  const yTicks = [0.8, 1.0, 1.3, 1.5].filter((t) => t >= lo && t <= hi);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: "block" }} aria-hidden="true">
      <rect x={pad.l} y={pad.t} width={plotW} height={plotH} rx="10" fill="#f8f9fb" />
      {band(lo, 0.8, COLORS.BLUE, 0.07)}
      {band(0.8, 1.3, COLORS.TEAL, 0.14)}
      {band(1.3, 1.5, AMBER, 0.14)}
      {band(1.5, hi, COLORS.CORAL, 0.14)}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={pad.l}
            y1={y(t)}
            x2={VW - pad.r}
            y2={y(t)}
            stroke={t === 1.0 ? "#b9bec7" : "#e1e4e9"}
            strokeWidth="1"
            strokeDasharray={t === 1.0 ? "4 4" : undefined}
          />
          <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#9aa0ab" fontFamily="var(--lueur-mono)">
            {t.toFixed(1)}
          </text>
        </g>
      ))}
      <path d={line} fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {ratios.map((r, i) => (
        <circle key={series[i].date} cx={x(i)} cy={y(r)} r={i === n - 1 ? 4 : 2.6} fill={INK} stroke="#fff" strokeWidth="1.4" />
      ))}
    </svg>
  );
}
