/**
 * Status zones — inspired by WHOOP (3-color readiness) & Oura (optimal/good/fair/attention).
 * Scores 0–100 use WHOOP thresholds; vitals use personal baseline (z-score).
 */

export const ZONE_LABELS = {
  green: "Optimal",
  yellow: "Modéré",
  red: "À récupérer",
  blue: "Léger",
  orange: "Élevé",
  neutral: "—",
};

export const MONITOR_STATUS = {
  normal: { zone: "green", label: "Dans ta norme" },
  warning: { zone: "yellow", label: "À surveiller" },
  alert: { zone: "red", label: "Écart notable" },
};

/** WHOOP-style 0–100 score zones (Recovery, Sleep performance). */
export function scoreZone(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return { zone: "neutral", label: "—" };
  const n = Number(pct);
  if (n >= 67) return { zone: "green", label: ZONE_LABELS.green };
  if (n >= 34) return { zone: "yellow", label: ZONE_LABELS.yellow };
  return { zone: "red", label: ZONE_LABELS.red };
}

/** Oura-style 4-tier (optional detail). */
export function ouraTier(pct) {
  if (pct == null) return null;
  const n = Number(pct);
  if (n >= 85) return "Optimal";
  if (n >= 70) return "Bon";
  if (n >= 60) return "Correct";
  return "Attention";
}

/** Strain intensity 0–100 % (informational, not good/bad alone). */
export function strainIntensityZone(score) {
  if (score == null) return { zone: "neutral", label: "—" };
  const s = Number(score);
  if (s < 48) return { zone: "blue", label: "Léger" };
  if (s < 67) return { zone: "green", label: "Modéré" };
  if (s < 86) return { zone: "yellow", label: "Élevé" };
  return { zone: "orange", label: "Maximal" };
}

/**
 * Strain vs Recovery fit (WHOOP pairing logic).
 * High strain on low recovery = red; moderate strain on green recovery = green.
 */
export function strainRecoveryFit(strainScore, recoveryZone) {
  const s = Number(strainScore) || 0;
  if (recoveryZone === "green") {
    if (s <= 67) return { zone: "green", label: "Adapté à ta récup" };
    if (s <= 86) return { zone: "yellow", label: "Charge soutenue" };
    return { zone: "orange", label: "Grosse journée" };
  }
  if (recoveryZone === "yellow") {
    if (s <= 57) return { zone: "green", label: "Charge OK" };
    if (s <= 76) return { zone: "yellow", label: "Limite conseillée" };
    return { zone: "red", label: "Trop pour aujourd'hui" };
  }
  if (s <= 38) return { zone: "green", label: "Repos actif" };
  if (s <= 57) return { zone: "yellow", label: "Limite basse récup" };
  return { zone: "red", label: "Réduis l'effort" };
}

export function stressZone(score) {
  if (score == null) return { zone: "neutral", label: "—" };
  const n = Number(score);
  // Score is centred on 50 = personal baseline (see compute_stress_proxy).
  if (n < 40) return { zone: "green", label: "Bas" };
  if (n < 70) return { zone: "yellow", label: "Modéré" };
  return { zone: "red", label: "Élevé" };
}

/** Zone from the backend's own level so colour always matches its label. */
export function stressZoneFromLevel(level, label) {
  const map = {
    low: { zone: "green", label: "Bas" },
    medium: { zone: "yellow", label: "Modéré" },
    high: { zone: "red", label: "Élevé" },
  };
  const base = map[level] || { zone: "neutral", label: "—" };
  return label ? { ...base, label } : base;
}

export function stepsZone(progressPct) {
  if (progressPct == null) return { zone: "neutral", label: "—" };
  const n = Number(progressPct);
  if (n >= 100) return { zone: "green", label: "Objectif atteint" };
  if (n >= 75) return { zone: "green", label: "Presque là" };
  if (n >= 50) return { zone: "yellow", label: "En cours" };
  return { zone: "red", label: "Bas aujourd'hui" };
}

/** Active calories vs 14d average (Fitbit active-energy-burned). */
export function caloriesActiveZone(activeKcal, avgActive14d) {
  if (activeKcal == null) return { zone: "neutral", label: "—" };
  const a = Number(activeKcal);
  const avg = Number(avgActive14d) || 500;
  if (a >= avg * 0.95) return { zone: "green", label: "Activité normale" };
  if (a >= avg * 0.65) return { zone: "yellow", label: "Sous ta moyenne" };
  return { zone: "orange", label: "Peu actif" };
}

export function caloriesTotalZone(totalEst, goal) {
  if (totalEst == null || !goal) return { zone: "neutral", label: "—" };
  const pct = (Number(totalEst) / Number(goal)) * 100;
  if (pct >= 95 && pct <= 110) return { zone: "green", label: "Dans l'objectif" };
  if (pct < 85) return { zone: "yellow", label: "Sous objectif" };
  if (pct > 115) return { zone: "orange", label: "Au-dessus objectif" };
  return { zone: "green", label: "Proche objectif" };
}

export function weightDeltaZone(deltaKg) {
  if (deltaKg == null) return { zone: "neutral", label: "—" };
  const d = Math.abs(Number(deltaKg));
  if (d <= 0.3) return { zone: "green", label: "Stable" };
  if (d <= 1) return { zone: "yellow", label: "Variation légère" };
  return { zone: "orange", label: "Variation marquée" };
}

export function bmiZone(category) {
  if (!category) return { zone: "neutral", label: "—" };
  if (category === "Normal") return { zone: "green", label: category };
  if (category.includes("Insuffisance")) return { zone: "yellow", label: category };
  return { zone: "orange", label: category };
}

/** Ideal target band (weight or body fat). */
export function idealTargetZone(target) {
  if (!target || target.in_range == null) return { zone: "neutral", label: "—" };
  if (target.in_range) return { zone: "green", label: "Dans la cible" };
  const delta = target.delta_kg ?? target.delta_pct ?? 0;
  if (delta < 0) return { zone: "blue", label: "Sous la cible" };
  return { zone: "orange", label: "Au-dessus de la cible" };
}

export function comparisonZone(comparison, { lowerIsBetter = false } = {}) {
  if (!comparison) return { zone: "neutral", label: "—" };
  const { favorable, deltaPct } = comparison;
  const abs = Math.abs(deltaPct ?? 0);
  if (favorable) {
    if (abs < 5) return { zone: "green", label: lowerIsBetter ? "Bien calé" : "Dans la norme" };
    return { zone: "green", label: lowerIsBetter ? "En dessous moy." : "Au-dessus moy." };
  }
  if (abs < 8) return { zone: "yellow", label: "Léger écart" };
  return { zone: "red", label: lowerIsBetter ? "Au-dessus moy." : "Sous ta moyenne" };
}

export function comparisonZoneInverted(comparison) {
  return comparisonZone(comparison, { lowerIsBetter: true });
}
