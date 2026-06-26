import { COLORS } from "./chartUtils";

const ZONE_META = [
  { key: "fat_burn", label: "Brûlage", color: COLORS.TEAL },
  { key: "cardio", label: "Cardio", color: COLORS.BLUE },
  { key: "peak", label: "Pic", color: COLORS.CORAL },
];

export function ZoneBreakdownBar({ zones, totalMinutes }) {
  const items = ZONE_META.map((z) => ({
    ...z,
    minutes: zones?.[z.key] ?? 0,
  })).filter((z) => z.minutes > 0);

  const total = totalMinutes ?? items.reduce((s, z) => s + z.minutes, 0);
  if (!total) return null;

  return (
    <div className="lueur-zone-breakdown">
      <div
        className="lueur-zone-breakdown-bar"
        role="img"
        aria-label={items.map((z) => `${z.label} ${z.minutes} min`).join(", ")}
      >
        {items.map((z) => (
          <span
            key={z.key}
            className="lueur-zone-breakdown-seg"
            style={{
              flex: z.minutes,
              background: z.color,
            }}
            title={`${z.label} · ${z.minutes} min`}
          />
        ))}
      </div>
      <div className="lueur-zone-breakdown-legend">
        {ZONE_META.map((z) => {
          const mins = zones?.[z.key] ?? 0;
          return (
            <span key={z.key} className="lueur-zone-breakdown-item">
              <span className="lueur-zone-breakdown-dot" style={{ background: z.color }} />
              {z.label} {mins} min
            </span>
          );
        })}
      </div>
    </div>
  );
}
