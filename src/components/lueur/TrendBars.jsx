import { useEffect, useState } from "react";
import { COLORS, weekdayShort, formatChartDate } from "./chartUtils";

export function TrendBars({
  data = [],
  valueKey = "value",
  height = 118,
  gap = 12,
  highlightLast = true,
  color = COLORS.TEAL,
  inactiveColor = "#cdd6e2",
  maxValue = 100,
  valueUnit = "%",
  formatValue = (v) => Math.round(v),
  formatDate = formatChartDate,
  interactive = true,
}) {
  const [drawn, setDrawn] = useState(false);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [data]);

  if (!data.length) return <p className="lueur-mono-meta">Aucune tendance disponible</p>;

  const active = hover != null ? data[hover] : null;
  const activeVal = active?.[valueKey] ?? 0;
  const tooltipText =
    active?.tooltip ??
    `${formatValue(activeVal)}${valueUnit ? ` ${valueUnit.trim()}` : ""}`.trim();

  return (
    <div
      className={`lueur-trend-bars${interactive ? " lueur-trend-bars--interactive" : ""}`}
      style={{ height, gap }}
      onMouseLeave={() => setHover(null)}
    >
      {interactive && active && (
        <div
          className="lueur-spark-tooltip"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
        >
          {active.date && (
            <span className="lueur-spark-tooltip-date">{formatDate(active.date)}</span>
          )}
          <span className="lueur-spark-tooltip-value">{tooltipText}</span>
        </div>
      )}

      {data.map((d, i) => {
        const val = d[valueKey] ?? 0;
        const isLast = i === data.length - 1;
        const barH =
          drawn && maxValue > 0 ? Math.min(100, (val / maxValue) * 100) : 0;
        const bg = highlightLast && isLast ? color : inactiveColor;
        const isHover = hover === i;

        return (
          <div
            key={d.date || d.label || i}
            className={`lueur-trend-col${isHover ? " is-hover" : ""}`}
            onMouseEnter={() => interactive && setHover(i)}
          >
            <div className="lueur-trend-bar-wrap">
              <div
                className="lueur-trend-bar"
                style={{ height: `${barH}%`, background: bg }}
              />
            </div>
            <span className="lueur-mono-meta" style={{ textAlign: "center" }}>
              {d.label || weekdayShort(d.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function recoveryTrendFromHistory(history) {
  return (history || []).slice(-7).map((d) => ({
    date: d.date,
    value: d.recovery ?? 0,
    label: weekdayShort(d.date),
  }));
}

export function recoveryTrendAvg(history) {
  const slice = (history || []).slice(-7);
  if (!slice.length) return null;
  const sum = slice.reduce((a, d) => a + (d.recovery ?? 0), 0);
  return Math.round(sum / slice.length);
}
