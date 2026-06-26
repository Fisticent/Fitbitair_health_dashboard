import { motion } from "framer-motion";
import { useMemo } from "react";
import { LueurDashboard } from "./components/lueur/LueurDashboard";
import { LoginView } from "./components/lueur/LoginView";
import { useAuth } from "./hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
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
  const canLoadDashboard = !authRequired || authenticated;
  const {
    data,
    loading,
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

  return (
    <>
      {loading && !data && (
        <div className="lueur-state-fullscreen">
          <motion.div
            className="lueur-loader"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          />
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            Connexion Google Health…
          </motion.p>
        </div>
      )}

      {error && !data && (
        <div className="lueur-state-fullscreen">
          <h2>Connexion impossible</h2>
          <p>{error}</p>
          <code>cd dashboard/server && py -3 -m uvicorn main:app --reload</code>
          <button type="button" className="lueur-btn-sync" onClick={refresh}>
            Réessayer
          </button>
        </div>
      )}

      {data && (
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
      )}
    </>
  );
}
