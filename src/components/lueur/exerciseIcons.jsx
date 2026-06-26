import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Waves,
  Zap,
} from "lucide-react";

const RULES = [
  { match: /marche|walk|hik/i, Icon: Footprints, color: "#5b8def", bg: "#5b8def1a" },
  { match: /course|run|jog|trail/i, Icon: Activity, color: "#ef8a6a", bg: "#ef8a6a1a" },
  { match: /hiit|interval|tabata|crossfit|circuit/i, Icon: Zap, color: "#ef8a6a", bg: "#ef8a6a1a" },
  { match: /muscu|strength|weight|halt|gym/i, Icon: Dumbbell, color: "#6b727d", bg: "#eef0f3" },
  { match: /vélo|velo|bike|cycl|spin/i, Icon: Bike, color: "#15b393", bg: "#15b3931a" },
  { match: /natation|swim|pool/i, Icon: Waves, color: "#5b8def", bg: "#5b8def1a" },
];

const DEFAULT = { Icon: Activity, color: "#6b727d", bg: "#eef0f3" };

export function resolveExerciseVisual(type) {
  const label = type || "Autre";
  for (const rule of RULES) {
    if (rule.match.test(label)) {
      return { Icon: rule.Icon, color: rule.color, bg: rule.bg, label };
    }
  }
  return { ...DEFAULT, label };
}

export function primaryExerciseType(types) {
  if (!types || typeof types !== "object") return "Autre";
  const entries = Object.entries(types);
  if (!entries.length) return "Autre";
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

/** Ordered type labels for a day (sessions or steps-only). */
export function exerciseTypesForDay(day) {
  if (!day) return [];
  if (day.kind === "steps") return ["Marche"];
  if (day.types && Object.keys(day.types).length > 0) {
    return Object.entries(day.types)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
  }
  if (day.count > 0) return [primaryExerciseType(day.types)];
  if (day.steps > 0) return ["Marche"];
  return [];
}

export function ExerciseIconBadge({ type, size = 44, title }) {
  const { Icon, color, bg, label } = resolveExerciseVisual(type);
  const iconSize = Math.round(size * 0.46);

  return (
    <div
      className="lueur-ex-icon"
      style={{ width: size, height: size, background: bg, color }}
      title={title ?? label}
      aria-label={title ?? label}
    >
      <Icon size={iconSize} strokeWidth={2} aria-hidden />
    </div>
  );
}

export function ExerciseTypeChips({ types, counts }) {
  const list = types?.length ? types : ["Autre"];
  return (
    <div className="lueur-ex-type-chips">
      {list.map((t) => {
        const { Icon, color, bg, label } = resolveExerciseVisual(t);
        const n = counts?.[t];
        return (
          <span
            key={t}
            className="lueur-ex-type-chip"
            style={{ color, background: bg }}
          >
            <Icon size={13} strokeWidth={2.25} aria-hidden />
            <span>
              {label}
              {n > 1 ? ` ×${n}` : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}
