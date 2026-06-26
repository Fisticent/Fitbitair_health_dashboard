import { COLORS } from "./chartUtils";
import { ZoneGauge } from "./ZoneGauge";

const AMBER = "#d98a16";

function buildSegments(minKg, maxKg, scaleMin, scaleMax) {
  return [
    { to: minKg, color: COLORS.BLUE, label: "Sous" },
    { to: maxKg, color: COLORS.TEAL, label: "Cible" },
    { to: scaleMax, color: AMBER, label: "Sur" },
  ];
}

function activeIndex(weightKg, minKg, maxKg) {
  if (weightKg < minKg) return 0;
  if (weightKg <= maxKg) return 1;
  return 2;
}

export function WeightIdealGauge({ weightKg, ideal }) {
  if (weightKg == null || !ideal) return null;

  const { min_kg: minKg, max_kg: maxKg } = ideal;
  const scaleMin = Math.max(35, Math.round(minKg - 10));
  const scaleMax = Math.round(maxKg + 12);
  const segments = buildSegments(minKg, maxKg, scaleMin, scaleMax);

  return (
    <ZoneGauge
      value={weightKg}
      scaleMin={scaleMin}
      scaleMax={scaleMax}
      segments={segments}
      activeIndex={activeIndex(weightKg, minKg, maxKg)}
      ariaLabel={`Poids ${weightKg} kg — cible ${minKg} à ${maxKg} kg`}
      embedded
      legendDense
    />
  );
}
