import { LueurCard } from "./LueurCard";
import { LueurMetricLabel } from "./LueurInfoTip";
import { formatDateLong } from "./chartUtils";
import { BodyCompositionPanel } from "./BodyCompositionPanel";
import { HealthMonitorPanel } from "./HealthMonitorPanel";
import { LueurWeightChart } from "./WeightChart";

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

  return (
    <div>
      <div className="lueur-section-title">Santé</div>
      <div className="lueur-section-sub">
        {formatDateLong(focus_date)} · Corps, vitaux et composition
      </div>

      <LueurCard>
        <HealthMonitorPanel metrics={health_monitor} />
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
