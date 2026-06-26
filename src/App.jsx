import { motion } from "framer-motion";
import { LueurDashboard } from "./components/lueur/LueurDashboard";
import { useDashboard } from "./hooks/useDashboard";
import "./styles/lueur.css";

export default function App() {
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
  } = useDashboard();

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
        />
      )}
    </>
  );
}
