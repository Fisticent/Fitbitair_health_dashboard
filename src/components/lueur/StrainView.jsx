import { LueurCard } from "./LueurCard";
import { ProgressRing } from "./ProgressRing";
import { MiniSparkChart } from "./MiniSparkChart";
import { TrendBars } from "./TrendBars";
import { StatGrid, StatTile } from "./StatTile";
import { COLORS, formatDateLong, formatKm, resolveDistanceKm } from "./chartUtils";
import {
  strainIntensityZone,
  strainRecoveryFit,
  stepsZone,
  caloriesActiveZone,
  caloriesTotalZone,
} from "../../utils/metricStatus";
import { ExercisePanel } from "../desktop/ExercisePanel";
import { DeltaBadge } from "../desktop/DeltaBadge";
import { StepsGoalEditor } from "../desktop/StepsGoalEditor";
import { CaloriesGoalEditor } from "../desktop/CaloriesGoalEditor";
import { metricComparison } from "../../utils/comparisons";
import { ZoneBreakdownBar } from "./ZoneBreakdownBar";
import { StrainFitChart } from "./StrainFitChart";
import { LueurMetricLabel } from "./LueurInfoTip";

const FIT_PILL_CLASS = {
  green: "lueur-status-pill--teal",
  yellow: "lueur-status-pill--amber",
  orange: "lueur-status-pill--amber",
  red: "lueur-status-pill--coral",
};

export function StrainView({
  data,
  history,
  stepsGoal,
  saveStepsGoal,
  caloriesGoal,
  saveCaloriesGoal,
}) {
  const { strain, recovery, focus_date, exercise, exercise_recent, vitals, today, calories } = data;
  const activeKcal = vitals?.active_calories ?? calories?.active_kcal;
  const totalKcalEst = vitals?.total_calories_est ?? calories?.total_est_kcal;
  const stepsCount = vitals?.steps ?? 0;
  const distanceKm = vitals?.distance_km;
  const stepsProgress = stepsGoal > 0 ? Math.min(100, Math.round((stepsCount / stepsGoal) * 100)) : 0;
  const caloriesHistoryPoints = (vitals?.calories_history || calories?.history || []).slice(-14);
  const stepsHistoryPoints = (history || [])
    .slice(-14)
    .filter((d) => d.steps != null)
    .map((d) => ({ date: d.date, value: d.steps }));

  const strainFit = strainRecoveryFit(strain?.score, recovery?.zone);
  const strainLevel = strainIntensityZone(strain?.score);
  const cmpStrain = metricComparison(history, "strain", focus_date, { lowerIsBetter: true });
  const stepsStatus = stepsZone(stepsProgress);
  const caloriesActiveStatus = caloriesActiveZone(activeKcal, vitals?.calories_avg_14d);
  const caloriesTotalStatus = caloriesTotalZone(totalKcalEst, caloriesGoal);

  const strainTrend = (history || []).slice(-7).map((d) => ({
    date: d.date,
    value: d.strain ?? 0,
    label: d.date.slice(8),
    tooltip: d.strain != null ? `Charge ${d.strain} %` : "—",
  }));

  const strainHistory = history?.map((d) => d.strain) ?? [];

  return (
    <div>
      <div className="lueur-section-title">Charge</div>
      <div className="lueur-section-sub">
        {formatDateLong(focus_date)} · Effort cardiovasculaire, activité et entraînement
      </div>

      <LueurCard hero>
        <div className="lueur-hero-flex">
          <ProgressRing
            size={220}
            radius={96}
            stroke={13}
            value={strain?.score ?? 0}
            max={100}
            color={COLORS.CORAL}
          >
            <div className="lueur-ring-value" style={{ fontSize: 60, fontWeight: 300 }}>
              {strain?.score != null ? strain.score : "—"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.CORAL }}>
              {strain?.label || strainLevel.label} · %
            </div>
          </ProgressRing>
          <div className="lueur-hero-text">
            <LueurMetricLabel id="strain" as="h3" className="lueur-hero-heading">
              Charge cardiovasculaire
            </LueurMetricLabel>
            <p>
              {strain?.zone_minutes ?? 0} min en zones FC · charge {strain?.load ?? "—"}
            </p>
            <p style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className={`lueur-status-pill ${FIT_PILL_CLASS[strainFit.zone] || "lueur-status-pill--teal"}`}>{strainFit.label}</span>
              <LueurMetricLabel id="strain_recovery_fit" as="span" className="lueur-inline-tip-label">
                Adéquation récup.
              </LueurMetricLabel>
            </p>
            {strain?.notice && strain.source !== "zones" && (
              <p className="lueur-meta" style={{ marginTop: 12 }}>
                {strain.notice}
              </p>
            )}
            {strain?.zones && strain.zone_minutes > 0 && (
              <div style={{ marginTop: 16 }}>
                <ZoneBreakdownBar zones={strain.zones} totalMinutes={strain.zone_minutes} />
              </div>
            )}
            <DeltaBadge comparison={cmpStrain} />
          </div>
        </div>
      </LueurCard>

      <div className="lueur-grid-2">
        <LueurCard>
          <LueurMetricLabel id="strain_intensity" as="p" className="lueur-label">
            Intensité
          </LueurMetricLabel>
          <div className="lueur-metric-md" style={{ margin: "10px 0" }}>
            {strainLevel.label}
          </div>
          <div className="lueur-progress-track" style={{ height: 10 }}>
            <div
              className="lueur-progress-fill"
              style={{
                width: `${strain?.score != null ? strain.score : 0}%`,
                background: COLORS.CORAL,
              }}
            />
          </div>
        </LueurCard>
        {strain?.zones && strain.zone_minutes > 0 ? (
          <LueurCard>
            <LueurMetricLabel id="hr_zones" as="p" className="lueur-label">
              Zones FC
            </LueurMetricLabel>
            <p className="lueur-meta" style={{ marginBottom: 14 }}>
              {strain.zone_minutes} min au total
            </p>
            <ZoneBreakdownBar zones={strain.zones} totalMinutes={strain.zone_minutes} />
          </LueurCard>
        ) : (
          <LueurCard>
            <LueurMetricLabel id="trends" as="p" className="lueur-label">
              Tendance 7 jours
            </LueurMetricLabel>
            <MiniSparkChart values={strainHistory} color={COLORS.CORAL} gradient="coral" width={400} />
          </LueurCard>
        )}
      </div>

      <LueurCard style={{ marginTop: 20 }}>
        <LueurMetricLabel id="strain_recovery_fit" as="p" className="lueur-label" style={{ marginBottom: 4 }}>
          Adéquation charge / récup
        </LueurMetricLabel>
        <p className="lueur-meta" style={{ marginBottom: 14 }}>
          Charge vs récupération · 7 derniers jours
        </p>
        <StrainFitChart
          history={history}
          focusDate={focus_date}
          todayStrain={strain?.score}
          todayRecovery={recovery?.score}
        />
      </LueurCard>

      <LueurCard style={{ marginTop: 20 }}>
        <LueurMetricLabel id="strain" as="p" className="lueur-label" style={{ marginBottom: 14 }}>
          Charge · 7 jours
        </LueurMetricLabel>
        <TrendBars
          data={strainTrend}
          color={COLORS.CORAL}
          highlightLast
          maxValue={100}
          valueUnit="%"
          formatValue={(v) => (v != null ? Math.round(Number(v)) : "—")}
        />
      </LueurCard>

      <LueurCard style={{ marginTop: 20 }} className="lueur-card--activity-day">
        <LueurMetricLabel id="activity_day" as="p" className="lueur-label lueur-card-section-label">
          Activité du jour
        </LueurMetricLabel>

        <StatGrid columns={3}>
          <StatTile
            label="Pas"
            value={stepsCount.toLocaleString("fr-FR")}
            meta={
              <>
                {stepsCount > 0 && formatKm(resolveDistanceKm(stepsCount, distanceKm)) && (
                  <>{formatKm(resolveDistanceKm(stepsCount, distanceKm))} km</>
                )}
                {stepsGoal != null && (
                  <span className="lueur-stat-editor">
                    {stepsCount > 0 && formatKm(resolveDistanceKm(stepsCount, distanceKm)) && " · "}
                    <StepsGoalEditor goal={stepsGoal} onSave={saveStepsGoal} />
                  </span>
                )}
              </>
            }
            status={stepsStatus.label}
            statusZone={stepsStatus.zone}
          />
          <StatTile
            label="Calories actives"
            value={activeKcal != null ? activeKcal.toLocaleString("fr-FR") : null}
            unit="kcal"
            status={caloriesActiveStatus.label}
            statusZone={caloriesActiveStatus.zone}
          />
          <StatTile
            label="Calories totales est."
            value={totalKcalEst != null ? `~${totalKcalEst.toLocaleString("fr-FR")}` : null}
            unit="kcal"
            meta={
              totalKcalEst != null ? (
                <>
                  {vitals?.bmr_kcal != null && (
                    <span>dont {vitals.bmr_kcal.toLocaleString("fr-FR")} au repos</span>
                  )}
                  {caloriesGoal != null && (
                    <span className="lueur-stat-editor">
                      {vitals?.bmr_kcal != null && " · "}
                      <CaloriesGoalEditor goal={caloriesGoal} onSave={saveCaloriesGoal} />
                    </span>
                  )}
                </>
              ) : null
            }
            status={totalKcalEst != null ? caloriesTotalStatus.label : null}
            statusZone={caloriesTotalStatus.zone}
          />
        </StatGrid>

        {stepsHistoryPoints.length > 1 && (
          <div className="lueur-stat-chart">
            <p className="lueur-stat-chart-label">Pas · 14 jours</p>
            <MiniSparkChart
              points={stepsHistoryPoints}
              color={COLORS.TEAL}
              gradient="teal"
              width={520}
              height={110}
              pad={16}
            />
          </div>
        )}

        {caloriesHistoryPoints.length > 0 && (
          <div className="lueur-stat-chart">
            <p className="lueur-stat-chart-label">Calories actives · 14 jours</p>
            <MiniSparkChart
              points={caloriesHistoryPoints}
              color={COLORS.CORAL}
              gradient="coral"
              width={520}
              height={110}
              pad={16}
              valueUnit="kcal"
            />
          </div>
        )}
      </LueurCard>

      <div className="lueur-panel-section">
        <ExercisePanel
          variant="lueur"
          exercise={exercise}
          exerciseRecent={exercise_recent}
          focusDate={focus_date}
          today={today}
          activeCalories={activeKcal}
          stepsToday={stepsCount}
          distanceKm={distanceKm}
        />
      </div>
    </div>
  );
}
