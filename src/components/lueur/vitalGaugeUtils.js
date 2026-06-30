import { COLORS } from "./chartUtils";

const AMBER = COLORS.AMBER;

/** Fallback σ when z ≈ 0 (on baseline). */
export const METRIC_DEFAULT_SIGMA = {
  "FC repos": 2,
  VFC: 5,
  Respiration: 0.8,
  "SpO₂": 1,
  "Temp. peau": 0.25,
};

/** Physiological display clamps [min, max]. */
export const METRIC_SCALE_CLAMP = {
  "FC repos": [45, 95],
  VFC: [15, 120],
  Respiration: [10, 24],
  "SpO₂": [92, 100],
  "Temp. peau": [33, 37],
};

export function inferSigma({ name, value, baseline, z }) {
  if (value != null && baseline != null && z != null && Math.abs(z) > 0.05) {
    return Math.abs(value - baseline) / Math.abs(z);
  }
  return METRIC_DEFAULT_SIGMA[name] ?? 1;
}

export function vitalGaugeConfig(metric) {
  const { value, baseline, name } = metric;
  if (value == null || baseline == null) return null;

  const sigma = inferSigma(metric);
  const normMin = baseline - sigma;
  const normMax = baseline + sigma;
  const warnEdge = baseline + 2 * sigma;

  let scaleMin = baseline - 2.5 * sigma;
  let scaleMax = baseline + 2.5 * sigma;
  const clamp = METRIC_SCALE_CLAMP[name];
  if (clamp) {
    scaleMin = Math.max(clamp[0], scaleMin);
    scaleMax = Math.min(clamp[1], scaleMax);
  }
  scaleMin = Math.min(scaleMin, value - sigma * 0.15);
  scaleMax = Math.max(scaleMax, value + sigma * 0.15);

  const segments = [
    { to: normMin, color: COLORS.BLUE, label: "Bas" },
    { to: normMax, color: COLORS.TEAL, label: "Ta norme" },
    { to: warnEdge, color: AMBER, label: "Écart" },
    { to: scaleMax, color: COLORS.CORAL, label: "Fort" },
  ];

  let activeIndex = 1;
  if (value < normMin) activeIndex = 0;
  else if (value <= normMax) activeIndex = 1;
  else if (value <= warnEdge) activeIndex = 2;
  else activeIndex = 3;

  return {
    scaleMin,
    scaleMax,
    segments,
    activeIndex,
    normMin,
    normMax,
    sigma,
  };
}
