import { useMemo, useState } from "react";
import { COLORS, formatChartDate } from "./chartUtils";
import { seriesBaseline } from "../../utils/comparisons";

const COLOR = COLORS.BLUE;
const GRAD_ID = "lueurWeightGrad";
const CHART_W = 520;
const CHART_H = 168;

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

function xLabelAlign(index, total) {
  if (index === 0) return "start";
  if (index === total - 1) return "end";
  return "middle";
}

export function LueurWeightChart({
  series = [],
  activeWeightDate,
  height = CHART_H,
  width = CHART_W,
}) {
  const [hover, setHover] = useState(null);

  const layout = useMemo(() => {
    const pad = { t: 12, r: 16, b: 8, l: 44 };
    const xInset = 20;
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;

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
    const xOf = (t) => pad.l + xInset + (plotW * (t - tMin)) / tSpan;
    const yOf = (v) => pad.t + innerH * (1 - (v - yMin) / (yMax - yMin || 1));

    const coords = rows.map((r, i) => ({
      ...r,
      i,
      x: xOf(r.t),
      y: yOf(r.value),
      isActive: activeWeightDate === r.date,
      labelAlign: xLabelAlign(i, rows.length),
    }));

    let line = `M${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      line += ` L${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
    }

    const baseY = pad.t + innerH;
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${baseY} L${coords[0].x.toFixed(1)} ${baseY} Z`;

    const avg =
      seriesBaseline(
        rows.map((r) => ({ weight: r.value })),
        "weight",
      ) ?? null;
    const avgY = avg != null ? yOf(avg) : null;

    return { pad, innerH, innerW, coords, line, area, yTicks, yOf, avg, avgY, baseY };
  }, [series, activeWeightDate, width, height]);

  if (!layout) return null;

  const { pad, coords, line, area, yTicks, yOf, avg, avgY, baseY } = layout;
  const active = hover != null ? coords[hover] : null;
  const hitW = layout.innerW / Math.max(coords.length - 1, 1);

  return (
    <div className="lueur-weight-chart-panel">
      <div
        className="lueur-weight-chart"
        onMouseLeave={() => setHover(null)}
        style={{ "--chart-plot-h": `${height}px` }}
      >
        {avg != null && (
          <div className="lueur-weight-chart-avg-pill">Moy. {formatKg(avg)} kg</div>
        )}

        {active && (
          <div
            className="lueur-spark-tooltip"
            style={{ left: `${(active.x / width) * 100}%` }}
          >
            <span className="lueur-spark-tooltip-date">{formatChartDate(active.date)}</span>
            <span className="lueur-spark-tooltip-value">{formatKg(active.value)} kg</span>
            {active.isActive && (
              <span className="lueur-weight-chart-active-tag">Pesée active</span>
            )}
          </div>
        )}

        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="lueur-weight-chart-svg"
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
            width={width - pad.l - pad.r}
            height={baseY - pad.t}
            rx="10"
            fill="#f8f9fb"
          />

          {yTicks.map((tick) => {
            const y = yOf(tick);
            return (
              <g key={tick}>
                <line
                  x1={pad.l + 4}
                  y1={y}
                  x2={width - pad.r}
                  y2={y}
                  stroke="#e8eaee"
                  strokeWidth="1"
                />
                <text
                  x={pad.l - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="lueur-weight-chart-axis"
                >
                  {formatKg(tick)}
                </text>
              </g>
            );
          })}

          {avg != null && avgY != null && (
            <line
              x1={pad.l + 4}
              y1={avgY}
              x2={width - pad.r}
              y2={avgY}
              stroke={COLOR}
              strokeWidth="1"
              strokeOpacity="0.4"
              strokeDasharray="5 5"
            />
          )}

          <path d={area} fill={`url(#${GRAD_ID})`} />
          <path
            d={line}
            fill="none"
            stroke={COLOR}
            strokeWidth="2.4"
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
            />
          ))}

          {coords.map((pt) => (
            <circle
              key={pt.date}
              cx={pt.x}
              cy={pt.y}
              r={pt.isActive ? 5.5 : hover === pt.i ? 5 : 4}
              fill={pt.isActive ? COLORS.TEAL : COLOR}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}

          {active && (
            <line
              x1={active.x}
              y1={pad.t}
              x2={active.x}
              y2={baseY}
              stroke={COLOR}
              strokeWidth="1"
              strokeOpacity="0.28"
              strokeDasharray="3 3"
            />
          )}
        </svg>

        <div className="lueur-weight-chart-xlabels" aria-hidden="true">
          {coords.map((pt) => (
            <span
              key={pt.date}
              className="lueur-weight-chart-xlabel"
              style={{
                left: `${(pt.x / width) * 100}%`,
                textAlign: pt.labelAlign,
                transform:
                  pt.labelAlign === "start"
                    ? "translateX(0)"
                    : pt.labelAlign === "end"
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {formatChartDate(pt.date)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
