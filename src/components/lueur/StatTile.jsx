import { LueurMetricLabel } from "./LueurInfoTip";

const BADGE_CLASS = {
  green: "green",
  yellow: "yellow",
  red: "red",
  blue: "blue",
  orange: "coral",
  neutral: "neutral",
};

export function StatTile({ label, value, unit, meta, status, statusZone, footer, tipId }) {
  const badgeClass = BADGE_CLASS[statusZone] || "neutral";

  return (
    <div className="lueur-stat-tile">
      <span className="lueur-stat-kicker">
        {tipId ? <LueurMetricLabel id={tipId}>{label}</LueurMetricLabel> : label}
      </span>
      <div className="lueur-stat-value-row">
        <span className="lueur-stat-value">{value ?? "—"}</span>
        {unit && <span className="lueur-stat-unit">{unit}</span>}
      </div>
      {meta && <div className="lueur-stat-meta">{meta}</div>}
      {footer}
      {status && status !== "—" && (
        <span className={`lueur-stat-badge lueur-stat-badge--${badgeClass}`}>{status}</span>
      )}
    </div>
  );
}

export function StatGrid({ children, columns = 3 }) {
  return (
    <div className="lueur-stat-grid" style={{ "--stat-cols": columns }}>
      {children}
    </div>
  );
}
