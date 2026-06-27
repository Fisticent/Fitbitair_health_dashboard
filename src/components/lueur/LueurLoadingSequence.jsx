import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Premium "data streaming in" sequence shown while the first dashboard loads.
// Steps light up one at a time; the last one keeps spinning until real data
// arrives and this component unmounts.
const STEPS = [
  "Connexion à Google Health",
  "Synchronisation du sommeil",
  "VFC & fréquence cardiaque",
  "Température cutanée",
  "Calcul de la récupération",
  "Préparation du tableau de bord",
];

function CheckMark() {
  return (
    <motion.svg viewBox="0 0 24 24" className="lueur-loading-check" aria-hidden="true">
      <motion.path
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

export function LueurLoadingSequence({ subtitle }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    let i = 0;
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        i = Math.min(i + 1, STEPS.length - 1);
        setActive(i);
        if (i < STEPS.length - 1) schedule();
      }, 480 + Math.random() * 360);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Hold below 100% — the data isn't truly "done" until the view swaps in.
  const progress = Math.min(94, Math.round(((active + 0.6) / STEPS.length) * 100));
  const visible = STEPS.slice(0, active + 1);

  return (
    <div className="lueur-state-fullscreen">
      <div className="lueur-loading-seq">
        <div className="lueur-loading-orb" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="lueur-loading-brand">Lueur</div>

        <div className="lueur-loading-steps">
          {visible.map((label, i) => {
            const done = i < active;
            return (
              <motion.div
                key={label}
                className={`lueur-loading-step ${done ? "is-done" : "is-active"}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="lueur-loading-icon">
                  {done ? <CheckMark /> : <span className="lueur-loading-spinner" />}
                </span>
                <span className="lueur-loading-label">{label}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="lueur-loading-bar">
          <motion.div
            className="lueur-loading-bar-fill"
            initial={{ width: "6%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <p className="lueur-loading-sub">{subtitle || "Préparation de tes données…"}</p>
      </div>
    </div>
  );
}
