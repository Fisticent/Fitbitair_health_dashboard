import { motion } from "framer-motion";
import { useMemo } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LueurDashboard } from "./components/lueur/LueurDashboard";
import { LoginView } from "./components/lueur/LoginView";
import { useAuth } from "./hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
import { useUserSettingsSync } from "./hooks/useUserSettingsSync";
import "./styles/lueur.css";

function readAuthError() {
  const params = new URLSearchParams(window.location.search);
  const err = params.get("auth_error");
  if (!err) return null;
  window.history.replaceState({}, "", window.location.pathname);
  return err;
}

export default function App() {
  const authError = useMemo(() => readAuthError(), []);
  const { loading: authLoading, authRequired, authenticated, user, login, logout } = useAuth();
  const settingsSyncEnabled = authRequired && authenticated;
  const { ready: settingsReady } = useUserSettingsSync({ enabled: settingsSyncEnabled });
  const canLoadDashboard =
    (!authRequired || authenticated) && (!settingsSyncEnabled || settingsReady);
  const {
    data,
    syncing,
    refreshing,
    error,
    selectedDate,
    setSelectedDate,
    refresh,
    syncMessage,
    reload,
  } = useDashboard({ enabled: canLoadDashboard });

  if (authLoading) {
    return (
      <div className="lueur-state-fullscreen">
        <motion.div
          className="lueur-loader"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        />
      </div>
    );
  }

  if (authRequired && !authenticated) {
    return <LoginView onLogin={login} authError={authError} user={user} />;
  }

  const waitingForDashboard = !data && !error;

  if (error && !data) {
    return (
      <div className="lueur-state-fullscreen">
        <h2>Connexion impossible</h2>
        <p>{error}</p>
        <code>cd dashboard/server && py -3 -m uvicorn main:app --host 127.0.0.1 --port 8000</code>
        <button type="button" className="lueur-btn-sync" onClick={refresh}>
          Réessayer
        </button>
      </div>
    );
  }

  if (waitingForDashboard) {
    return (
      <div className="lueur-state-fullscreen">
        <motion.div
          className="lueur-loader"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {!canLoadDashboard
            ? "Chargement des préférences…"
            : "Connexion Google Health… (première sync ~30 s)"}
        </motion.p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <LueurDashboard
        data={data}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onRefresh={refresh}
        syncing={syncing}
        refreshing={refreshing}
        error={error}
        syncMessage={syncMessage}
        onReload={reload}
        onLogout={authRequired ? logout : null}
        user={user}
      />
    </ErrorBoundary>
  );
}
