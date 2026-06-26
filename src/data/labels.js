/** Libellés UI français (affichage uniquement — les clés API restent en anglais). */

export const RECOVERY_ZONE_LABEL = {
  green: "Récupéré",
  yellow: "Modéré",
  red: "Fatigué",
};

export const CONFIDENCE_LABEL = {
  low: "faible",
  medium: "moyenne",
  high: "élevée",
};

export function formatConfidence(value) {
  if (!value) return "";
  return CONFIDENCE_LABEL[value] ?? value;
}
