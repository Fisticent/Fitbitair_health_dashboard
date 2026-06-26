import { LueurCard } from "./LueurCard";
import { StatGrid, StatTile } from "./StatTile";
import { LueurMetricLabel } from "./LueurInfoTip";
import { formatDateLong } from "./chartUtils";
import { formatMetricValue, formatDeltaAbs } from "../../utils/formatMetric";
import {
  MONITOR_STATUS,
} from "../../utils/metricStatus";
import { BodyCompositionPanel } from "./BodyCompositionPanel";
import { LueurWeightChart } from "./WeightChart";

function monitorDeltaUnit(unit) {
  if (unit === "ms") return " ms";
  if (unit === "bpm") return " bpm";
  if (unit === "/min") return "/min";
  if (unit === "%") return "%";
  return unit ? ` ${unit}` : "";
}

function MonitorMeta({ metric }) {
  const { value, baseline, unit, name } = metric;
  if (value == null || baseline == null) {
    return <span>moy. {formatMetricValue(name, baseline)}</span>;
  }

  const delta = value - baseline;
  const pct = baseline ? Math.round((delta / baseline) * 100) : 0;
  const lowerIsBetter = name === "FC repos" || name === "Respiration" || name === "Temp. peau";
  const favorable = lowerIsBetter ? delta <= 0 : delta >= 0;
  const sign = delta >= 0 ? "+" : "";
  const deltaUnit = monitorDeltaUnit(unit);

  return (
    <>
      <span>moy. {formatMetricValue(name, baseline)}</span>
      <span
        className={`lueur-monitor-delta ${favorable ? "lueur-monitor-delta--good" : "lueur-monitor-delta--warn"}`}
      >
        {sign}
        {formatDeltaAbs(name, delta)}
        {deltaUnit} ({sign}
        {pct}%)
      </span>
    </>
  );
}

function monitorTipId(name) {
  const map = {
    VFC: "hrv",
    "FC repos": "rhr",
    Respiration: "Respiration",
    "Temp. peau": "skin_temp",
  };
  return map[name] ?? null;
}

export function HealthView({
  data,
  bodyFatPct,
  bodyFatIsManual,
  manualDate,
  leanMassKg,
  saveBodyFat,
  clearBodyFat,
  formatShortDate,
}) {
  const { health_monitor, vitals, focus_date } = data;

  const weightSeries = vitals?.weight_history || [];

  const monitorCount = health_monitor?.length ?? 0;
  const monitorColumns = monitorCount <= 2 ? monitorCount || 1 : monitorCount === 4 ? 2 : 3;

  return (
    <div>
      <div className="lueur-section-title">Santé</div>
      <div className="lueur-section-sub">
        {formatDateLong(focus_date)} · Corps, vitaux et composition
      </div>

      <LueurCard>
        <LueurMetricLabel id="health_monitor" as="p" className="lueur-label lueur-card-section-label">
          Moniteur santé
        </LueurMetricLabel>
        <p className="lueur-meta" style={{ marginBottom: 14 }}>
          Vitaux vs moyenne personnelle 30 jours
        </p>
        {monitorCount > 0 ? (
          <StatGrid columns={monitorColumns}>
            {health_monitor.map((m) => {
              const monitorStatus = MONITOR_STATUS[m.status] || MONITOR_STATUS.normal;
              return (
                <StatTile
                  key={m.name}
                  label={m.name}
                  tipId={monitorTipId(m.name)}
                  value={formatMetricValue(m.name, m.value)}
                  unit={m.unit === "/min" ? "/min" : m.unit}
                  meta={<MonitorMeta metric={m} />}
                  status={monitorStatus.label}
                  statusZone={monitorStatus.zone}
                />
              );
            })}
          </StatGrid>
        ) : (
          <p className="lueur-meta">Aucune donnée moniteur pour ce jour.</p>
        )}
      </LueurCard>

      <LueurCard style={{ marginTop: 20 }}>
        <LueurMetricLabel id="body_composition" as="p" className="lueur-label lueur-card-section-label">
          Composition corporelle
        </LueurMetricLabel>
        <BodyCompositionPanel
          vitals={vitals}
          bodyFatPct={bodyFatPct}
          bodyFatIsManual={bodyFatIsManual}
          manualDate={manualDate}
          focusDate={focus_date}
          leanMassKg={leanMassKg}
          saveBodyFat={saveBodyFat}
          clearBodyFat={clearBodyFat}
          formatShortDate={formatShortDate}
        />
      </LueurCard>

      {weightSeries.length > 0 && (
        <LueurCard style={{ marginTop: 20 }}>
          <p className="lueur-label lueur-card-section-label">Historique poids</p>
          <p className="lueur-meta" style={{ marginBottom: 14 }}>
            {weightSeries.length} pesée{weightSeries.length > 1 ? "s" : ""}
            {vitals?.weight_date
              ? ` · pesée active : ${formatShortDate(vitals.weight_date)}`
              : ""}
          </p>
          <div className="lueur-stat-chart" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
            <LueurWeightChart
              series={weightSeries}
              activeWeightDate={vitals?.weight_date}
            />
          </div>
        </LueurCard>
      )}
    </div>
  );
}
