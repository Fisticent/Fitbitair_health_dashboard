import { LueurMetricLabel } from "./LueurInfoTip";
import { formatMetricValue, formatDeltaAbs } from "../../utils/formatMetric";
import { MONITOR_STATUS } from "../../utils/metricStatus";
import { zoneColor } from "./chartUtils";
import { VitalPositionBar } from "./VitalPositionBar";

const BADGE_CLASS = {
  green: "green",
  yellow: "yellow",
  red: "red",
};

function monitorTipId(name) {
  const map = {
    VFC: "hrv",
    "FC repos": "rhr",
    Respiration: "Respiration",
    "SpO₂": "spo2",
    "Temp. peau": "skin_temp",
  };
  return map[name] ?? null;
}

function monitorDeltaUnit(unit) {
  if (unit === "ms") return " ms";
  if (unit === "bpm") return " bpm";
  if (unit === "/min") return "/min";
  if (unit === "%") return "%";
  return unit ? ` ${unit}` : "";
}

function formatDeltaCell(metric) {
  const { value, baseline, unit, name, delta: rawDelta } = metric;
  if (value == null || baseline == null) return "—";

  const delta = rawDelta != null ? rawDelta : value - baseline;
  const pct = baseline ? Math.round((delta / baseline) * 100) : 0;
  const sign = delta >= 0 ? "+" : "";

  return `${sign}${formatDeltaAbs(name, delta)}${monitorDeltaUnit(unit)} (${sign}${pct}%)`;
}

function MonitorMetric({ metric }) {
  const { name, value, unit, baseline, status } = metric;
  const monitorStatus = MONITOR_STATUS[status] || MONITOR_STATUS.normal;
  const tipId = monitorTipId(name);
  const displayUnit = unit === "/min" ? "/min" : unit;
  const tone = status === "alert" ? "alert" : status === "warning" ? "warning" : "normal";

  return (
    <article className={`lueur-monitor-metric lueur-monitor-metric--${tone}`}>
      <header className="lueur-monitor-metric-head">
        <div className="lueur-monitor-name-wrap">
          <span
            className="lueur-monitor-dot"
            style={{ background: zoneColor(monitorStatus.zone) }}
            aria-hidden="true"
          />
          {tipId ? (
            <LueurMetricLabel id={tipId} as="h3" className="lueur-monitor-name">
              {name}
            </LueurMetricLabel>
          ) : (
            <h3 className="lueur-monitor-name">{name}</h3>
          )}
        </div>
        <span
          className={`lueur-stat-badge lueur-stat-badge--${BADGE_CLASS[monitorStatus.zone] || "neutral"}`}
        >
          {monitorStatus.label}
        </span>
      </header>

      <div className="lueur-monitor-metric-body">
        <div className="lueur-monitor-metric-values">
          <p className="lueur-monitor-metric-primary">
            <span className="lueur-monitor-value">{formatMetricValue(name, value)}</span>
            {value != null && displayUnit && (
              <span className="lueur-monitor-unit">{displayUnit}</span>
            )}
          </p>
          <p className="lueur-monitor-metric-meta">
            médiane 30 j{" "}
            <strong>{baseline != null ? formatMetricValue(name, baseline) : "—"}</strong>
            <span className="lueur-monitor-metric-sep" aria-hidden="true">
              ·
            </span>
            <span>{formatDeltaCell(metric)}</span>
          </p>
        </div>
        <div className="lueur-monitor-metric-bar">
          <VitalPositionBar metric={metric} statusZone={monitorStatus.zone} />
        </div>
      </div>
    </article>
  );
}

export function HealthMonitorPanel({ metrics }) {
  if (!metrics?.length) {
    return <p className="lueur-meta">Aucune donnée moniteur pour ce jour.</p>;
  }

  const normalCount = metrics.filter((m) => m.status === "normal").length;

  return (
    <div className="lueur-monitor-panel">
      <div className="lueur-monitor-table-head">
        <div>
          <LueurMetricLabel id="health_monitor" as="p" className="lueur-label lueur-card-section-label">
            Moniteur santé
          </LueurMetricLabel>
          <p className="lueur-meta lueur-monitor-table-sub">
            Vitaux vs ta médiane personnelle · 30 jours
          </p>
        </div>
        <p className="lueur-monitor-table-summary">
          <strong>
            {normalCount}/{metrics.length}
          </strong>{" "}
          dans ta norme
        </p>
      </div>

      <div className="lueur-monitor-list" role="list">
        {metrics.map((m) => (
          <div key={m.name} role="listitem">
            <MonitorMetric metric={m} />
          </div>
        ))}
      </div>

      <div className="lueur-monitor-legend" aria-hidden="true">
        <span className="lueur-monitor-legend-item">
          <span className="lueur-monitor-legend-norm" />
          zone de norme
        </span>
        <span className="lueur-monitor-legend-item">
          <span className="lueur-monitor-legend-avg" />
          ta médiane
        </span>
        <span className="lueur-monitor-legend-item">
          <span className="lueur-monitor-legend-dot" />
          valeur actuelle
        </span>
      </div>
    </div>
  );
}
