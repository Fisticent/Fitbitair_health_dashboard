import { COLORS } from "./chartUtils";
import { ZoneGauge } from "./ZoneGauge";

const AMBER = "#d98a16";

const SCALE_MIN = 15;
const SCALE_MAX = 40;

const SEGMENTS = [
  { to: 18.5, color: COLORS.BLUE, label: "Bas" },
  { to: 25, color: COLORS.TEAL, label: "Normal" },
  { to: 30, color: AMBER, label: "Surp." },
  { to: SCALE_MAX, color: COLORS.CORAL, label: "Obés." },
];

const CATEGORY_INDEX = {
  "Insuffisance pondérale": 0,
  Normal: 1,
  Surpoids: 2,
  Obésité: 3,
};

export function BmiGauge({ bmi, category }) {
  if (bmi == null) return null;

  const activeIndex = CATEGORY_INDEX[category] ?? SEGMENTS.findIndex((seg) => bmi < seg.to);

  return (
    <ZoneGauge
      value={bmi}
      scaleMin={SCALE_MIN}
      scaleMax={SCALE_MAX}
      segments={SEGMENTS}
      activeIndex={activeIndex}
      ariaLabel={`IMC ${bmi} — ${category || SEGMENTS[activeIndex]?.label || ""}`}
      embedded
    />
  );
}
