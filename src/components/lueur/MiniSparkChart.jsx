import { useState } from "react";
import { lineChart, lineChartPoints, formatChartDate } from "./chartUtils";
import { EnrichedSparkChart } from "./EnrichedSparkChart";
import { useFluidChartSize } from "./useFluidChartSize";

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
  enriched = false,
}) {
  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize({ w: width, h: height }, 140);

  if (enriched) {
    return (
      <EnrichedSparkChart
        values={values}
        points={points}
        width={width}
        height={height}
        color={color}
        gradient={gradient}
        valueUnit={valueUnit}
        formatValue={formatValue}
        formatLabel={formatLabel}
      />
    );
  }

  const p = pad * s;
  const series = points ?? values.map((v) => ({ value: v }));
  const chartValues = series.map((item) => item.value);
  const { line, area } = lineChart(chartValues, W, H, p);
  const coords = lineChartPoints(chartValues, W, H, p);
  const [hover, setHover] = useState(null);
  const interactive = series.some((item) => item.date != null);

  if (!line) return null;

  const gradId = GRADIENTS[gradient] || "gB";
  const bandW = coords.length > 1 ? (W - 2 * p) / (coords.length - 1) : W;
  const active = hover != null ? coords[hover] : null;
  const activePoint = hover != null ? series[hover] : null;
  const unitSuffix = valueUnit ? ` ${valueUnit}` : "";

  return (
    <div
      ref={ref}
      className={`lueur-spark-chart${interactive ? " lueur-spark-chart--interactive" : ""}`}
      style={{ maxWidth: width, width: "100%" }}
      onMouseLeave={() => setHover(null)}
    >
      {interactive && activePoint && active && (
        <div className="lueur-spark-tooltip" style={{ left: `${(active.x / W) * 100}%` }}>
          {activePoint.date && (
            <span className="lueur-spark-tooltip-date">{formatLabel(activePoint.date)}</span>
          )}
          <span className="lueur-spark-tooltip-value">
            {formatValue(activePoint.value)}
            {unitSuffix}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-spark-chart-svg" aria-hidden="true">
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.4 * s}
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
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        {active && active.value != null && !Number.isNaN(active.value) && (
          <>
            <line
              x1={active.x}
              y1={p}
              x2={active.x}
              y2={H - p}
              stroke={color}
              strokeWidth={1 * s}
              strokeOpacity="0.35"
              strokeDasharray="3 3"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={4.5 * s}
              fill={color}
              stroke="#fff"
              strokeWidth={2 * s}
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
  valueUnit = "",
  enriched = false,
}) {
  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize({ w: width, h: height }, 280);

  if (enriched) {
    return (
      <EnrichedSparkChart
        values={values}
        width={width}
        height={height}
        color={color}
        gradient={gradient}
        valueUnit={valueUnit}
      />
    );
  }

  const p = pad * s;
  const { line, area } = lineChart(values, W, H, p);
  if (!line) return null;

  const gradId = GRADIENTS[gradient] || "gB";

  return (
    <div ref={ref} className="lueur-chart-fluid-wrap" style={{ maxWidth: width, width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-spark-chart-svg" aria-hidden="true">
        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5 * s}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
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
