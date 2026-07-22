import { motion } from "framer-motion";
import { useMotionSafe } from "../../hooks/useMotionSafe";

export function SyncOverlay() {
  const { fadeFast } = useMotionSafe();

  return (
    <motion.div
      className="lueur-sync-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      initial={fadeFast.initial}
      animate={fadeFast.animate}
      exit={fadeFast.exit}
      transition={fadeFast.transition}
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
