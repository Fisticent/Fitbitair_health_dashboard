import { useMemo, useState } from "react";
import { COLORS, formatChartDate, pickVisibleXLabels, xLabelStyle, smoothLinePath, smoothAreaPath } from "./chartUtils";
import { seriesBaseline } from "../../utils/comparisons";
import { useFluidChartSize } from "./useFluidChartSize";

const COLOR = COLORS.BLUE;
const GRAD_ID = "lueurWeightGrad";
const CHART_W = 520;
const CHART_H = 204;
const INDEX_X_MAX_POINTS = 12;

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const step = Math.max(0.25, Math.ceil((span / count) * 4) / 4);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step * 0.01; v += step) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks.length ? ticks : [min, max];
}

function formatKg(v) {
  if (v == null) return "—";
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

export function LueurWeightChart({
  series = [],
  activeWeightDate,
  height = CHART_H,
  width = CHART_W,
}) {
  const [hover, setHover] = useState(null);
  const { ref, vw, vh, scale: s } = useFluidChartSize({ w: width, h: height }, 280);

  const layout = useMemo(() => {
    const pad = { t: 16 * s, r: 16 * s, b: 10 * s, l: 48 * s };
    const xInset = 20 * s;
    const innerW = vw - pad.l - pad.r;
    const innerH = vh - pad.t - pad.b;

    const rows = series
      .filter((d) => d.value != null && d.date)
      .map((d) => ({
        date: d.date,
        value: d.value,
        t: new Date(`${d.date}T12:00:00`).getTime(),
      }))
      .sort((a, b) => a.t - b.t);

    if (rows.length < 2) return null;

    const weights = rows.map((r) => r.value);
    const rawMin = Math.min(...weights);
    const rawMax = Math.max(...weights);
    const yPad = Math.max(0.5, (rawMax - rawMin) * 0.18 || 0.6);
    const yMin = rawMin - yPad;
    const yMax = rawMax + yPad;
    const yTicks = niceTicks(yMin, yMax, 3);

    const tMin = rows[0].t;
    const tMax = rows[rows.length - 1].t;
    const tSpan = tMax - tMin || 1;

    const plotW = innerW - xInset * 2;
    const indexScale = rows.length <= INDEX_X_MAX_POINTS;
    const xOf = (r, i) => {
      if (indexScale) {
        return pad.l + xInset + (plotW * i) / Math.max(rows.length - 1, 1);
      }
      return pad.l + xInset + (plotW * (r.t - tMin)) / tSpan;
    };
    const yOf = (v) => pad.t + innerH * (1 - (v - yMin) / (yMax - yMin || 1));

    const coords = rows.map((r, i) => ({
      ...r,
      i,
      x: xOf(r, i),
      y: yOf(r.value),
      isActive: activeWeightDate === r.date,
    }));

    const linePts = coords.map((c) => ({ x: c.x, y: c.y }));
    const line = smoothLinePath(linePts);
    const baseY = pad.t + innerH;
    const area = smoothAreaPath(linePts, baseY);

    const avg =
      seriesBaseline(
        rows.map((r) => ({ weight: r.value })),
        "weight",
      ) ?? null;
    const avgY = avg != null ? yOf(avg) : null;

    return { pad, innerH, innerW, coords, line, area, yTicks, yOf, avg, avgY, baseY, bleed: { t: 8 * s, b: 10 * s, l: 6 * s, r: 4 * s } };
  }, [series, activeWeightDate, vw, vh, s]);

  const xLabels = useMemo(
    () => (layout ? pickVisibleXLabels(layout.coords, vw) : []),
    [layout, vw],
  );

  if (!layout) return null;

  const { pad, coords, line, area, yTicks, yOf, avg, avgY, baseY, bleed } = layout;
  const active = hover != null ? coords[hover] : null;
  const hitW = layout.innerW / Math.max(coords.length - 1, 1);

  return (
    <div className="lueur-weight-chart-panel">
      <div
        ref={ref}
        className="lueur-weight-chart"
        onMouseLeave={() => setHover(null)}
      >
        {avg != null && (
          <div className="lueur-weight-chart-avg-pill">Moy. {formatKg(avg)} kg</div>
        )}

        {active && (
          <div
            className="lueur-spark-tooltip"
            style={{ left: `${(active.x / vw) * 100}%` }}
          >
            <span className="lueur-spark-tooltip-date">{formatChartDate(active.date)}</span>
            <span className="lueur-spark-tooltip-value">{formatKg(active.value)} kg</span>
            {active.isActive && (
              <span className="lueur-weight-chart-active-tag">Pesée active</span>
            )}
          </div>
        )}

        <svg
          viewBox={`${-bleed.l} ${-bleed.t} ${vw + bleed.l + bleed.r} ${vh + bleed.t + bleed.b}`}
          width="100%"
          className="lueur-weight-chart-svg lueur-chart-fluid-svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={COLOR} stopOpacity="0.16" />
              <stop offset="1" stopColor={COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          <rect
            x={pad.l}
            y={pad.t}
            width={vw - pad.l - pad.r}
            height={baseY - pad.t}
            rx={10 * s}
            fill="#f8f9fb"
          />

          {yTicks.map((tick) => {
            const y = yOf(tick);
            return (
              <g key={tick}>
                <line
                  x1={pad.l + 4 * s}
                  y1={y}
                  x2={vw - pad.r}
                  y2={y}
                  stroke="#e8eaee"
                  strokeWidth={1 * s}
                />
                <text
                  x={pad.l - 10 * s}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="lueur-weight-chart-axis"
                >
                  {formatKg(tick)}
                </text>
              </g>
            );
          })}

          {avg != null && avgY != null && (
            <line
              x1={pad.l + 4 * s}
              y1={avgY}
              x2={vw - pad.r}
              y2={avgY}
              stroke={COLOR}
              strokeWidth={1 * s}
              strokeOpacity="0.4"
              strokeDasharray="5 5"
            />
          )}

          <path d={area} fill={`url(#${GRAD_ID})`} />
          <path
            d={line}
            fill="none"
            stroke={COLOR}
            strokeWidth={2.4 * s}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {coords.map((pt, i) => (
            <rect
              key={`hit-${pt.date}`}
              x={pt.x - hitW / 2}
              y={pad.t}
              width={hitW}
              height={baseY - pad.t}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                setHover(i);
              }}
            />
          ))}

          {coords.map((pt) => (
            <circle
              key={pt.date}
              cx={pt.x}
              cy={pt.y}
              r={pt.isActive ? 5.5 * s : hover === pt.i ? 5 * s : 4 * s}
              fill={pt.isActive ? COLORS.TEAL : COLOR}
              stroke="#fff"
              strokeWidth={2 * s}
            />
          ))}

          {active && (
            <line
              x1={active.x}
              y1={pad.t}
              x2={active.x}
              y2={baseY}
              stroke={COLOR}
              strokeWidth={1 * s}
              strokeOpacity="0.28"
              strokeDasharray="3 3"
            />
          )}
        </svg>

        <div className="lueur-weight-chart-xlabels" aria-hidden="true">
          {xLabels.map((pt) => (
            <span
              key={pt.date}
              className="lueur-weight-chart-xlabel"
              style={xLabelStyle(pt, vw)}
            >
              {formatChartDate(pt.date)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
