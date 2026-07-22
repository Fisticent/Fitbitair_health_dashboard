import { useState, useCallback, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LueurSidebar } from "./LueurSidebar";
import { ChartGradients } from "./MiniSparkChart";
import { TodayView } from "./TodayView";
import { LueurTopbarActions } from "./LueurTopbarActions";
import { SyncOverlay } from "./SyncOverlay";
import { useManualBodyFat, computeLeanMass, useStepsGoal, useCaloriesGoal, useProfileOverrides } from "../../hooks/useManualMetrics";
import { formatSyncTime, formatDateLong } from "./chartUtils";
import { useMotionSafe } from "../../hooks/useMotionSafe";

const SleepView = lazy(() =>
  import("./SleepView").then((m) => ({ default: m.SleepView })),
);
const ReadinessView = lazy(() =>
  import("./ReadinessView").then((m) => ({ default: m.ReadinessView })),
);
const StrainView = lazy(() =>
  import("./StrainView").then((m) => ({ default: m.StrainView })),
);
const HealthView = lazy(() =>
  import("./HealthView").then((m) => ({ default: m.HealthView })),
);
const PlusView = lazy(() =>
  import("./PlusView").then((m) => ({ default: m.PlusView })),
);
const ProfileView = lazy(() =>
  import("./ProfileView").then((m) => ({ default: m.ProfileView })),
);

export function LueurDashboard({
  data,
  selectedDate,
  onDateChange,
  onRefresh,
  syncing,
  refreshing,
  error,
  syncMessage,
  onReload,
  onLogout,
  user,
}) {
  const [section, setSection] = useState("today");
  const motionSafe = useMotionSafe();

  const {
    focus_date,
    today,
    dates_with_data,
    available_dates,
    synced_at,
    sync_warnings,
    vitals,
    history,
  } = data;

  const datesWithData = dates_with_data || available_dates || [];
  const hasDataForDay = datesWithData.includes(focus_date);

  const { stepsGoal, saveStepsGoal } = useStepsGoal();
  const { caloriesGoal, saveCaloriesGoal } = useCaloriesGoal();
  const { overrides, saveOverrides, clearOverrides } = useProfileOverrides();
  const stepsCount = vitals?.steps ?? 0;
  const stepsProgress = stepsGoal > 0 ? Math.min(100, Math.round((stepsCount / stepsGoal) * 100)) : 0;

  const {
    manualBodyFat,
    manualDate,
    saveBodyFat,
    clearBodyFat,
  } = useManualBodyFat(focus_date);

  // Manual entry wins over Google sync so "Saisir / modifier" actually updates the UI.
  const bodyFatPct = manualBodyFat ?? vitals?.body_fat_pct ?? null;
  const bodyFatIsManual = manualBodyFat != null;
  const leanMassKg = vitals?.lean_mass_kg ?? computeLeanMass(vitals?.weight_kg, bodyFatPct);

  const formatShortDate = useCallback((iso) => {
    if (!iso) return "";
    try {
      return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return iso;
    }
  }, []);

  const syncLabel = syncing
    ? "Synchronisation…"
    : synced_at
      ? `Synchronisé · ${formatSyncTime(synced_at) ?? "—"}`
      : "Non synchronisé";

  const isTodayFocus = focus_date === today;
  const todayGreeting = isTodayFocus ? "Bonjour" : formatDateLong(focus_date);
  const todaySubtitle = isTodayFocus
    ? `${formatDateLong(focus_date)} · Votre journée en un coup d'œil`
    : "Résumé de la journée sélectionnée";

  const navigate = (id) => {
    setSection(id);
    window.scrollTo(0, 0);
  };

  const renderView = () => {
    switch (section) {
      case "today":
        return (
          <TodayView
            data={data}
            stepsGoal={stepsGoal}
            stepsProgress={stepsProgress}
            onNavigate={navigate}
          />
        );
      case "sleep":
        return <SleepView data={data} history={history} onBack={() => navigate("today")} />;
      case "readiness":
        return (
          <ReadinessView
            data={data}
            history={history}
            stepsGoal={stepsGoal}
            onBack={() => navigate("today")}
          />
        );
      case "strain":
        return (
          <StrainView
            data={data}
            history={history}
            stepsGoal={stepsGoal}
            saveStepsGoal={saveStepsGoal}
            caloriesGoal={caloriesGoal}
            saveCaloriesGoal={saveCaloriesGoal}
          />
        );
      case "health":
        return (
          <HealthView
            data={data}
            bodyFatPct={bodyFatPct}
            bodyFatIsManual={bodyFatIsManual}
            manualDate={manualDate}
            leanMassKg={leanMassKg}
            saveBodyFat={saveBodyFat}
            clearBodyFat={clearBodyFat}
            formatShortDate={formatShortDate}
          />
        );
      case "plus":
        return <PlusView data={data} history={history} />;
      case "profile":
        return (
          <ProfileView
            profile={data.profile}
            synced_at={synced_at}
            overrides={overrides}
            saveOverrides={saveOverrides}
            clearOverrides={clearOverrides}
            stepsGoal={stepsGoal}
            saveStepsGoal={saveStepsGoal}
            caloriesGoal={caloriesGoal}
            saveCaloriesGoal={saveCaloriesGoal}
            onSaved={onReload}
            onLogout={onLogout}
            user={user}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`lueur-app${refreshing ? " is-syncing" : ""}`}>
      <ChartGradients />
      <LueurSidebar
        active={section}
        onNavigate={navigate}
        profileAge={data.profile?.age}
      />
      <main className="lueur-main">
        <div className="lueur-content">
          {section !== "profile" && (
            <div className="lueur-topbar lueur-topbar--global">
              <div className="lueur-topbar-leading" aria-hidden={section !== "today"}>
                {section === "today" && (
                  <>
                    <div className="lueur-greeting">{todayGreeting}</div>
                    <div className="lueur-subtitle">{todaySubtitle}</div>
                  </>
                )}
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
          )}

          {error && <p className="lueur-inline-error">{error}</p>}
          {sync_warnings?.length > 0 && !error && (
            <p className="lueur-inline-warn">
              Sync partielle : {sync_warnings.slice(0, 2).join(" · ")}
              {sync_warnings.length > 2 ? ` (+${sync_warnings.length - 2})` : ""}
            </p>
          )}
          {!hasDataForDay && section === "today" && (
            <p className="lueur-inline-warn">
              Aucune donnée synchronisée pour ce jour — les scores peuvent être vides ou estimés.
            </p>
          )}

          {/* No exit animation — avoids dual section trees in the a11y tree mid-swap. */}
          <motion.div
            key={section}
            initial={motionSafe.reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={motionSafe.fade.transition}
          >
            <Suspense fallback={<p className="lueur-meta">Chargement…</p>}>
              {renderView()}
            </Suspense>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {refreshing && <SyncOverlay key="sync-overlay" />}
      </AnimatePresence>

      <AnimatePresence>
        {syncMessage && (
          <motion.div
            className="lueur-sync-toast"
            initial={motionSafe.slideUp.initial}
            animate={motionSafe.slideUp.animate}
            exit={motionSafe.slideUp.exit}
            transition={motionSafe.slideUp.transition}
          >
            {syncMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
