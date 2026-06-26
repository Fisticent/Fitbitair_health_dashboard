import { useState } from "react";
import { lineChart, lineChartPoints, formatChartDate } from "./chartUtils";

const GRADIENTS = {
  blue: "gB",
  teal: "gT",
  coral: "gC",
};

function defaultFormatValue(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("fr-FR");
}

export function MiniSparkChart({
  values = [],
  points,
  width = 240,
  height = 70,
  pad = 8,
  color = "#5b8def",
  gradient = "blue",
  valueUnit = "",
  formatValue = defaultFormatValue,
  formatLabel = formatChartDate,
}) {
  const series = points ?? values.map((v) => ({ value: v }));
  const chartValues = series.map((p) => p.value);
  const { line, area } = lineChart(chartValues, width, height, pad);
  const coords = lineChartPoints(chartValues, width, height, pad);
  const [hover, setHover] = useState(null);
  const interactive = series.some((p) => p.date != null);

  if (!line) return null;

  const gradId = GRADIENTS[gradient] || "gB";
  const bandW = coords.length > 1 ? (width - 2 * pad) / (coords.length - 1) : width;
  const active = hover != null ? coords[hover] : null;
  const activePoint = hover != null ? series[hover] : null;
  const unitSuffix = valueUnit ? ` ${valueUnit}` : "";

  return (
    <div
      className={`lueur-spark-chart${interactive ? " lueur-spark-chart--interactive" : ""}`}
      onMouseLeave={() => setHover(null)}
    >
      {interactive && activePoint && active && (
        <div
          className="lueur-spark-tooltip"
          style={{ left: `${(active.x / width) * 100}%` }}
        >
          {activePoint.date && (
            <span className="lueur-spark-tooltip-date">{formatLabel(activePoint.date)}</span>
          )}
          <span className="lueur-spark-tooltip-value">
            {formatValue(activePoint.value)}
            {unitSuffix}
          </span>
        </div>
      )}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {interactive &&
          coords.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - bandW / 2}
              y={0}
              width={bandW}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        {active && active.value != null && !Number.isNaN(active.value) && (
          <>
            <line
              x1={active.x}
              y1={pad}
              x2={active.x}
              y2={height - pad}
              stroke={color}
              strokeWidth="1"
              strokeOpacity="0.35"
              strokeDasharray="3 3"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="4.5"
              fill={color}
              stroke="#fff"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
}

export function LargeSparkChart({
  values = [],
  width = 520,
  height = 150,
  pad = 16,
  color = "#5b8def",
  gradient = "blue",
}) {
  const { line, area } = lineChart(values, width, height, pad);
  if (!line) return null;

  const gradId = GRADIENTS[gradient] || "gB";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChartGradients() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b8def" stopOpacity="0.22" />
          <stop offset="1" stopColor="#5b8def" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gT" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15b393" stopOpacity="0.22" />
          <stop offset="1" stopColor="#15b393" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ef8a6a" stopOpacity="0.24" />
          <stop offset="1" stopColor="#ef8a6a" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
