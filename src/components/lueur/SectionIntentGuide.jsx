import { motion } from "framer-motion";
import { SECTION_INTENTS, intentForSection } from "../../data/sectionIntents";
import { useMotionSafe } from "../../hooks/useMotionSafe";

export function SectionIntentGuide({ active, onNavigate, compact = false }) {
  const current = intentForSection(active);
  const { reduce } = useMotionSafe();
  const ease = [0.22, 1, 0.36, 1];
  const enter = reduce
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: compact ? -6 : -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: compact ? 0.35 : 0.4, ease },
      };

  if (compact && current) {
    return (
      <motion.div
        className="lueur-intent-guide lueur-intent-guide--compact"
        initial={enter.initial}
        animate={enter.animate}
        transition={enter.transition}
      >
        <div className="lueur-intent-compact-inner">
          <span className="lueur-intent-compact-dot" style={{ background: current.dot }} />
          <div className="lueur-intent-compact-copy">
            <span className="lueur-intent-compact-label">{current.label}</span>
            <p className="lueur-intent-compact-question">{current.question}</p>
            {current.detail && (
              <span className="lueur-intent-compact-detail">{current.detail}</span>
            )}
          </div>
        </div>
        <div className="lueur-intent-compact-nav" role="tablist" aria-label="Autres espaces">
          {SECTION_INTENTS.filter((s) => s.id !== active).map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className="lueur-intent-pill"
              onClick={() => onNavigate(item.id)}
            >
              <span className="lueur-intent-pill-dot" style={{ background: item.dot }} />
              {item.label}
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.section
      className="lueur-intent-guide"
      aria-label="Guide des espaces"
      initial={enter.initial}
      animate={enter.animate}
      transition={enter.transition}
    >
      <div className="lueur-intent-guide-head">
        <p className="lueur-intent-guide-kicker">Votre parcours</p>
        <p className="lueur-intent-guide-lead">Une question par espace — choisissez où regarder.</p>
      </div>

      <div className="lueur-intent-grid">
        {SECTION_INTENTS.map((item, i) => {
          const isActive = item.id === active;
          return (
            <motion.button
              key={item.id}
              type="button"
              className={`lueur-intent-card${isActive ? " is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 0.35, delay: i * 0.04, ease }
              }
              aria-current={isActive ? "page" : undefined}
            >
              <span className="lueur-intent-card-accent" style={{ background: item.dot }} />
              <span className="lueur-intent-card-label">{item.label}</span>
              <blockquote className="lueur-intent-card-question">{item.question}</blockquote>
              {item.detail && (
                <span className="lueur-intent-card-detail">{item.detail}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
