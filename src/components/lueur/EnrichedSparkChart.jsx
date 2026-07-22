import { useState } from "react";
import { formatChartDate, seriesStats, smoothLinePath, smoothAreaPath } from "./chartUtils";
import { useFluidChartSize } from "./useFluidChartSize";

const GRADIENTS = { blue: "gB", teal: "gT", coral: "gC" };

function sparkFormat(v, valueUnit) {
  if (v == null || Number.isNaN(v)) return "—";
  if (valueUnit === "°C") {
    const r = Math.round(v * 10) / 10;
    return `${r >= 0 ? "" : ""}${r.toFixed(1)}`;
  }
  if (valueUnit === "ms" || valueUnit === "bpm" || valueUnit === "%" || valueUnit === "/min") {
    return String(Math.round(v));
  }
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/**
 * Contextual sparkline: personal reference band (avg ± σ), average line,
 * min/max markers, and highlighted today value.
 */
export function EnrichedSparkChart({
  values = [],
  points,
  width = 280,
  height = 124,
  padL = 12,
  padR = 36,
  padT = 18,
  padB = 8,
  color = "#15b393",
  gradient = "teal",
  valueUnit = "",
  formatValue,
  formatLabel = formatChartDate,
}) {
  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize({ w: width, h: height }, 160);
  const pL = padL * s;
  const pR = padR * s;
  const pT = padT * s;
  const pB = padB * s;
  const axisFont = 10 * s;
  const markerFont = 10 * s;
  const bubbleFont = 13 * s;

  const fmt = (v) => (formatValue ? formatValue(v) : sparkFormat(v, valueUnit));
  const series = points ?? values.map((v) => ({ value: v }));
  const chartValues = series.map((p) => p.value);
  const stats = seriesStats(chartValues);
  const [hover, setHover] = useState(null);

  if (!stats || chartValues.filter((v) => v != null).length < 2) return null;

  const { avg, sd, min, max } = stats;
  const lo = avg - sd;
  const hi = avg + sd;
  const dmin = Math.min(...chartValues.filter((v) => v != null)) - Math.max(sd, 1);
  const dmax = Math.max(...chartValues.filter((v) => v != null)) + Math.max(sd, 1);
  const n = chartValues.length;
  const plotW = W - pL - pR;
  const plotH = H - pT - pB;
  const sx = (i) => pL + (plotW * i) / (n - 1);
  const sy = (v) => pT + plotH * (1 - (v - dmin) / (dmax - dmin || 1));

  const coords = chartValues.map((v, i) => ({
    x: sx(i),
    y: v != null ? sy(v) : null,
    v,
    i,
  }));
  const plotPts = coords.filter((p) => p.v != null);
  const line = smoothLinePath(plotPts);
  const area = plotPts.length ? smoothAreaPath(plotPts, H - pB) : "";

  const minPt = plotPts.find((p) => p.v === min) ?? plotPts[0];
  const maxPt = plotPts.find((p) => p.v === max) ?? plotPts[plotPts.length - 1];
  const last = plotPts[plotPts.length - 1];
  const activeIdx = hover ?? last.i;
  const active = coords[activeIdx];
  const activePoint = series[activeIdx];
  const gradId = `${GRADIENTS[gradient] || "gB"}-en`;
  const unitSuffix = valueUnit ? ` ${valueUnit}` : "";
  const bandW = n > 1 ? plotW / (n - 1) : plotW;
  const interactive = series.some((p) => p.date != null);

  return (
    <div
      ref={ref}
      className={`lueur-spark-chart lueur-spark-chart--enriched${interactive ? " lueur-spark-chart--interactive" : ""}`}
      style={{ maxWidth: width, width: "100%" }}
      onMouseLeave={() => setHover(null)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHover(null);
      }}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "img" : undefined}
      aria-label={
        interactive
          ? `Courbe interactive, ${n} points. Flèches pour parcourir, toucher pour sélectionner.`
          : undefined
      }
      onKeyDown={(e) => {
        if (!interactive || !n) return;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const cur = hover ?? last.i;
          const next =
            e.key === "ArrowRight" ? Math.min(n - 1, cur + 1) : Math.max(0, cur - 1);
          setHover(next);
        } else if (e.key === "Escape") {
          setHover(null);
        }
      }}
    >
      {interactive && activePoint && active?.v != null && hover != null && (
        <div className="lueur-spark-tooltip" style={{ left: `${(active.x / W) * 100}%` }}>
          {activePoint.date && (
            <span className="lueur-spark-tooltip-date">{formatLabel(activePoint.date)}</span>
          )}
          <span className="lueur-spark-tooltip-value">
            {fmt(activePoint.value)}
            {unitSuffix}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-spark-chart-svg" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.16" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x={pL}
          y={sy(hi)}
          width={plotW}
          height={Math.max(0, sy(lo) - sy(hi))}
          fill={color}
          fillOpacity="0.08"
          rx={3 * s}
        />
        <line
          x1={pL}
          y1={sy(avg)}
          x2={W - pR}
          y2={sy(avg)}
          stroke={color}
          strokeWidth={1 * s}
          strokeDasharray="3 4"
          strokeOpacity="0.5"
        />
        <text x={W - pR + 4 * s} y={sy(hi) + 4 * s} fontSize={axisFont} fill="var(--lueur-muted)" fontFamily="var(--lueur-mono)">
          {fmt(hi)}
        </text>
        <text x={W - pR + 4 * s} y={sy(lo) + 4 * s} fontSize={axisFont} fill="var(--lueur-muted)" fontFamily="var(--lueur-mono)">
          {fmt(lo)}
        </text>
        <text x={W - pR + 4 * s} y={sy(avg) + 4 * s} fontSize={axisFont} fill={color} fontFamily="var(--lueur-mono)">
          moy
        </text>
        {area && <path d={area} fill={`url(#${gradId})`} />}
        {line && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth={2.4 * s}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {minPt && minPt !== last && (
          <>
            <circle cx={minPt.x} cy={minPt.y} r={3 * s} fill="#fff" stroke="#c5cad3" strokeWidth={1.6 * s} />
            <text
              x={minPt.x}
              y={minPt.y + 14 * s}
              textAnchor="middle"
              fontSize={markerFont}
              fill="var(--lueur-muted)"
              fontFamily="var(--lueur-mono)"
            >
              {fmt(minPt.v)}
            </text>
          </>
        )}
        {maxPt && maxPt !== last && maxPt !== minPt && (
          <>
            <circle cx={maxPt.x} cy={maxPt.y} r={3 * s} fill="#fff" stroke="#c5cad3" strokeWidth={1.6 * s} />
            <text
              x={maxPt.x}
              y={maxPt.y - 8 * s}
              textAnchor="middle"
              fontSize={markerFont}
              fill="var(--lueur-muted)"
              fontFamily="var(--lueur-mono)"
            >
              {fmt(maxPt.v)}
            </text>
          </>
        )}
        {last && (
          <>
            <line
              x1={last.x}
              y1={pT}
              x2={last.x}
              y2={H - pB}
              stroke={color}
              strokeWidth={1 * s}
              strokeOpacity="0.25"
            />
            <circle cx={last.x} cy={last.y} r={5 * s} fill={color} stroke="#fff" strokeWidth={2.5 * s} />
            <g transform={`translate(${Math.max(pL, last.x - 58 * s)}, ${Math.max(pT, last.y - 28 * s)})`}>
              <rect x="0" y="0" width={56 * s} height={26 * s} rx={7 * s} fill="#15171c" />
              <text x={8 * s} y={17 * s} fontSize={bubbleFont} fontWeight="600" fill="#fff" fontFamily="var(--lueur-sans)">
                {fmt(last.v)}
                {unitSuffix}
              </text>
            </g>
          </>
        )}
        {interactive &&
          coords.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - bandW / 2}
              y={0}
              width={bandW}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                setHover(i);
              }}
            />
          ))}
      </svg>
    </div>
  );
}
