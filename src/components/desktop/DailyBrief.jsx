import { RECOVERY_ZONE_LABEL } from "../../data/labels";
import { formatStepsWithKm, formatKm, resolveDistanceKm } from "../lueur/chartUtils";

function formatShort(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function formatSleepHours(hours) {
  if (hours == null || Number.isNaN(hours)) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const ZONE_ACCENT = {
  green: "#15b393",
  yellow: "#5b8def",
  red: "#ef8a6a",
};

function buildMetrics({ recovery, strain, strainFit, sleep, steps, stepsGoal, stepsProgress, distanceKm, activeKcal }) {
  const items = [];

  if (recovery?.score != null) {
    items.push({
      key: "recovery",
      label: "Récupération",
      value: `${recovery.score}`,
      unit: "%",
      sub: RECOVERY_ZONE_LABEL[recovery.zone] || "—",
      accent: ZONE_ACCENT[recovery.zone] || "#15b393",
    });
  }

  if (strain?.score != null) {
    items.push({
      key: "strain",
      label: "Charge",
      value: String(strain.score),
      unit: "%",
      sub: strainFit?.label || strain.label,
      accent: "#ef8a6a",
    });
  }

  if (sleep?.hours != null) {
    const sleepSub = [
      sleep.score != null ? `Score ${sleep.score} %` : null,
      sleep.naps_hours > 0
        ? `${formatSleepHours(sleep.main_hours)} nuit · +${formatSleepHours(sleep.naps_hours)} sieste`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    items.push({
      key: "sleep",
      label: "Sommeil",
      value: formatSleepHours(sleep.hours),
      unit: null,
      sub: sleepSub || null,
      accent: "#5b8def",
    });
  }

  if (steps != null) {
    const km = formatKm(resolveDistanceKm(steps, distanceKm));
    const subParts = [];
    if (stepsGoal != null) subParts.push(`${stepsProgress}%`);
    if (km) subParts.push(`${km} km`);
    items.push({
      key: "steps",
      label: "Pas",
      value: steps.toLocaleString("fr-FR"),
      unit: null,
      sub: subParts.length ? subParts.join(" · ") : null,
      accent: "#6b727d",
    });
  }

  if (activeKcal != null) {
    items.push({
      key: "kcal",
      label: "Actives",
      value: String(activeKcal),
      unit: "kcal",
      sub: null,
      accent: "#ef8a6a",
    });
  }

  return items;
}

function LueurBrief({ title, lead, metrics, notice }) {
  return (
    <section className="lueur-brief" aria-label={title}>
      <div className="lueur-brief-inner">
        <div className="lueur-brief-copy">
          <span className="lueur-brief-kicker">Briefing</span>
          <h2 className="lueur-brief-title">{title}</h2>
          <p className="lueur-brief-lead">{lead}</p>
        </div>
        {metrics.length > 0 && (
          <div className="lueur-brief-metrics" role="list">
            {metrics.map((m) => (
              <div
                key={m.key}
                className="lueur-brief-chip"
                style={{ "--chip-accent": m.accent }}
                role="listitem"
              >
                <div className="lueur-brief-chip-head">
                  <span className="lueur-brief-chip-dot" aria-hidden />
                  <span className="lueur-brief-chip-label">{m.label}</span>
                </div>
                <span className="lueur-brief-chip-value">
                  {m.value}
                  {m.unit && <small>{m.unit}</small>}
                </span>
                {m.sub ? (
                  <span className="lueur-brief-chip-sub">{m.sub}</span>
                ) : (
                  <span className="lueur-brief-chip-sub lueur-brief-chip-sub--empty" aria-hidden />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {notice && (
        <p className="lueur-brief-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

export function DailyBrief({
  focusDate,
  today,
  recovery,
  strain,
  strainFit,
  sleep,
  steps,
  stepsGoal,
  stepsProgress,
  distanceKm,
  activeKcal,
  variant = "legacy",
}) {
  const isToday = focusDate === today;
  const title = isToday ? "Briefing du jour" : `Résumé · ${formatShort(focusDate)}`;

  const lead =
    recovery?.zone === "green"
      ? "Bonne base pour une journée active."
      : recovery?.zone === "yellow"
        ? "Journée modérée conseillée — écoute ton corps."
        : "Priorité récupération — évite de forcer.";

  const notice = strain?.notice && strain.source !== "zones" ? strain.notice : null;

  if (variant === "lueur") {
    const metrics = buildMetrics({
      recovery,
      strain,
      strainFit,
      sleep,
      steps,
      stepsGoal,
      stepsProgress,
      distanceKm,
      activeKcal,
    });

    return (
      <LueurBrief
        title={isToday ? "Votre journée" : title}
        lead={lead}
        metrics={metrics}
        notice={notice}
      />
    );
  }

  const bullets = [];
  if (recovery?.score != null) {
    bullets.push(
      `Récupération ${recovery.score} % (${RECOVERY_ZONE_LABEL[recovery.zone] || "—"})`,
    );
  }
  if (strain?.score != null) {
    bullets.push(`Charge ${strain.score} % · ${strainFit?.label || strain.label}`);
  }
  if (sleep?.hours != null) {
    bullets.push(`Sommeil ${sleep.hours}h (${sleep.score} %)`);
  }
  if (steps != null) {
    bullets.push(
      formatStepsWithKm(steps, distanceKm) +
        (stepsGoal ? ` (${stepsProgress} % objectif)` : ""),
    );
  }
  if (activeKcal != null) {
    bullets.push(`${activeKcal} kcal actives`);
  }

  return (
    <section className="daily-brief glass-panel span-full" aria-label={title}>
      <div className="daily-brief-head">
        <h2 className="daily-brief-title">{title}</h2>
        <p className="daily-brief-lead">{lead}</p>
      </div>
      {bullets.length > 0 && (
        <ul className="daily-brief-list">
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      {notice && (
        <p className="daily-brief-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
