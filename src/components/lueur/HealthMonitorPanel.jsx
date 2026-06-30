import { LueurMetricLabel } from "./LueurInfoTip";
import { formatMetricValue, formatDeltaAbs } from "../../utils/formatMetric";
import { MONITOR_STATUS } from "../../utils/metricStatus";
import { zoneColor } from "./chartUtils";
import { VitalPositionBar } from "./VitalPositionBar";

const ROW_STATUS = {
  normal: "normal",
  warning: "warning",
  alert: "alert",
};

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
  const { value, baseline, unit, name } = metric;
  if (value == null || baseline == null) return "—";

  const delta = value - baseline;
  const pct = baseline ? Math.round((delta / baseline) * 100) : 0;
  const sign = delta >= 0 ? "+" : "";

  return `${sign}${formatDeltaAbs(name, delta)}${monitorDeltaUnit(unit)} (${sign}${pct}%)`;
}

function MonitorRow({ metric }) {
  const { name, value, unit, baseline, status } = metric;
  const monitorStatus = MONITOR_STATUS[status] || MONITOR_STATUS.normal;
  const tipId = monitorTipId(name);
  const displayUnit = unit === "/min" ? "/min" : unit;
  const rowClass = ROW_STATUS[status] || "normal";

  return (
    <tr className={`lueur-monitor-row lueur-monitor-row--${rowClass}`}>
      <td className="lueur-monitor-cell lueur-monitor-cell--name">
        <div className="lueur-monitor-name-wrap">
          <span
            className="lueur-monitor-dot"
            style={{ background: zoneColor(monitorStatus.zone) }}
            aria-hidden="true"
          />
          {tipId ? (
            <LueurMetricLabel id={tipId} as="span" className="lueur-monitor-name">
              {name}
            </LueurMetricLabel>
          ) : (
            <span className="lueur-monitor-name">{name}</span>
          )}
        </div>
      </td>
      <td className="lueur-monitor-cell lueur-monitor-cell--value">
        <span className="lueur-monitor-value">{formatMetricValue(name, value)}</span>
        {value != null && displayUnit && (
          <span className="lueur-monitor-unit">{displayUnit}</span>
        )}
      </td>
      <td className="lueur-monitor-cell lueur-monitor-cell--avg">
        {baseline != null ? formatMetricValue(name, baseline) : "—"}
      </td>
      <td className="lueur-monitor-cell lueur-monitor-cell--delta">{formatDeltaCell(metric)}</td>
      <td className="lueur-monitor-cell lueur-monitor-cell--pos">
        <VitalPositionBar metric={metric} statusZone={monitorStatus.zone} />
      </td>
      <td className="lueur-monitor-cell lueur-monitor-cell--status">
        <span
          className={`lueur-stat-badge lueur-stat-badge--${BADGE_CLASS[monitorStatus.zone] || "neutral"}`}
        >
          {monitorStatus.label}
        </span>
      </td>
    </tr>
  );
}

export function HealthMonitorPanel({ metrics }) {
  if (!metrics?.length) {
    return <p className="lueur-meta">Aucune donnée moniteur pour ce jour.</p>;
  }

  const normalCount = metrics.filter((m) => m.status === "normal").length;

  return (
    <div className="lueur-monitor-table-block">
      <div className="lueur-monitor-table-head">
        <div>
          <LueurMetricLabel id="health_monitor" as="p" className="lueur-label lueur-card-section-label">
            Moniteur santé
          </LueurMetricLabel>
          <p className="lueur-meta lueur-monitor-table-sub">
            Vitaux vs ta moyenne personnelle · 30 jours
          </p>
        </div>
        <p className="lueur-monitor-table-summary">
          <strong>
            {normalCount}/{metrics.length}
          </strong>{" "}
          dans ta norme
        </p>
      </div>

      <div className="lueur-monitor-table-wrap">
        <table className="lueur-monitor-table">
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              <th scope="col">Valeur</th>
              <th scope="col">Moy. 30j</th>
              <th scope="col">Écart</th>
              <th scope="col">Position vs norme</th>
              <th scope="col">Statut</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <MonitorRow key={m.name} metric={m} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="lueur-monitor-legend" aria-hidden="true">
        <span className="lueur-monitor-legend-item">
          <span className="lueur-monitor-legend-norm" />
          zone de norme
        </span>
        <span className="lueur-monitor-legend-item">
          <span className="lueur-monitor-legend-avg" />
          ta moyenne
        </span>
        <span className="lueur-monitor-legend-item">
          <span className="lueur-monitor-legend-dot" />
          valeur actuelle
        </span>
      </div>
    </div>
  );
}
