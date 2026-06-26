import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LueurSidebar } from "./LueurSidebar";
import { ChartGradients } from "./MiniSparkChart";
import { TodayView } from "./TodayView";
import { SleepView } from "./SleepView";
import { ReadinessView } from "./ReadinessView";
import { StrainView } from "./StrainView";
import { HealthView } from "./HealthView";
import { PlusView } from "./PlusView";
import { ProfileView } from "./ProfileView";
import { LueurTopbarActions } from "./LueurTopbarActions";
import { SyncOverlay } from "./SyncOverlay";
import { useManualBodyFat, computeLeanMass, useStepsGoal, useCaloriesGoal, useProfileOverrides } from "../../hooks/useManualMetrics";
import { formatSyncTime } from "./chartUtils";

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
}) {
  const [section, setSection] = useState("today");

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

  const bodyFatPct = vitals?.body_fat_pct ?? manualBodyFat;
  const bodyFatIsManual = vitals?.body_fat_pct == null && manualBodyFat != null;
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
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onRefresh={onRefresh}
            syncing={syncing}
            syncLabel={syncLabel}
            datesWithData={datesWithData}
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
          {section !== "today" && section !== "profile" && (
            <div className="lueur-topbar">
              <div />
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

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {refreshing && <SyncOverlay key="sync-overlay" />}
      </AnimatePresence>

      <AnimatePresence>
        {syncMessage && (
          <motion.div
            className="lueur-sync-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {syncMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
