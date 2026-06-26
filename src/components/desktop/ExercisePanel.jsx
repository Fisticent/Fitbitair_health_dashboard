import { MetricLabel } from "./InfoTip";
import { ExerciseIconBadge, ExerciseTypeChips, exerciseTypesForDay, primaryExerciseType } from "../lueur/exerciseIcons";
import { formatStepsWithKm } from "../lueur/chartUtils";

function formatShortDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatDistance(m) {
  if (m == null) return null;
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m} m`;
}

function formatSessionTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function sessionMeta(s) {
  const parts = [`${s.minutes} min`];
  if (s.distance_m != null) parts.push(formatDistance(s.distance_m));
  if (s.calories) parts.push(`${s.calories} kcal`);
  if (s.avg_hr) parts.push(`${s.avg_hr} bpm`);
  const start = formatSessionTime(s.start_time);
  if (start) parts.unshift(start);
  return parts.join(" · ");
}

function formatTypesSummary(types) {
  if (!types || !Object.keys(types).length) return null;
  return Object.entries(types)
    .map(([t, n]) => `${t}${n > 1 ? ` ×${n}` : ""}`)
    .join(", ");
}

function recentSessionStats(d) {
  if (d.count <= 0) return null;
  const parts = [`${d.count} session${d.count > 1 ? "s" : ""}`];
  if (d.minutes > 0) parts.push(`${d.minutes} min`);
  return parts.join(" · ");
}

function recentMovementStats(d) {
  if (d.steps > 0) return formatStepsWithKm(d.steps, d.distance_km);
  return null;
}

function recentActivityMeta(d) {
  const sessions = recentSessionStats(d);
  const movement = recentMovementStats(d);
  if (sessions && movement) return `${sessions} · ${movement}`;
  if (sessions) return sessions;
  if (movement) return `${movement} · marche non enregistrée`;
  return "—";
}

function LueurExercisePanel({
  exercise,
  exerciseRecent,
  focusDate,
  activeCalories,
  stepsToday,
  distanceKm,
  hasToday,
  hasCalories,
  hasStepsOnly,
  lastActive,
  recentOthers,
}) {
  const todayTypes = exercise?.types ? Object.keys(exercise.types) : [];
  const heroType = todayTypes[0] || primaryExerciseType(lastActive?.types) || "Marche";

  return (
    <section className="lueur-exercise" aria-label="Entraînement">
      <div className="lueur-exercise-head">
        <div>
          <span className="lueur-exercise-kicker">Charge</span>
          <h3 className="lueur-exercise-title">Entraînement</h3>
          <p className="lueur-exercise-sub">Fitbit · Health Connect</p>
        </div>
        {hasToday ? (
          <div className="lueur-exercise-summary">
            <span className="lueur-exercise-summary-val">
              {exercise.count} session{exercise.count > 1 ? "s" : ""}
            </span>
            <span className="lueur-exercise-summary-meta">{exercise.minutes} min aujourd&apos;hui</span>
          </div>
        ) : hasStepsOnly ? (
          <div className="lueur-exercise-summary">
            <span className="lueur-exercise-summary-val">
              {formatStepsWithKm(stepsToday, distanceKm)}
            </span>
            <span className="lueur-exercise-summary-meta">activité comptée · pas de session Fitbit</span>
          </div>
        ) : hasCalories ? (
          <div className="lueur-exercise-summary">
            <span className="lueur-exercise-summary-val">{activeCalories} kcal</span>
            <span className="lueur-exercise-summary-meta">actives · pas de session</span>
          </div>
        ) : (
          <span className="lueur-stat-badge lueur-stat-badge--neutral">Repos</span>
        )}
      </div>

      {hasToday && exercise.sessions?.length > 0 ? (
        <ul className="lueur-exercise-sessions">
          {exercise.sessions.map((s, i) => (
            <li key={`${s.type}-${s.start_time || i}`} className="lueur-exercise-session">
              <ExerciseIconBadge type={s.type} />
              <div className="lueur-exercise-session-body">
                <span className="lueur-exercise-session-type">{s.type}</span>
                <span className="lueur-exercise-session-meta">{sessionMeta(s)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="lueur-exercise-empty">
          <ExerciseIconBadge type={heroType} size={52} />
          <div>
            {hasStepsOnly ? (
              <>
                <p className="lueur-exercise-empty-title">
                  {formatStepsWithKm(stepsToday, distanceKm)} aujourd&apos;hui
                </p>
                <p className="lueur-exercise-empty-meta">
                  Pas comptés par Fitbit sans session « marche » enregistrée.
                </p>
              </>
            ) : lastActive ? (
              <>
                <p className="lueur-exercise-empty-title">
                  Dernière activité · {formatShortDate(lastActive.date)}
                </p>
                <p className="lueur-exercise-empty-meta">
                  {lastActive.count > 0
                    ? `${lastActive.count} session${lastActive.count > 1 ? "s" : ""} · ${lastActive.minutes} min`
                    : formatStepsWithKm(lastActive.steps, lastActive.distance_km) ?? "—"}
                </p>
                {formatTypesSummary(lastActive.types) && (
                  <p className="lueur-exercise-empty-types">{formatTypesSummary(lastActive.types)}</p>
                )}
              </>
            ) : (
              <>
                <p className="lueur-exercise-empty-title">Aucune session synchronisée</p>
                <p className="lueur-exercise-empty-meta">
                  Lance une marche ou un entraînement sur Fitbit, puis synchronise.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {recentOthers.length > 0 && (
        <div className="lueur-exercise-recent">
          <span className="lueur-exercise-recent-label">Activité récente</span>
          <ul className="lueur-exercise-recent-list">
            {recentOthers.map((d) => {
              const types = exerciseTypesForDay(d);
              const sessions = recentSessionStats(d);
              const movement = recentMovementStats(d);
              return (
                <li key={d.date} className="lueur-exercise-recent-item">
                  <div className="lueur-exercise-recent-main">
                    <div className="lueur-exercise-recent-head">
                      <span className="lueur-exercise-recent-date">{formatShortDate(d.date)}</span>
                      {sessions && (
                        <span className="lueur-exercise-recent-stat">{sessions}</span>
                      )}
                    </div>
                    {movement && (
                      <p className="lueur-exercise-recent-movement">{movement}</p>
                    )}
                    {d.kind === "steps" && !sessions && (
                      <p className="lueur-exercise-recent-note">Marche non enregistrée en session</p>
                    )}
                    <ExerciseTypeChips types={types} counts={d.types} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ExercisePanel({
  exercise,
  exerciseRecent = [],
  focusDate,
  today,
  activeCalories,
  stepsToday = 0,
  distanceKm,
  variant = "legacy",
}) {
  const hasToday = (exercise?.count ?? 0) > 0 || (exercise?.minutes ?? 0) > 0;
  const hasStepsOnly = !hasToday && stepsToday > 0;
  const hasCalories = activeCalories != null && activeCalories > 0;
  const lastActive = exerciseRecent.find((d) => d.count > 0 || d.steps > 0);
  const recentOthers = exerciseRecent
    .filter((d) => d.date !== focusDate && (d.count > 0 || d.steps > 0))
    .slice(0, 7);

  if (variant === "lueur") {
    return (
      <LueurExercisePanel
        exercise={exercise}
        exerciseRecent={exerciseRecent}
        focusDate={focusDate}
        activeCalories={activeCalories}
        stepsToday={stepsToday}
        distanceKm={distanceKm}
        hasToday={hasToday}
        hasCalories={hasCalories}
        hasStepsOnly={hasStepsOnly}
        lastActive={lastActive}
        recentOthers={recentOthers}
      />
    );
  }

  return (
    <section className="exercise-panel glass-panel span-full">
      <div className="exercise-panel-head">
        <div>
          <MetricLabel id="exercise" as="h3">
            Entraînement
          </MetricLabel>
          <p className="panel-sub">
            Sessions Fitbit / Health Connect — marche, course, muscu enregistrée
          </p>
        </div>
        {hasToday ? (
          <span className="card-badge">
            {exercise.count} session{exercise.count > 1 ? "s" : ""} · {exercise.minutes} min
            {hasCalories && ` · ${activeCalories} kcal actives`}
          </span>
        ) : hasStepsOnly ? (
          <span className="card-badge">{formatStepsWithKm(stepsToday, distanceKm)}</span>
        ) : hasCalories ? (
          <span className="card-badge">
            {activeCalories} kcal actives · pas de session enregistrée
          </span>
        ) : (
          <span className="card-badge card-badge--muted">Aucune session ce jour</span>
        )}
      </div>

      {hasToday && exercise.sessions?.length > 0 ? (
        <ul className="exercise-session-list">
          {exercise.sessions.map((s, i) => (
            <li key={`${s.type}-${s.start_time || i}`} className="exercise-session-item">
              <div className="exercise-session-main">
                <span className="exercise-session-type">{s.type}</span>
                <span className="exercise-session-meta">{sessionMeta(s)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="exercise-empty">
          {lastActive ? (
            <>
              Dernière activité le <strong>{formatShortDate(lastActive.date)}</strong>
              {" — "}
              {lastActive.count > 0 ? (
                <>
                  {lastActive.count} session{lastActive.count > 1 ? "s" : ""}, {lastActive.minutes} min
                </>
              ) : (
                <>{formatStepsWithKm(lastActive.steps, lastActive.distance_km)} (sans session enregistrée)</>
              )}
              {lastActive.types && Object.keys(lastActive.types).length > 0 &&
                ` (${Object.entries(lastActive.types).map(([t, n]) => `${t} ×${n}`).join(", ")})`}
            </>
          ) : (
            "Aucune session d'exercice dans les données synchronisées. Lance une marche ou un entraînement sur Fitbit puis synchronise."
          )}
        </p>
      )}

      {recentOthers.length > 0 && (
        <div className="exercise-recent">
          <span className="exercise-recent-label">Activité récente</span>
          <ul className="exercise-recent-list">
            {recentOthers.map((d) => (
              <li key={d.date}>
                <span className="exercise-recent-date">{formatShortDate(d.date)}</span>
                <span>
                  {recentActivityMeta(d)}
                  {d.types && Object.keys(d.types).length > 0 && ` · ${Object.keys(d.types).join(", ")}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
