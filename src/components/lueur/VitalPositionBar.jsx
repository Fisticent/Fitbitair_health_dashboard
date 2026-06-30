import { zoneColor } from "./chartUtils";
import { vitalGaugeConfig } from "./vitalGaugeUtils";

function positionPct(value, scaleMin, scaleMax) {
  const clamped = Math.max(scaleMin, Math.min(scaleMax, value));
  return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
}

export function VitalPositionBar({ metric, statusZone }) {
  const config = vitalGaugeConfig(metric);
  if (!config) return <span className="lueur-monitor-pos-empty">—</span>;

  const { scaleMin, scaleMax, normMin, normMax } = config;
  const { value, baseline, name, unit } = metric;
  const accent = zoneColor(statusZone);
  const normLeft = positionPct(normMin, scaleMin, scaleMax);
  const normWidth = positionPct(normMax, scaleMin, scaleMax) - normLeft;
  const avgLeft = positionPct(baseline, scaleMin, scaleMax);
  const valLeft = positionPct(value, scaleMin, scaleMax);
  const unitStr = unit === "/min" ? "/min" : unit ? ` ${unit}` : "";

  return (
    <div
      className="lueur-monitor-pos"
      role="img"
      aria-label={`${name} ${value}${unitStr}, moyenne ${baseline}${unitStr}, zone normale ${normMin} à ${normMax}`}
    >
      <div className="lueur-monitor-pos-track">
        <span
          className="lueur-monitor-pos-norm"
          style={{ left: `${normLeft}%`, width: `${normWidth}%`, background: accent }}
        />
        <span className="lueur-monitor-pos-avg" style={{ left: `${avgLeft}%` }} aria-hidden="true" />
        <span
          className="lueur-monitor-pos-dot"
          style={{ left: `${valLeft}%`, background: accent }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
