import { motion, AnimatePresence } from "framer-motion";
import { AnimatedRing } from "./AnimatedRing";
import { Sparkline } from "./Sparkline";
import { JournalPanel, CoveragePanel, ManualBodyFatPanel } from "./InsightsPanels";
import { MetricLabel, InfoTip } from "./InfoTip";
import { BodyFatEditor } from "./BodyFatEditor";
import { getMetricTip } from "../../data/metricTooltips";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useManualBodyFat, computeLeanMass, useStepsGoal, useCaloriesGoal } from "../../hooks/useManualMetrics";
import { ComparePanel, WeightTrendChart } from "./CompareCharts";
import { formatKm, resolveDistanceKm } from "../lueur/chartUtils";
import { StatusPill, StatusRail, StatusLegend } from "./StatusPill";
import {
  scoreZone,
  strainIntensityZone,
  strainRecoveryFit,
  stressZoneFromLevel,
  stepsZone,
  caloriesActiveZone,
  caloriesTotalZone,
  weightDeltaZone,
  bmiZone,
  comparisonZone,
  comparisonZoneInverted,
  MONITOR_STATUS,
} from "../../utils/metricStatus";
import { DeltaBadge, MonitorDelta } from "./DeltaBadge";
import { formatMetricValue } from "../../utils/formatMetric";
import { metricComparison } from "../../utils/comparisons";
import { ExercisePanel } from "./ExercisePanel";
import { StepsGoalEditor } from "./StepsGoalEditor";
import { CaloriesGoalEditor } from "./CaloriesGoalEditor";
import { DashboardDatePicker } from "./DashboardDatePicker";
import { RECOVERY_ZONE_LABEL, formatConfidence } from "../../data/labels";
import { DailyBrief } from "./DailyBrief";
import { JournalCorrelation } from "./JournalCorrelation";

const SECTION_INTRO = {
  insights: {
    title: "Analyses",
    desc: "Stress estimé, âge physiologique, journal local et saisie corps.",
  },
  trends: {
    title: "Tendances",
    desc: "Rythme 14 jours et graphiques comparatifs vs moyenne.",
  },
  health: {
    title: "Santé",
    desc: "Vitaux vs moyenne personnelle 30 jours, composition corporelle et historique poids.",
  },
  coverage: {
    title: "Couverture KPI",
    desc: "Alignement avec le tableau Obsidian — ce qui est en direct, estimé ou manuel.",
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

function AnimatedStat({ value, suffix = "", decimals = 0 }) {
  const n = useAnimatedNumber(typeof value === "number" ? value : 0);
  const display = decimals ? n.toFixed(decimals) : Math.round(n);
  return (
    <span className="animated-stat">
      {display}
      {suffix}
    </span>
  );
}

function BentoCard({ children, className = "", delay = 0, accent, statusZone }) {
  return (
    <motion.article
      className={`bento-card ${statusZone ? `status-border--${statusZone}` : ""} ${className}`}
      style={{ "--card-accent": accent }}
      variants={fadeUp}
      custom={delay}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.article>
  );
}

export function DesktopDashboard({
  data,
  active,
  selectedDate,
  onDateChange,
  onRefresh,
  syncing,
  syncMessage,
  error,
}) {
  const {
    recovery,
    strain,
    sleep,
    health_monitor,
    vitals,
    history,
    focus_date,
    available_dates,
    dates_with_data,
    sync_warnings,
    synced_at,
    stress,
    physiological_age,
    pace_of_aging,
    exercise,
    exercise_recent,
    calories,
    kpi_coverage,
    today,
  } = data;

  const recoveryHistory = history.map((d) => ({ value: d.recovery }));
  const strainHistory = history.map((d) => ({ value: d.strain }));
  const sleepHistory = history.map((d) => ({ value: d.sleep }));

  const formatDate = (iso) => {
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return iso;
    }
  };

  const formatShortDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return iso;
    }
  };

  const formatLastSync = (iso) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const isToday =
        d.toLocaleDateString("fr-FR") === new Date().toLocaleDateString("fr-FR");
      if (isToday) return time;
      const day = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      return `${day} ${time}`;
    } catch {
      return null;
    }
  };

  const lastSyncLabel = syncing
    ? "Synchronisation…"
    : synced_at
      ? `Dernière synchronisation · ${formatLastSync(synced_at)}`
      : "Dernière synchronisation · —";

  const datesWithData = dates_with_data || available_dates || [];
  const hasDataForDay = datesWithData.includes(focus_date);
  const weightSeries = vitals.weight_history || [];

  const {
    manualBodyFat,
    manualDate,
    saveBodyFat,
    clearBodyFat,
  } = useManualBodyFat(focus_date);

  const { stepsGoal, saveStepsGoal } = useStepsGoal();
  const { caloriesGoal, saveCaloriesGoal } = useCaloriesGoal();
  const stepsCount = vitals.steps ?? 0;
  const distanceKm = vitals.distance_km;
  const stepsProgress = stepsGoal > 0 ? Math.min(100, Math.round((stepsCount / stepsGoal) * 100)) : 0;

  const activeKcal = vitals.active_calories ?? calories?.active_kcal;
  const totalKcalEst = vitals.total_calories_est ?? calories?.total_est_kcal;
  const caloriesHistory = (vitals.calories_history || calories?.history || []).map((d) => ({
    value: d.value,
  }));
  const caloriesTotalProgress =
    caloriesGoal > 0 && totalKcalEst != null
      ? Math.min(100, Math.round((totalKcalEst / caloriesGoal) * 100))
      : 0;

  const bodyFatPct = vitals.body_fat_pct ?? manualBodyFat;
  const bodyFatIsManual = vitals.body_fat_pct == null && manualBodyFat != null;
  const leanMassKg =
    vitals.lean_mass_kg ?? computeLeanMass(vitals.weight_kg, bodyFatPct);

  const cmpRecovery = metricComparison(history, "recovery", focus_date);
  const cmpHrv = metricComparison(history, "hrv", focus_date);
  const cmpRhr = metricComparison(history, "rhr", focus_date, { lowerIsBetter: true });
  const cmpStrain = metricComparison(history, "strain", focus_date, { lowerIsBetter: true });
  const cmpSleep = metricComparison(history, "sleep", focus_date);
  const cmpStress = stress?.score != null
    ? metricComparison(history, "stress", focus_date, { lowerIsBetter: true })
    : null;
  const cmpActiveCal = metricComparison(history, "active_calories", focus_date);

  const sleepStatus = scoreZone(sleep.score);
  const strainFit = strainRecoveryFit(strain.score, recovery.zone);
  const strainLevel = strainIntensityZone(strain.score);
  const stepsStatus = stepsZone(stepsProgress);
  const caloriesActiveStatus = caloriesActiveZone(activeKcal, vitals.calories_avg_14d);
  const caloriesTotalStatus = caloriesTotalZone(totalKcalEst, caloriesGoal);
  const stressStatus = stress ? stressZoneFromLevel(stress.level, stress.label) : null;
  const weightDeltaStatus = weightDeltaZone(vitals.weight_delta_7d);
  const bmiStatus = bmiZone(vitals.bmi_category);

  return (
    <div className="desktop-main">
      <header className="topbar">
        <div>
          <h1 className="topbar-title">
            {formatDate(focus_date)}
          </h1>
          <div className="topbar-meta">
            <div className="live-badge">
              <span className="live-pulse" />
              En direct · Fitbit + Health Connect
            </div>
            {focus_date === today && (
              <span className="today-badge">Aujourd&apos;hui</span>
            )}
          </div>
        </div>
        <div className="topbar-actions">
          <DashboardDatePicker
            value={selectedDate}
            onChange={onDateChange}
            today={today}
            datesWithData={datesWithData}
          />
          <div className="sync-block">
            <span className={`sync-block-label ${syncing ? "is-syncing" : ""}`}>
              {lastSyncLabel}
            </span>
            <motion.button
              type="button"
              className={`btn-refresh ${syncing ? "syncing" : ""}`}
              onClick={onRefresh}
              disabled={syncing}
              aria-label="Synchroniser Google Health"
              title="Synchroniser Google Health"
            >
              {syncing ? "Synchro…" : "Synchroniser"}
            </motion.button>
          </div>
        </div>
      </header>

      {error && <p className="inline-error">{error}</p>}
      {sync_warnings?.length > 0 && !error && (
        <p className="inline-warn">
          Sync partielle : {sync_warnings.slice(0, 2).join(" · ")}
          {sync_warnings.length > 2 ? ` (+${sync_warnings.length - 2})` : ""}
        </p>
      )}
      {!hasDataForDay && active === "overview" && (
        <p className="inline-warn">
          Aucune donnée synchronisée pour ce jour — les scores peuvent être vides ou estimés.
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="content-area"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
              {(active === "overview" || active === "strain" || active === "sleep" || active === "health" || active === "trends") && (
            <div className="dashboard-grid">
              {active === "overview" && (
                <div className="page-intro span-full">
                  <StatusLegend />
                </div>
              )}
              {active === "overview" && (
                <DailyBrief
                  focusDate={focus_date}
                  today={today}
                  recovery={recovery}
                  strain={strain}
                  strainFit={strainFit}
                  sleep={sleep}
                  steps={vitals.steps}
                  distanceKm={distanceKm}
                  stepsGoal={stepsGoal}
                  stepsProgress={stepsProgress}
                  activeKcal={activeKcal}
                />
              )}
              {active === "health" && (
                <header className="page-intro">
                  <h2>{SECTION_INTRO.health.title}</h2>
                  <p>{SECTION_INTRO.health.desc}</p>
                </header>
              )}
              {active === "trends" && (
                <header className="page-intro">
                  <h2>{SECTION_INTRO.trends.title}</h2>
                  <p>{SECTION_INTRO.trends.desc}</p>
                </header>
              )}
              {/* Recovery Hero */}
              {(active === "overview") && (
                <motion.section
                  id="overview"
                  className="hero-recovery glass-panel"
                  variants={fadeUp}
                  custom={0}
                  initial="hidden"
                  animate="show"
                >
                  <div className="hero-left">
                    <span className={`zone-pill zone-${recovery.zone}`}>
                      {RECOVERY_ZONE_LABEL[recovery.zone]}
                    </span>
                    <MetricLabel id="recovery" as="h2" className="hero-heading">
                      Récupération
                    </MetricLabel>
                    <p className="hero-copy">
                      Baseline personnelle 14 j — VFC, FC repos, sommeil, respiration
                    </p>
                    <StatusRail value={recovery.score} />
                    <DeltaBadge comparison={cmpRecovery} unit="%" />
                    <div className="component-chips">
                      {recovery.components.hrv.value && (
                        <span>VFC {Math.round(recovery.components.hrv.value)} ms</span>
                      )}
                      {recovery.components.rhr.value && (
                        <span>FC repos {formatMetricValue("FC repos", recovery.components.rhr.value)} bpm</span>
                      )}
                      {recovery.components.sleep_hours.value != null && (
                        <span>{recovery.components.sleep_hours.value}h sommeil</span>
                      )}
                      {recovery.components.respiratory?.value != null && (
                        <span>Resp. {formatMetricValue("Respiration", recovery.components.respiratory.value)}/min</span>
                      )}
                    </div>
                  </div>
                  <div className="hero-ring-wrap">
                    <AnimatedRing
                      value={recovery.score}
                      max={100}
                      size={300}
                      stroke={16}
                      color={recovery.color}
                      glow
                    />
                    <div className="hero-score">
                      <AnimatedStat value={recovery.score} suffix="%" />
                      <span className="hero-score-label">X-Récupération</span>
                    </div>
                  </div>
                </motion.section>
              )}

              {active === "strain" && (
                <motion.section className="hero-recovery glass-panel span-full" variants={fadeUp} initial="hidden" animate="show">
                  <div className="hero-left">
                    <MetricLabel id="strain" as="h2" className="hero-heading">
                      Charge
                    </MetricLabel>
                    <p className="hero-copy">Charge cardiovasculaire depuis les zones FC Fitbit</p>
                    <p className="card-meta">{strain.zone_minutes} min zones · charge {strain.load}</p>
                    {strain.notice && strain.source !== "zones" && (
                      <p className="card-meta strain-notice">{strain.notice}</p>
                    )}
                  </div>
                  <div className="hero-ring-wrap">
                    <AnimatedRing value={strain.score} max={100} size={280} stroke={14} color="var(--strain)" glow />
                    <div className="hero-score">
                      <AnimatedStat value={strain.score} decimals={0} />
                      <span className="hero-score-label">{strain.label} · %</span>
                    </div>
                  </div>
                </motion.section>
              )}

              {active === "sleep" && (
                <motion.section className="hero-recovery glass-panel span-full" variants={fadeUp} initial="hidden" animate="show">
                  <div className="hero-left">
                    <MetricLabel id="sleep" as="h2" className="hero-heading">
                      Sommeil
                    </MetricLabel>
                    <p className="hero-copy">{sleep.hours}h endormi · besoin {sleep.need}h · efficacité {sleep.efficiency}%</p>
                    <div className="stage-mini">
                      <span>Profond {sleep.stages.deep_min} min</span>
                      <span>REM {sleep.stages.rem_min} min</span>
                      <span>Léger {sleep.stages.light_min} min</span>
                      <span>Éveillé {sleep.stages.awake_min} min</span>
                    </div>
                  </div>
                  <div className="hero-ring-wrap">
                    <AnimatedRing value={sleep.score} max={100} size={280} stroke={14} color="var(--sleep)" glow />
                    <div className="hero-score">
                      <AnimatedStat value={sleep.score} suffix="%" />
                      <span className="hero-score-label">X-Sommeil</span>
                    </div>
                  </div>
                </motion.section>
              )}

              {active === "strain" && (
                <ExercisePanel
                  exercise={exercise}
                  exerciseRecent={exercise_recent}
                  focusDate={focus_date}
                  today={today}
                  activeCalories={activeKcal}
                  stepsToday={stepsCount}
                  distanceKm={distanceKm}
                />
              )}

              {/* Bento pillars */}
              {(active === "overview" || active === "strain") && (
                <BentoCard
                  className="span-strain"
                  delay={1}
                  accent="var(--strain)"
                  statusZone={strainFit.zone}
                >
                  <div className="bento-card-head">
                    <div className="card-head">
                      <MetricLabel id="strain" as="h3">Charge</MetricLabel>
                      <div className="card-head-badges">
                        <StatusPill zone={strainFit.zone} label={strainFit.label} size="xs" />
                        <span className="card-badge">{strainLevel.label}</span>
                      </div>
                    </div>
                    <div className="card-metric-row">
                      <AnimatedStat value={strain.score} decimals={0} />
                      <span className="card-unit">%</span>
                    </div>
                    <DeltaBadge comparison={cmpStrain} />
                  </div>
                  <div className="bento-card-foot">
                    <Sparkline data={strainHistory} color="var(--strain)" label="strain" />
                    <p className="card-meta">{strain.zone_minutes} min en zones · charge {strain.load}</p>
                    {strain.notice && strain.source !== "zones" && (
                      <p className="card-meta strain-notice">{strain.notice}</p>
                    )}
                  </div>
                </BentoCard>
              )}

              {(active === "overview" || active === "sleep") && (
                <BentoCard
                  className="span-sleep"
                  delay={2}
                  accent="var(--sleep)"
                  statusZone={sleepStatus.zone}
                >
                  <div className="bento-card-head">
                    <div className="card-head">
                      <MetricLabel id="sleep" as="h3">Sommeil</MetricLabel>
                      <StatusPill zone={sleepStatus.zone} label={sleepStatus.label} size="xs" />
                    </div>
                    <div className="card-metric-row">
                      <AnimatedStat value={sleep.score} suffix="%" />
                    </div>
                    <StatusRail value={sleep.score} />
                    <DeltaBadge comparison={cmpSleep} unit="%" />
                  </div>
                  <div className="bento-card-foot">
                    <Sparkline data={sleepHistory} color="var(--sleep)" label="sleep" />
                    <div className="stage-mini">
                      <span>Profond {sleep.stages.deep_min} min</span>
                      <span>REM {sleep.stages.rem_min} min</span>
                      <span>{sleep.hours}h / {sleep.need}h</span>
                    </div>
                  </div>
                </BentoCard>
              )}

              {active === "overview" && (
                <details className="overview-more span-full" open>
                  <summary className="overview-more-summary">Autres indicateurs du jour</summary>
                  <div className="overview-more-grid dashboard-grid">
                  <BentoCard
                    className="span-steps"
                    delay={3}
                    accent="var(--accent)"
                    statusZone={stepsStatus.zone}
                  >
                    <div className="bento-card-head">
                      <MetricLabel id="steps" as="h3">Pas</MetricLabel>
                      <div className="card-head">
                        <div className="card-metric-row">
                          <AnimatedStat value={stepsCount} />
                          <StepsGoalEditor goal={stepsGoal} onSave={saveStepsGoal} />
                        </div>
                        <StatusPill zone={stepsStatus.zone} label={stepsStatus.label} size="xs" />
                      </div>
                    </div>
                    <div className="bento-card-foot">
                      <StatusRail value={stepsProgress} />
                      <div className="steps-progress" role="progressbar" aria-valuenow={stepsProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`${stepsProgress}% de l'objectif journalier`}>
                        <div className="steps-progress-fill" style={{ width: `${stepsProgress}%` }} />
                      </div>
                      <p className="card-meta">
                        {stepsProgress}% de l&apos;objectif
                        {formatKm(resolveDistanceKm(stepsCount, distanceKm))
                          ? ` · ${formatKm(resolveDistanceKm(stepsCount, distanceKm))} km`
                          : ""}
                        {" · "}
                        {focus_date === today ? "Aujourd'hui" : "Jour sélectionné"}
                      </p>
                    </div>
                  </BentoCard>

                  {(activeKcal != null || totalKcalEst != null) && (
                    <BentoCard
                      className="span-calories"
                      delay={3.5}
                      accent="#fb923c"
                      statusZone={caloriesActiveStatus.zone}
                    >
                      <div className="bento-card-head">
                        <div className="card-head">
                          <MetricLabel id="calories" as="h3">Calories</MetricLabel>
                          <StatusPill
                            zone={caloriesActiveStatus.zone}
                            label={caloriesActiveStatus.label}
                            size="xs"
                          />
                        </div>
                        <div className="card-metric-row">
                          <AnimatedStat value={activeKcal ?? 0} />
                          <span className="card-unit">kcal actives</span>
                        </div>
                        {totalKcalEst != null && (
                          <p className="card-meta card-meta--inline">
                            Total estimé{" "}
                            <strong>{totalKcalEst.toLocaleString("fr-FR")}</strong>
                            {vitals.bmr_kcal != null && ` (dont ${vitals.bmr_kcal} repos)`}
                            <CaloriesGoalEditor goal={caloriesGoal} onSave={saveCaloriesGoal} />
                          </p>
                        )}
                        <DeltaBadge comparison={cmpActiveCal} unit=" kcal" />
                      </div>
                      <div className="bento-card-foot">
                        {totalKcalEst != null && (
                          <>
                            <StatusRail value={caloriesTotalProgress} />
                            <StatusPill
                              zone={caloriesTotalStatus.zone}
                              label={caloriesTotalStatus.label}
                              size="xs"
                            />
                          </>
                        )}
                        {caloriesHistory.length > 0 && (
                          <Sparkline
                            data={caloriesHistory}
                            color="#fb923c"
                            label="calories"
                          />
                        )}
                        {vitals.calories_avg_14d != null && (
                          <p className="card-meta">
                            Moy. actives 14j · {vitals.calories_avg_14d} kcal
                            {vitals.calories_delta_7d != null &&
                              ` · ${vitals.calories_delta_7d >= 0 ? "+" : ""}${vitals.calories_delta_7d} vs il y a 7j`}
                          </p>
                        )}
                      </div>
                    </BentoCard>
                  )}

                  <BentoCard
                    className="span-hrv"
                    delay={4}
                    accent="var(--green)"
                    statusZone={comparisonZone(cmpHrv).zone}
                  >
                    <div className="bento-card-head">
                      <div className="card-head">
                        <MetricLabel id="hrv" as="h3">VFC</MetricLabel>
                        <StatusPill
                          zone={comparisonZone(cmpHrv).zone}
                          label={comparisonZone(cmpHrv).label}
                          size="xs"
                        />
                      </div>
                      <div className="card-metric-row">
                        <AnimatedStat
                          value={recovery.components.hrv.value || 0}
                          suffix=" ms"
                        />
                      </div>
                      <DeltaBadge comparison={cmpHrv} unit=" ms" />
                    </div>
                    <div className="bento-card-foot">
                      <Sparkline
                        data={history.map((d) => ({ value: d.hrv || 0 }))}
                        color="var(--green)"
                        label="hrv"
                      />
                    </div>
                  </BentoCard>

                  <BentoCard
                    className="span-rhr"
                    delay={5}
                    accent="#f472b6"
                    statusZone={comparisonZoneInverted(cmpRhr).zone}
                  >
                    <div className="bento-card-head">
                      <div className="card-head">
                        <MetricLabel id="rhr" as="h3">FC repos</MetricLabel>
                        <StatusPill
                          zone={comparisonZoneInverted(cmpRhr).zone}
                          label={comparisonZoneInverted(cmpRhr).label}
                          size="xs"
                        />
                      </div>
                      <div className="card-metric-row">
                        <AnimatedStat
                          value={recovery.components.rhr.value || 0}
                          suffix=" bpm"
                        />
                      </div>
                      <DeltaBadge comparison={cmpRhr} unit=" bpm" />
                    </div>
                    <div className="bento-card-foot">
                      <Sparkline
                        data={history.map((d) => ({ value: d.rhr || 0 }))}
                        color="#f472b6"
                        label="rhr"
                      />
                    </div>
                  </BentoCard>

                  {stress && (
                    <BentoCard
                      className="span-stress"
                      delay={6}
                      accent="#a78bfa"
                      statusZone={stressStatus?.zone}
                    >
                      <div className="bento-card-head">
                        <div className="card-head">
                          <MetricLabel id="stress" as="h3">Stress</MetricLabel>
                          <StatusPill
                            zone={stressStatus?.zone}
                            label={stress?.label || stressStatus?.label}
                            size="xs"
                          />
                        </div>
                        <div className="card-metric-row">
                          <AnimatedStat value={stress.score ?? 0} suffix="%" />
                        </div>
                        <DeltaBadge comparison={cmpStress} unit="%" />
                      </div>
                      <div className="bento-card-foot">
                        <p className="card-meta">
                          {stress.score != null
                            ? `Estimation FC jour ${stress.hr_avg} vs repos ${stress.rhr_baseline} bpm`
                            : stress.label}
                        </p>
                        <Sparkline
                          data={history.map((d) => ({ value: d.stress || 0 }))}
                          color="#a78bfa"
                          label="stress"
                        />
                      </div>
                    </BentoCard>
                  )}

                  {physiological_age && (
                    <BentoCard className="span-age" delay={7} accent="#38bdf8">
                      <div className="bento-card-head">
                        <div className="card-head">
                          <MetricLabel id="x_age" as="h3">X-Âge</MetricLabel>
                          <span className="card-badge">{formatConfidence(physiological_age.confidence)}</span>
                        </div>
                        <div className="card-metric-row">
                          <AnimatedStat value={physiological_age.functional_age} decimals={1} />
                          <span className="card-unit">ans</span>
                        </div>
                      </div>
                      <div className="bento-card-foot">
                        <p className="card-meta">
                          {physiological_age.delta_years >= 0 ? "+" : ""}
                          {physiological_age.delta_years} vs {physiological_age.real_age} ans réels
                          {pace_of_aging?.pace_years_per_year != null &&
                            ` · ${pace_of_aging.label}`}
                        </p>
                      </div>
                    </BentoCard>
                  )}

                  <ExercisePanel
                    exercise={exercise}
                    exerciseRecent={exercise_recent}
                    focusDate={focus_date}
                    today={today}
                    activeCalories={activeKcal}
                    stepsToday={stepsCount}
                    distanceKm={distanceKm}
                  />

                  {vitals.weight_kg != null && (
                    <BentoCard className="span-body" delay={9} accent="#fbbf24">
                      <div className="bento-card-head">
                        <div className="card-head">
                          <h3>Corps</h3>
                          <span className="card-badge">{vitals.bmi_category || "—"}</span>
                        </div>
                        <div className="card-metric-row">
                          <AnimatedStat value={vitals.weight_kg} decimals={1} />
                          <span className="card-unit">kg</span>
                        </div>
                        <p className="card-meta">
                          IMC {vitals.bmi ?? "—"}
                          {vitals.height_cm != null && ` · ${vitals.height_cm} cm`}
                          {bodyFatPct != null && ` · ${bodyFatPct}% MG`}
                          {vitals.weight_delta_7d != null &&
                            ` · ${vitals.weight_delta_7d >= 0 ? "+" : ""}${vitals.weight_delta_7d} kg/7j`}
                        </p>
                      </div>
                      {weightSeries.length > 0 && (
                        <div className="bento-card-foot">
                          <WeightTrendChart
                            series={weightSeries}
                            focusDate={focus_date}
                            activeWeightDate={vitals.weight_date}
                            height={72}
                            compact
                          />
                        </div>
                      )}
                    </BentoCard>
                  )}
                  </div>
                </details>
              )}

              {/* Health Monitor */}
              {(active === "overview" || active === "health") && (
                <motion.section
                  id="health"
                  className="health-panel glass-panel span-health"
                  variants={fadeUp}
                  custom={2}
                  initial="hidden"
                  animate="show"
                >
                  <MetricLabel id="health_monitor" as="h3">
                    Moniteur santé
                  </MetricLabel>
                  <p className="panel-sub">Vitaux vs moyenne personnelle 30 jours</p>
                  <StatusLegend />
                  <div className="monitor-grid">
                    {health_monitor.map((m, i) => {
                      const monitorStatus = MONITOR_STATUS[m.status] || MONITOR_STATUS.normal;
                      return (
                      <motion.div
                        key={m.name}
                        className={`monitor-tile status-${m.status}`}
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 + i * 0.04 }}
                      >
                        <div className="monitor-tile-head">
                          <span className="monitor-name">
                            {m.name}
                            <InfoTip text={getMetricTip(m.name)} />
                          </span>
                          <StatusPill
                            zone={monitorStatus.zone}
                            label={monitorStatus.label}
                            size="xs"
                          />
                        </div>
                        <span className="monitor-val">
                          {formatMetricValue(m.name, m.value)} <small>{m.unit}</small>
                        </span>
                        <span className="monitor-base">moy. {formatMetricValue(m.name, m.baseline)}</span>
                        <MonitorDelta
                          name={m.name}
                          value={m.value}
                          baseline={m.baseline}
                          unit={m.unit === "ms" ? " ms" : m.unit === "bpm" ? " bpm" : m.unit === "/min" ? "/min" : m.unit === "%" ? "%" : ""}
                          lowerIsBetter={m.name === "FC repos" || m.name === "Respiration"}
                        />
                      </motion.div>
                    );
                    })}
                  </div>
                  <div className="vitals-row">
                    <div className="vital-cell">
                      <MetricLabel id="calories" className="vital-lbl">
                        Calories actives
                      </MetricLabel>
                      <span className="vital-val">
                        {activeKcal != null ? (
                          <>
                            {activeKcal.toLocaleString("fr-FR")} kcal{" "}
                            <StatusPill
                              zone={caloriesActiveStatus.zone}
                              label={caloriesActiveStatus.label}
                              size="xs"
                            />
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                      {totalKcalEst != null && (
                        <span className="vital-sub">
                          ~{totalKcalEst.toLocaleString("fr-FR")} kcal total estimé
                        </span>
                      )}
                    </div>
                    <div className="vital-cell">
                      <MetricLabel id="weight" className="vital-lbl">
                        Poids
                      </MetricLabel>
                      <span className="vital-val">
                        {vitals.weight_kg != null
                          ? `${formatMetricValue("weight", vitals.weight_kg)} kg`
                          : "—"}
                      </span>
                      {vitals.weight_date && (
                        <span className="vital-sub">mesuré {formatShortDate(vitals.weight_date)}</span>
                      )}
                    </div>
                    <div className="vital-cell">
                      <span className="vital-lbl">Taille</span>
                      <span className="vital-val">
                        {vitals.height_cm != null ? `${vitals.height_cm} cm` : "—"}
                      </span>
                    </div>
                    <div className="vital-cell">
                      <span className="vital-lbl">IMC</span>
                      <span className="vital-val">
                        {vitals.bmi != null ? (
                          <>
                            {vitals.bmi}{" "}
                            <StatusPill zone={bmiStatus.zone} label={bmiStatus.label} size="xs" />
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                    <div className="vital-cell">
                      <span className="vital-lbl">Δ poids 7j</span>
                      <span className="vital-val vital-val--stack">
                        {vitals.weight_delta_7d != null
                          ? `${vitals.weight_delta_7d >= 0 ? "+" : ""}${vitals.weight_delta_7d} kg`
                          : "—"}
                      </span>
                      {vitals.weight_delta_7d != null && (
                        <StatusPill
                          zone={weightDeltaStatus.zone}
                          label={weightDeltaStatus.label}
                          size="xs"
                        />
                      )}
                    </div>
                    <div className="vital-cell vital-cell--body-fat">
                      <BodyFatEditor
                        value={bodyFatPct}
                        isManual={bodyFatIsManual}
                        manualDate={manualDate}
                        focusDate={focus_date}
                        onSave={saveBodyFat}
                        onClear={clearBodyFat}
                        formatShortDate={formatShortDate}
                      />
                    </div>
                    <div className="vital-cell">
                      <MetricLabel id="vo2" className="vital-lbl">
                        VO₂ max
                      </MetricLabel>
                      <span className="vital-val">
                        {vitals.vo2_max != null ? formatMetricValue("vo2", vitals.vo2_max) : "—"}
                      </span>
                    </div>
                    <div className="vital-cell">
                      <MetricLabel id="Respiration" className="vital-lbl">
                        Respiration
                      </MetricLabel>
                      <span className="vital-val">
                        {vitals.respiratory != null
                          ? `${formatMetricValue("Respiration", vitals.respiratory)}/min`
                          : "—"}
                      </span>
                    </div>
                    <div className="vital-cell">
                      <span className="vital-lbl">Masse maigre</span>
                      <span className="vital-val">
                        {leanMassKg != null
                          ? `${formatMetricValue("weight", leanMassKg)} kg`
                          : "—"}
                      </span>
                      {bodyFatIsManual && leanMassKg != null && (
                        <span className="vital-sub">estimée depuis saisie MG</span>
                      )}
                    </div>
                  </div>
                  {weightSeries.length > 0 && (
                    <div className="weight-trend-wrap">
                      <WeightTrendChart
                        series={weightSeries}
                        focusDate={focus_date}
                        activeWeightDate={vitals.weight_date}
                        height={220}
                      />
                      <p className="card-meta weight-chart-note">
                        Le chiffre du jour utilise la dernière pesée connue
                        {vitals.weight_date && vitals.weight_date !== focus_date
                          ? ` (${formatShortDate(vitals.weight_date)})`
                          : ""}
                        . Les points du graphique sont les pesées réelles.
                      </p>
                    </div>
                  )}
                </motion.section>
              )}
              {(active === "overview" || active === "trends") && (
                <motion.section
                  id="trends"
                  className="trends-panel glass-panel span-trends"
                  variants={fadeUp}
                  custom={3}
                  initial="hidden"
                  animate="show"
                >
                  <MetricLabel id="trends" as="h3">
                    Rythme sur 14 jours
                  </MetricLabel>
                  <div className="trend-bars">
                    {history.map((d, i) => (
                      <motion.div
                        key={d.date}
                        className="trend-col"
                        title={`${d.date} — Récupération ${Math.round(d.recovery)} % · Charge ${Math.round(d.strain)} %`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className="trend-stack">
                          <motion.div
                            className="bar recovery"
                            style={{
                              height: `${d.recovery}%`,
                              background:
                                d.recovery >= 67
                                  ? "var(--green)"
                                  : d.recovery >= 34
                                    ? "var(--yellow)"
                                    : "var(--red)",
                            }}
                            initial={{ height: 0 }}
                            animate={{ height: `${d.recovery}%` }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                          />
                          <motion.div
                            className="bar strain"
                            initial={{ height: 0 }}
                            animate={{ height: `${d.strain}%` }}
                            transition={{ delay: 0.4 + i * 0.05, duration: 0.6 }}
                          />
                        </div>
                        <span className="trend-day">{d.date.slice(8)}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="trend-legend">
                    <span className="trend-legend-heading">Récupération</span>
                    <span><i className="dot green" /> Récupéré ≥ 67 %</span>
                    <span><i className="dot yellow" /> Modéré 34–66 %</span>
                    <span><i className="dot red" /> Fatigué &lt; 34 %</span>
                    <span className="trend-legend-sep" aria-hidden="true" />
                    <span><i className="dot blue" /> Charge</span>
                  </div>
                  <Sparkline data={recoveryHistory} color={recovery.color} label="recovery-trend" height={64} />
                </motion.section>
              )}

              {(active === "overview" || active === "trends") && (
                <ComparePanel
                  history={history}
                  weightSeries={weightSeries}
                  focusDate={focus_date}
                  weightDate={vitals.weight_date}
                />
              )}
            </div>
          )}

          {active === "insights" && (
            <div className="dashboard-grid">
              <header className="page-intro">
                <h2>{SECTION_INTRO.insights.title}</h2>
                <p>{SECTION_INTRO.insights.desc}</p>
              </header>
              {stress && (
                <motion.section className="hero-recovery glass-panel span-full" variants={fadeUp} initial="hidden" animate="show">
                  <div className="hero-left">
                    <MetricLabel id="stress" as="h2" className="hero-heading">
                      Moniteur stress
                    </MetricLabel>
                    <p className="hero-copy">Estimation depuis la FC diurne vs repos</p>
                    <p className="card-meta">
                      FC moy. {stress.hr_avg ?? "—"} bpm · repos {stress.rhr_baseline ?? "—"} bpm
                    </p>
                  </div>
                  <div className="hero-ring-wrap">
                    <AnimatedRing
                      value={stress.score ?? 0}
                      max={100}
                      size={260}
                      stroke={14}
                      color="#a78bfa"
                      glow
                    />
                    <div className="hero-score">
                      <AnimatedStat value={stress.score ?? 0} suffix="%" />
                      <span className="hero-score-label">{stress.label}</span>
                    </div>
                  </div>
                </motion.section>
              )}

              {physiological_age && (
                <BentoCard className="span-6" delay={1} accent="#38bdf8">
                  <MetricLabel id="x_age" as="h3">
                    Âge physiologique (X-Âge)
                  </MetricLabel>
                  <div className="card-metric-row">
                    <AnimatedStat value={physiological_age.functional_age} decimals={1} />
                    <span className="card-unit">ans fonctionnels</span>
                  </div>
                  <p className="card-meta">
                    Âge réel {physiological_age.real_age} · delta {physiological_age.delta_years >= 0 ? "+" : ""}
                    {physiological_age.delta_years} ans
                  </p>
                  {physiological_age.factors?.length > 0 && (
                    <ul className="factor-list">
                      {physiological_age.factors.map((f) => (
                        <li key={f.name}>
                          {f.name} ({f.impact >= 0 ? "+" : ""}{f.impact})
                        </li>
                      ))}
                    </ul>
                  )}
                </BentoCard>
              )}

              {pace_of_aging && (
                <BentoCard className="span-6" delay={2} accent="#34d399">
                  <MetricLabel id="pace_of_aging" as="h3">
                    Rythme de vieillissement
                  </MetricLabel>
                  <div className="card-metric-row">
                    <AnimatedStat
                      value={pace_of_aging.pace_years_per_year ?? 0}
                      decimals={2}
                    />
                    <span className="card-unit">ans/an</span>
                  </div>
                  <p className="card-meta">{pace_of_aging.label}</p>
                </BentoCard>
              )}

              <ManualBodyFatPanel
                focusDate={focus_date}
                bodyFatPct={bodyFatPct}
                bodyFatIsManual={bodyFatIsManual}
                manualDate={manualDate}
                leanMassKg={leanMassKg}
                weightKg={vitals.weight_kg}
                onSave={saveBodyFat}
                onClear={clearBodyFat}
                formatShortDate={formatShortDate}
              />

              <JournalPanel date={focus_date} />
              <JournalCorrelation history={history} />
            </div>
          )}

          {active === "coverage" && (
            <div className="dashboard-grid">
              <header className="page-intro">
                <h2>{SECTION_INTRO.coverage.title}</h2>
                <p>{SECTION_INTRO.coverage.desc}</p>
              </header>
              <CoveragePanel items={kpi_coverage} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
