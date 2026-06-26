import { cn } from "@/lib/utils";

export function StatusPill({ zone = "neutral", label, className, size = "sm" }) {
  if (!label || label === "—") return null;

  return (
    <span
      className={cn(
        "status-pill",
        `status-pill--${zone}`,
        size === "xs" && "status-pill--xs",
        className,
      )}
      title={label}
    >
      <span className="status-pill-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/** 3-segment WHOOP-style rail; `value` 0–100 for scores or progress %. */
export function StatusRail({ value, max = 100, zones = [34, 67], className }) {
  if (value == null) return null;
  const pct = Math.min(100, Math.max(0, (Number(value) / max) * 100));

  return (
    <div
      className={cn("status-rail", className)}
      role="img"
      aria-label={`Position ${Math.round(pct)}%`}
    >
      <div className="status-rail-track">
        <span className="status-rail-seg status-rail-seg--red" style={{ flex: zones[0] }} />
        <span
          className="status-rail-seg status-rail-seg--yellow"
          style={{ flex: zones[1] - zones[0] }}
        />
        <span className="status-rail-seg status-rail-seg--green" style={{ flex: 100 - zones[1] }} />
        <span className="status-rail-marker" style={{ left: `${pct}%` }} />
      </div>
    </div>
  );
}

export function StatusLegend({ className }) {
  return (
    <div className={cn("status-legend", className)}>
      <span className="status-legend-item">
        <span className="status-pill-dot status-pill-dot--green" /> Optimal / dans ta norme
      </span>
      <span className="status-legend-item">
        <span className="status-pill-dot status-pill-dot--yellow" /> Modéré / à surveiller
      </span>
      <span className="status-legend-item">
        <span className="status-pill-dot status-pill-dot--red" /> Récupération / écart notable
      </span>
    </div>
  );
}
