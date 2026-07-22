import { useMemo, useState } from "react";
import { COLORS, formatChartDate } from "./chartUtils";
import { useFluidChartSize } from "./useFluidChartSize";

/**
 * Strain × Recovery fit map (WHOOP-style 2D zone chart).
 *
 * X = recovery (0–100), Y = strain (0–100). The background is shaded by the
 * same pairing logic as `strainRecoveryFit`: for a given recovery column the
 * advisable strain ceiling rises, so green = strain matched to recovery,
 * amber = at the advised limit, coral = too much for that recovery.
 * Each dot is one day; today is highlighted. Reveals whether you repeatedly
 * overreach (cluster up-left) or leave headroom (cluster down-right).
 */

const ZONE_FILL = { green: "#15b393", amber: "#f0a830", coral: "#ef6a5a", orange: "#f3933e" };

// Recovery columns (x) and their strain bands (y), straight from strainRecoveryFit.
const COLUMNS = [
  // red recovery (0–34): tight ceiling
  { x0: 0, x1: 34, bands: [
    { s0: 0, s1: 38, zone: "green" },
    { s0: 38, s1: 57, zone: "amber" },
    { s0: 57, s1: 100, zone: "coral" },
  ] },
  // yellow recovery (34–67)
  { x0: 34, x1: 67, bands: [
    { s0: 0, s1: 57, zone: "green" },
    { s0: 57, s1: 76, zone: "amber" },
    { s0: 76, s1: 100, zone: "coral" },
  ] },
  // green recovery (67–100): most headroom
  { x0: 67, x1: 100, bands: [
    { s0: 0, s1: 67, zone: "green" },
    { s0: 67, s1: 86, zone: "amber" },
    { s0: 86, s1: 100, zone: "orange" },
  ] },
];

function recoveryZoneOf(pct) {
  if (pct >= 67) return "green";
  if (pct >= 34) return "yellow";
  return "red";
}

/** Fit zone (green/amber/coral/orange) for an arbitrary day. */
function fitZoneOf(strain, recovery) {
  const col = COLUMNS[recoveryZoneOf(recovery) === "red" ? 0 : recoveryZoneOf(recovery) === "yellow" ? 1 : 2];
  const band = col.bands.find((b) => strain >= b.s0 && strain < b.s1) || col.bands[col.bands.length - 1];
  return band.zone;
}

const W = 300;
const H = 296;
const PAD = { t: 14, r: 14, b: 34, l: 36 };

export function StrainFitChart({ history, focusDate, todayStrain, todayRecovery }) {
  const [hover, setHover] = useState(null);
  const { ref, vw, vh, scale: s } = useFluidChartSize({ w: W, h: H }, 240);
  const pad = { t: PAD.t * s, r: PAD.r * s, b: PAD.b * s, l: PAD.l * s };

  const points = useMemo(() => {
    const rows = (history || []).filter(
      (d) => d.strain != null && d.recovery != null,
    );
    // Make sure today is represented even if the history row lags the live values.
    if (
      focusDate &&
      todayStrain != null &&
      todayRecovery != null &&
      !rows.some((r) => r.date === focusDate)
    ) {
      rows.push({ date: focusDate, strain: todayStrain, recovery: todayRecovery });
    }
    return rows.slice(-7);
  }, [history, focusDate, todayStrain, todayRecovery]);

  const plotW = vw - pad.l - pad.r;
  const plotH = vh - pad.t - pad.b;
  const xOf = (rec) => pad.l + plotW * (Math.min(100, Math.max(0, rec)) / 100);
  const yOf = (str) => pad.t + plotH * (1 - Math.min(100, Math.max(0, str)) / 100);

  if (!points.length) {
    return (
      <p className="lueur-meta">
        Pas encore assez de jours avec charge et récupération pour tracer la carte.
      </p>
    );
  }

  const hovered = hover != null ? points[hover] : null;

  return (
    <div className="lueur-fit-chart">
      <div ref={ref} className="lueur-chart-fluid-wrap">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width="100%"
        className="lueur-fit-chart-svg lueur-chart-fluid-svg"
        role="img"
        aria-label="Carte d'adéquation charge / récupération"
      >
        {/* zone backgrounds */}
        {COLUMNS.map((col) =>
          col.bands.map((b) => (
            <rect
              key={`${col.x0}-${b.s0}`}
              x={xOf(col.x0)}
              y={yOf(b.s1)}
              width={xOf(col.x1) - xOf(col.x0)}
              height={yOf(b.s0) - yOf(b.s1)}
              fill={ZONE_FILL[b.zone]}
              fillOpacity="0.16"
            />
          )),
        )}

        {/* recovery column dividers (34 / 67) */}
        {[34, 67].map((rec) => (
          <line
            key={rec}
            x1={xOf(rec)}
            y1={pad.t}
            x2={xOf(rec)}
            y2={pad.t + plotH}
            stroke="#ffffff"
            strokeWidth={1.5 * s}
            strokeOpacity="0.7"
          />
        ))}

        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + plotH} stroke="#d6dae1" strokeWidth={1 * s} />
        <line x1={pad.l} y1={pad.t + plotH} x2={pad.l + plotW} y2={pad.t + plotH} stroke="#d6dae1" strokeWidth={1 * s} />

        {[0, 50, 100].map((val) => (
          <text key={val} x={pad.l - 6 * s} y={yOf(val) + 3 * s} textAnchor="end" className="lueur-fit-tick" fontSize={10 * s}>
            {val}
          </text>
        ))}
        {[0, 34, 67, 100].map((r) => (
          <text key={r} x={xOf(r)} y={pad.t + plotH + 14 * s} textAnchor="middle" className="lueur-fit-tick" fontSize={10 * s}>
            {r}
          </text>
        ))}

        {/* history points */}
        {points.map((d, i) => {
          const isToday = d.date === focusDate;
          const zone = fitZoneOf(d.strain, d.recovery);
          return (
            <circle
              key={d.date}
              cx={xOf(d.recovery)}
              cy={yOf(d.strain)}
              r={isToday ? 6 * s : 3.4 * s}
              fill={isToday ? ZONE_FILL[zone] : "#5b6472"}
              fillOpacity={isToday ? 1 : 0.55}
              stroke={isToday ? "#fff" : "none"}
              strokeWidth={isToday ? 2 * s : 0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onPointerDown={() => setHover(i)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {/* hover tooltip */}
        {hovered && (
          <g pointerEvents="none">
            <line
              x1={xOf(hovered.recovery)}
              y1={pad.t}
              x2={xOf(hovered.recovery)}
              y2={pad.t + plotH}
              stroke="var(--lueur-muted)"
              strokeDasharray="3 3"
              strokeOpacity="0.5"
              strokeWidth={1 * s}
            />
            <text
              x={Math.min(xOf(hovered.recovery) + 6 * s, vw - 4 * s)}
              y={Math.max(yOf(hovered.strain) - 8 * s, pad.t + 10 * s)}
              textAnchor={xOf(hovered.recovery) > vw - 70 * s ? "end" : "start"}
              className="lueur-fit-tip"
              fontSize={10 * s}
            >
              {formatChartDate(hovered.date)} · charge {Math.round(hovered.strain)} · récup {Math.round(hovered.recovery)}
            </text>
          </g>
        )}
      </svg>
      </div>

      <div className="lueur-fit-axis-labels">
        <span>← moins récupéré</span>
        <span className="lueur-fit-axis-x">Récupération →</span>
      </div>

      <div className="lueur-chart-legend" style={{ marginTop: 10 }}>
        <span className="lueur-chart-legend-item">
          <span className="lueur-chart-legend-dot" style={{ background: ZONE_FILL.green }} />
          Adapté
        </span>
        <span className="lueur-chart-legend-item">
          <span className="lueur-chart-legend-dot" style={{ background: ZONE_FILL.amber }} />
          Limite conseillée
        </span>
        <span className="lueur-chart-legend-item">
          <span className="lueur-chart-legend-dot" style={{ background: ZONE_FILL.coral }} />
          Trop pour ta récup
        </span>
      </div>
      <p className="lueur-chart-footnote">
        Axe vertical = charge, horizontal = récupération. Chaque point est un jour ; le gros
        point est aujourd'hui. Vise le vert : ta charge montée avec ta récup.
      </p>
    </div>
  );
}
