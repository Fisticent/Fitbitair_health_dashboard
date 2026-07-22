import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LueurDashboard } from "./components/lueur/LueurDashboard";
import { LueurLoadingSequence } from "./components/lueur/LueurLoadingSequence";
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
  const reduceMotion = useReducedMotion();
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

  // Keep the premium loading sequence on screen long enough to be enjoyed even
  // when the cache is warm and data returns almost instantly.
  const [minDisplayDone, setMinDisplayDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDisplayDone(true), reduceMotion ? 400 : 1800);
    return () => clearTimeout(t);
  }, [reduceMotion]);

  if (authLoading) {
    return (
      <div className="lueur-state-fullscreen">
        <motion.div
          className="lueur-loader"
          animate={reduceMotion ? { opacity: 1 } : { rotate: 360 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { repeat: Infinity, duration: 1.2, ease: "linear" }
          }
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

  if (waitingForDashboard || !minDisplayDone) {
    return (
      <LueurLoadingSequence
        subtitle={
          !canLoadDashboard
            ? "Chargement de tes préférences…"
            : waitingForDashboard
              ? "Première synchronisation Google Health…"
              : "Préparation de ton tableau de bord…"
        }
      />
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
