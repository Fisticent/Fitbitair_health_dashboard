import { LueurCard } from "./LueurCard";
import { ProgressRing, MiniRing } from "./ProgressRing";
import { HypnogramMini } from "./Hypnogram";
import { MiniSparkChart } from "./MiniSparkChart";
import { TrendBars, recoveryTrendFromHistory, recoveryTrendAvg } from "./TrendBars";
import {
  COLORS,
  formatDateLong,
  formatSleepDuration,
  formatClockTime,
  scoreStatusLabel,
  formatKm,
  resolveDistanceKm,
} from "./chartUtils";
import { RECOVERY_ZONE_LABEL } from "../../data/labels";
import { scoreZone, stressZoneFromLevel, strainRecoveryFit } from "../../utils/metricStatus";
import { formatMetricValue } from "../../utils/formatMetric";
import { cumulativeSleepDebt } from "../../utils/sleepDebt";
import { LueurTopbarActions } from "./LueurTopbarActions";
import { DailyBrief } from "../desktop/DailyBrief";
import { LueurMetricLabel } from "./LueurInfoTip";

function SleepMetaGrid({ sleep, sleepDebt7 }) {
  const bedtime = formatClockTime(sleep?.bedtime);
  const wakeup = formatClockTime(sleep?.wakeup);
  const hasSchedule = bedtime && wakeup;

  const kpis = [
    {
      key: "efficiency",
      label: "Efficacité",
      tipId: "sleep_efficiency",
      value: sleep?.efficiency != null ? `${sleep.efficiency} %` : "—",
    },
    {
      key: "need",
      label: "Besoin",
      tipId: "sleep_need",
      value: sleep?.need != null ? formatSleepDuration(sleep.need) : "—",
    },
    {
      key: "debt",
      label: "Dette",
      tipId: "sleep_debt",
      value: sleep?.debt_hours != null ? formatSleepDuration(sleep.debt_hours) : "—",
      accent: (sleep?.debt_hours ?? 0) > 0 ? "coral" : null,
    },
    sleepDebt7 > 0
      ? {
          key: "debt7",
          label: "Dette 7 j",
          tipId: "sleep_debt_7d",
          value: formatSleepDuration(sleepDebt7),
          accent: "coral",
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="lueur-sleep-meta">
      <div className="lueur-sleep-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.key} className="lueur-sleep-kpi">
            <LueurMetricLabel id={kpi.tipId} as="span" className="lueur-sleep-kpi-label">
              {kpi.label}
            </LueurMetricLabel>
            <span
              className={`lueur-sleep-kpi-value${kpi.accent ? ` lueur-sleep-kpi-value--${kpi.accent}` : ""}`}
            >
              {kpi.value}
            </span>
          </div>
        ))}
      </div>
      {hasSchedule && (
        <div className="lueur-sleep-schedule">
          <span className="lueur-sleep-schedule-item">
            <span className="lueur-sleep-schedule-label">Coucher</span>
            <span className="lueur-sleep-schedule-time">{bedtime}</span>
          </span>
          <span className="lueur-sleep-schedule-arrow" aria-hidden="true">
            →
          </span>
          <span className="lueur-sleep-schedule-item">
            <span className="lueur-sleep-schedule-label">Réveil</span>
            <span className="lueur-sleep-schedule-time">{wakeup}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function VitalSparkFoot({ points, values, color, gradient, caption, valueUnit = "" }) {
  const count = points?.length ?? values?.filter((v) => v != null).length ?? 0;
  const hasChart = count >= 2;

  return (
    <div className="lueur-vital-card-foot">
      {hasChart ? (
        <MiniSparkChart
          points={points}
          values={values}
          color={color}
          gradient={gradient}
          width={280}
          height={70}
          valueUnit={valueUnit}
        />
      ) : (
        <div className="lueur-vital-spark-ph" aria-hidden="true" />
      )}
      <div className="lueur-mono-meta">{caption}</div>
    </div>
  );
}

function VitalMetricCard({ label, tipId, value, unit, meta, extra, foot }) {
  return (
    <LueurCard className="lueur-vital-card">
      <div className="lueur-vital-card-top">
        {tipId ? (
          <LueurMetricLabel id={tipId} as="p" className="lueur-label">
            {label}
          </LueurMetricLabel>
        ) : (
          <p className="lueur-label">{label}</p>
        )}
        <div className="lueur-vital-value-row">
          <span className="lueur-metric-lg">{value ?? "—"}</span>
          {unit && <span className="lueur-unit">{unit}</span>}
        </div>
        {meta && <div className="lueur-meta lueur-vital-meta">{meta}</div>}
        {extra}
      </div>
      {foot}
    </LueurCard>
  );
}

export function TodayView({
  data,
  stepsGoal,
  stepsProgress,
  onNavigate,
  selectedDate,
  onDateChange,
  onRefresh,
  syncing,
  syncLabel,
  datesWithData,
}) {
  const {
    recovery,
    sleep,
    vitals,
    history,
    focus_date,
    today,
    stress,
    exercise,
    strain,
    health_monitor,
  } = data;

  const isToday = focus_date === today;
  const recoveryScore = recovery?.score;
  const sleepScore = sleep?.score;
  const steps = vitals?.steps;
  const distanceKm = vitals?.distance_km;
  const activeKcal = vitals?.active_calories;
  const rhr = recovery?.components?.rhr?.value;
  const hrv = recovery?.components?.hrv?.value;
  const activityPct = stepsProgress ?? 0;

  const hrHistory = history?.map((d) => d.rhr) ?? [];
  const hrvHistory = history?.map((d) => d.hrv) ?? [];
  const respHistory = history?.map((d) => d.respiratory) ?? [];
  const respValue = vitals?.respiratory;
  const respMonitor = health_monitor?.find((m) => m.name === "Respiration");
  const sleepDebt7 = cumulativeSleepDebt(history, 7);
  const spo2History = (history ?? [])
    .slice(-14)
    .map((d) => ({ date: d.date, value: d.spo2 }))
    .filter((p) => p.value != null);
  const trend = recoveryTrendFromHistory(history);
  const trendAvg = recoveryTrendAvg(history);

  const recoveryStatus = scoreStatusLabel(recoveryScore);
  // Ring + pill must follow the recovery zone, not a hardcoded green.
  const recoveryColor =
    { green: COLORS.TEAL, yellow: "#d98a16", red: COLORS.CORAL }[recovery?.zone] ||
    recoveryStatus.color;
  const recoveryPill =
    { green: "teal", yellow: "amber", red: "coral" }[recovery?.zone] || "teal";
  const sleepStatus = scoreStatusLabel(sleepScore);
  const stressStatus = stress ? stressZoneFromLevel(stress.level, stress.label) : null;
  const strainFit = strainRecoveryFit(strain?.score, recovery?.zone);

  const narrative =
    recovery?.zone === "green"
      ? "Récupération optimale — votre corps est prêt à encaisser une charge soutenue."
      : recovery?.zone === "yellow"
        ? "Récupération modérée — privilégiez une journée équilibrée."
        : recovery?.zone === "red"
          ? "Récupération faible — écoutez votre corps et ménagez-vous."
          : "Synthèse du jour basée sur vos données synchronisées.";

  const greeting = isToday ? "Bonjour" : formatDateLong(focus_date);
  const subtitle = isToday
    ? `${formatDateLong(focus_date)} · Votre journée en un coup d'œil`
    : "Résumé de la journée sélectionnée";

  const activeHours = exercise?.minutes != null ? Math.round(exercise.minutes / 60) || exercise.minutes : null;

  return (
    <div>
      <div className="lueur-topbar">
        <div>
          <div className="lueur-greeting">{greeting}</div>
          <div className="lueur-subtitle">{subtitle}</div>
        </div>
        <LueurTopbarActions
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          today={today}
          datesWithData={datesWithData}
          syncing={syncing}
          syncLabel={syncLabel}
          onRefresh={onRefresh}
        />
      </div>

      <div className="lueur-brief-wrap">
        <DailyBrief
          variant="lueur"
          focusDate={focus_date}
          today={today}
          recovery={recovery}
          strain={strain}
          strainFit={strainFit}
          sleep={sleep}
          steps={steps}
          distanceKm={distanceKm}
          stepsGoal={stepsGoal}
          stepsProgress={stepsProgress}
          activeKcal={activeKcal}
        />
      </div>

      <LueurCard hero className="lueur-hero-center">
        <ProgressRing
          size={300}
          radius={130}
          stroke={14}
          value={recoveryScore ?? 0}
          color={recoveryColor}
        >
          <div className="lueur-ring-label">RÉCUPÉRATION</div>
          <div className="lueur-ring-value" style={{ fontSize: 84, fontWeight: 300, margin: "6px 0" }}>
            {recoveryScore != null ? recoveryScore : "—"}
          </div>
          {recoveryScore != null && (
            <span className={`lueur-status-pill lueur-status-pill--${recoveryPill}`}>
              <span className="lueur-sync-dot" style={{ background: recoveryColor }} />
              {RECOVERY_ZONE_LABEL[recovery.zone] || recoveryStatus.text}
            </span>
          )}
        </ProgressRing>
        <p className="lueur-hero-narrative">{narrative}</p>
        <div className="lueur-pills-row">
          <MiniRing
            value={sleepScore}
            color={COLORS.BLUE}
            onClick={() => onNavigate("sleep")}
            label="Sommeil"
          />
          <MiniRing
            value={strain?.score ?? 0}
            color={COLORS.CORAL}
            onClick={() => onNavigate("strain")}
            label="Charge"
          />
          <MiniRing value={activityPct} color={COLORS.CORAL} label="Activité" />
        </div>
      </LueurCard>

      <div className="lueur-grid-4">
        <LueurCard span2 clickable className="lueur-card--tile" onClick={() => onNavigate("sleep")}>
          <div className="lueur-card-head">
            <LueurMetricLabel id="sleep" as="p" className="lueur-label">
              Sommeil
            </LueurMetricLabel>
            <span className="lueur-score-link lueur-score-link--blue">
              Score {sleepScore ?? "—"} →
            </span>
          </div>
          <div className="lueur-metric-row">
            <span className="lueur-metric-xl">{formatSleepDuration(sleep?.hours)}</span>
          </div>
          <SleepMetaGrid sleep={sleep} sleepDebt7={sleepDebt7} />
          <div className="lueur-card-tile-foot">
            <HypnogramMini timeline={sleep?.stage_timeline} stages={sleep?.stages} />
          </div>
        </LueurCard>

        <LueurCard span2 className="lueur-card--activity lueur-card--tile">
          <div className="lueur-card-head">
            <LueurMetricLabel id="activity_day" as="p" className="lueur-label">
              Activité
            </LueurMetricLabel>
          </div>
          <div className="lueur-activity-row">
            <div className="lueur-activity-ring-col">
              <ProgressRing
                size={100}
                radius={32}
                stroke={9}
                value={activityPct}
                color={COLORS.CORAL}
                className="lueur-activity-ring"
              >
                <span className="lueur-activity-pct">{activityPct}%</span>
              </ProgressRing>
              <span className="lueur-activity-ring-cap">objectif pas</span>
            </div>
            <div className="lueur-activity-grid">
              <div>
                <div className="lueur-metric-md">
                  {steps != null ? steps.toLocaleString("fr-FR") : "—"}
                </div>
                <div className="lueur-metric-caption">
                  pas / {stepsGoal?.toLocaleString("fr-FR") ?? "—"}
                  {steps != null && formatKm(resolveDistanceKm(steps, distanceKm)) && (
                    <> · {formatKm(resolveDistanceKm(steps, distanceKm))} km</>
                  )}
                </div>
              </div>
              <div>
                <div className="lueur-metric-md">{activeKcal ?? "—"}</div>
                <div className="lueur-metric-caption">kcal actives</div>
              </div>
              <div>
                <div className="lueur-metric-md">
                  {steps != null ? formatKm(resolveDistanceKm(steps, distanceKm)) ?? "—" : "—"}
                </div>
                <div className="lueur-metric-caption">
                  km {distanceKm != null ? "Fitbit" : "estimés"}
                </div>
              </div>
              <div>
                <div className="lueur-metric-md">{activeHours ?? "—"}</div>
                <div className="lueur-metric-caption">min actives</div>
              </div>
            </div>
          </div>
        </LueurCard>

        <VitalMetricCard
          tipId="rhr"
          label="Fréq. cardiaque"
          value={rhr != null ? formatMetricValue("FC repos", rhr) : null}
          unit="bpm"
          meta="au repos"
          foot={
            <VitalSparkFoot
              values={hrHistory}
              color={COLORS.BLUE}
              gradient="blue"
              caption={
                hrHistory.filter((v) => v != null).length > 0
                  ? `tendance ${hrHistory.length} j`
                  : "—"
              }
            />
          }
        />

        <VitalMetricCard
          tipId="hrv"
          label="HRV"
          value={hrv != null ? formatMetricValue("HRV", hrv) : null}
          unit="ms"
          meta={scoreZone(recoveryScore).label}
          foot={
            <VitalSparkFoot
              values={hrvHistory}
              color={COLORS.TEAL}
              gradient="teal"
              caption={hrvHistory.filter((v) => v != null).length > 0 ? "moy. 7 j" : "—"}
            />
          }
        />

        {respValue != null && (
          <VitalMetricCard
            tipId="Respiration"
            label="Respiration"
            value={formatMetricValue("Respiration", respValue)}
            unit="/min"
            meta={
              respMonitor?.status === "warning" || respMonitor?.status === "alert"
                ? "écart vs ta moyenne"
                : "au repos"
            }
            foot={
              <VitalSparkFoot
                values={respHistory}
                color={COLORS.BLUE}
                gradient="blue"
                caption={
                  respHistory.filter((v) => v != null).length > 0
                    ? `tendance ${respHistory.length} j`
                    : "—"
                }
              />
            }
          />
        )}

        {vitals?.skin_temp_delta != null && (
          <VitalMetricCard
            tipId="skin_temp"
            label="Température"
            value={vitals.skin_temp_delta}
            unit="°C"
            meta="écart nocturne"
            foot={<VitalSparkFoot caption="—" />}
          />
        )}

        {stress && (
          <VitalMetricCard
            tipId="stress"
            label="Stress"
            value={stress.label || stressStatus?.label || "—"}
            meta="estimation FC diurne"
            extra={
              <>
                {stress.hr_avg != null && (
                  <div className="lueur-mono-meta" style={{ marginTop: 6 }}>
                    FC moy. {stress.hr_avg} bpm · repos {stress.rhr_baseline ?? "—"} bpm
                  </div>
                )}
              </>
            }
            foot={
              <div className="lueur-vital-card-foot">
                {stress.score != null && (
                  <div
                    className="lueur-stress-bar"
                    role="img"
                    aria-label={`Niveau de stress ${stress.score} %`}
                  >
                    <div className="lueur-stress-bar-track">
                      <span className="lueur-stress-bar-seg lueur-stress-bar-seg--low" />
                      <span className="lueur-stress-bar-seg lueur-stress-bar-seg--mid" />
                      <span className="lueur-stress-bar-seg lueur-stress-bar-seg--high" />
                      <span
                        className="lueur-stress-bar-marker"
                        style={{ left: `${Math.min(100, Math.max(0, stress.score))}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="lueur-mono-meta">
                  {stress.score != null ? `score ${stress.score} %` : "—"}
                </div>
              </div>
            }
          />
        )}

        {vitals?.spo2 != null && (
          <VitalMetricCard
            tipId="spo2"
            label="SpO₂"
            value={formatMetricValue("SpO2", vitals.spo2)}
            unit="%"
            meta="moyenne nocturne"
            foot={
              <VitalSparkFoot
                points={spo2History}
                color={COLORS.BLUE}
                gradient="blue"
                valueUnit="%"
                caption={
                  spo2History.length > 0 ? `tendance ${spo2History.length} j` : "—"
                }
              />
            }
          />
        )}

        <LueurCard span4>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <LueurMetricLabel id="trends" as="p" className="lueur-label">
              Récupération · 7 jours
            </LueurMetricLabel>
            {trendAvg != null && (
              <span style={{ fontSize: 13, color: "var(--lueur-text-secondary)" }}>
                Moyenne <b style={{ color: "var(--lueur-text)" }}>{trendAvg}</b>
              </span>
            )}
          </div>
          <TrendBars data={trend} />
        </LueurCard>
      </div>
    </div>
  );
}
