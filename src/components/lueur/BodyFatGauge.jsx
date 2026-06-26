import { COLORS } from "./chartUtils";
import { ZoneGauge } from "./ZoneGauge";

const AMBER = "#d98a16";

function buildSegments(minPct, maxPct, scaleMax) {
  return [
    { to: minPct, color: COLORS.BLUE, label: "Bas" },
    { to: maxPct, color: COLORS.TEAL, label: "Sain" },
    { to: Math.min(scaleMax, maxPct + 10), color: AMBER, label: "Élevé" },
    { to: scaleMax, color: COLORS.CORAL, label: "Haut" },
  ];
}

function activeIndex(value, minPct, maxPct, elevatedTo) {
  if (value < minPct) return 0;
  if (value <= maxPct) return 1;
  if (value <= elevatedTo) return 2;
  return 3;
}

export function BodyFatGauge({ value, ideal }) {
  if (value == null || !ideal) return null;

  const { min_pct: minPct, max_pct: maxPct } = ideal;
  const scaleMin = Math.max(4, Math.round(minPct - 6));
  const scaleMax = Math.max(32, Math.round(maxPct + 14));
  const elevatedTo = Math.min(scaleMax, maxPct + 10);
  const segments = buildSegments(minPct, maxPct, scaleMax);

  return (
    <ZoneGauge
      value={value}
      scaleMin={scaleMin}
      scaleMax={scaleMax}
      segments={segments}
      activeIndex={activeIndex(value, minPct, maxPct, elevatedTo)}
      ariaLabel={`Masse grasse ${value} % — cible ${minPct} à ${maxPct} %`}
      embedded
      legendDense
    />
  );
}
