import { motion } from "framer-motion";

export function SyncOverlay() {
  return (
    <motion.div
      className="lueur-sync-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="lueur-sync-bar" aria-hidden="true" />
      <div className="lueur-sync-overlay-panel">
        <div className="lueur-loader" aria-hidden="true" />
        <p className="lueur-sync-overlay-title">Synchronisation Google Health</p>
        <p className="lueur-sync-overlay-meta">
          Sommeil, pas, fréquence cardiaque, activité…
        </p>
      </div>
    </motion.div>
  );
}
