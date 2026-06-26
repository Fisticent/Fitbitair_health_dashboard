import { COLORS } from "./chartUtils";
import { ZoneGauge } from "./ZoneGauge";

const AMBER = "#d98a16";

const SCALE_MIN = 0.4;
const SCALE_MAX = 1.6;

const SEGMENTS = [
  { to: 0.8, color: COLORS.BLUE, label: "Sous-charge" },
  { to: 1.3, color: COLORS.TEAL, label: "Optimal" },
  { to: 1.5, color: AMBER, label: "Prudence" },
  { to: SCALE_MAX, color: COLORS.CORAL, label: "Surcharge" },
];

const ZONE_INDEX = { low: 0, optimal: 1, caution: 2, high: 3 };

export function LoadBalanceGauge({ ratio, zone }) {
  if (ratio == null) return null;

  const activeIndex = ZONE_INDEX[zone] ?? SEGMENTS.findIndex((seg) => ratio < seg.to);

  return (
    <ZoneGauge
      value={ratio}
      scaleMin={SCALE_MIN}
      scaleMax={SCALE_MAX}
      segments={SEGMENTS}
      activeIndex={activeIndex}
      ariaLabel={`Équilibre de charge — ${SEGMENTS[activeIndex]?.label || ""}`}
    />
  );
}
