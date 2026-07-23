export const legend = [
  {
    key: "yes",
    label: "Oui",
    description: "Implémentable avec nos données actuelles",
  },
  {
    key: "proxy",
    label: "Proxy / partiel",
    description: "Score utile mais moins granulaire que WHOOP",
  },
  {
    key: "hardware",
    label: "Hardware",
    description: "Capteur ou dispositif médical requis",
  },
  {
    key: "no",
    label: "Non",
    description: "Hors scope API (UX coaching, etc.)",
  },
];

export const coverageRows = [
  {
    feature: "Recovery %",
    api: "yes",
    custom: "yes",
    dataTypes: ["heart-rate-variability", "resting-heart-rate", "sleep", "daily-respiratory-rate"],
    notes: "X-Recovery : HRV + FC repos + sommeil + respiration vs baseline 28j",
  },
  {
    feature: "Charge %",
    api: "yes",
    custom: "yes",
    dataTypes: ["active-zone-minutes", "heart-rate", "exercise", "calories"],
    notes: "X-Strain : zones FC + sessions exercice fusionnées, échelle 0–100 %",
  },
  {
    feature: "Sleep Performance",
    api: "yes",
    custom: "yes",
    dataTypes: ["sleep"],
    notes: "X-Sleep : besoin estimé (âge + strain veille) vs sommeil réel + stades",
  },
  {
    feature: "Health Monitor",
    api: "yes",
    custom: "yes",
    dataTypes: ["resting-heart-rate", "heart-rate-variability", "oxygen-saturation", "daily-respiratory-rate"],
    notes: "Vitaux vs baseline ~28j ± écart-type, alertes seuil",
  },
  {
    feature: "Journal",
    api: "no",
    custom: "yes",
    dataTypes: ["— (saisie manuelle)"],
    notes: "YAML Obsidian / formulaire local + corrélation Recovery / sommeil",
  },
  {
    feature: "Charge cardio diurne",
    api: "proxy",
    custom: "proxy",
    dataTypes: ["heart-rate", "resting-heart-rate"],
    notes: "Proxy FC diurne vs baseline ~28j — pas un stress psychologique",
  },
  {
    feature: "Menstrual Cycle",
    api: "proxy",
    custom: "yes",
    dataTypes: ["menstruation (si saisi Fitbit/HC)"],
    notes: "Overlay phases → HRV, sommeil, FC repos",
  },
  {
    feature: "WHOOP Age / Pace of Aging",
    api: "proxy",
    custom: "yes",
    dataTypes: ["sleep", "steps", "active-zone-minutes", "daily-vo2-max", "resting-heart-rate", "weight", "body-fat"],
    notes: "X-Age : logique Healthspan simplifiée (6–9 métriques)",
  },
  {
    feature: "Strength Trainer",
    api: "no",
    custom: "no",
    dataTypes: ["—"],
    notes: "UX coaching WHOOP — on peut tracker exercise manuellement",
  },
  {
    feature: "Rapport PDF santé",
    api: "yes",
    custom: "yes",
    dataTypes: ["tous les data types"],
    notes: "Export script Python → PDF 30 / 180 jours",
  },
  {
    feature: "VO₂ Max",
    api: "proxy",
    custom: "proxy",
    dataTypes: ["daily-vo2-max"],
    notes: "Direct si mesuré Fitbit (runs GPS) ; sinon Cooper / temps course",
  },
  {
    feature: "ECG",
    api: "hardware",
    custom: "hardware",
    dataTypes: ["—"],
    notes: "Capteur ECG requis (Apple Watch, Kardia, Whoop MG)",
  },
  {
    feature: "AFib",
    api: "hardware",
    custom: "hardware",
    dataTypes: ["—"],
    notes: "Algo certifié sur ECG/PPG — pas dérivable de HRV quotidienne",
  },
  {
    feature: "Tension artérielle (TA)",
    api: "hardware",
    custom: "proxy",
    dataTypes: ["blood-pressure (si device sync HC)"],
    notes: "Brassard / montre dédiée — pas d'estimation fiable depuis HRV seule",
  },
];

export const snapshotMetrics = [
  { label: "FC repos", value: "61–65 bpm", trend: "down", status: "good", detail: "Tendance ↓ depuis 73" },
  { label: "HRV", value: "~57 ms", trend: "flat", status: "ok", detail: "Légèrement sous moyenne ~65 ms" },
  { label: "Sommeil", value: "5–6,5 h", trend: "down", status: "warn", detail: "Sous cible 7–8 h" },
  { label: "Pas (30j)", value: "~7 054/j", trend: "flat", status: "ok", detail: "Sous cible ~8 000" },
  { label: "Poids", value: "76,6 kg", trend: "up", status: "warn", detail: "+1,6 kg vs début juin" },
  { label: "VO₂ max", value: "—", trend: "none", status: "missing", detail: "Pas encore de score Fitbit" },
  { label: "Âge réel", value: "30 ans", trend: "none", status: "info", detail: "Profil Fitbit" },
  { label: "X-Age estimé", value: "32–34 ans", trend: "none", status: "proxy", detail: "Approximation Healthspan (confiance faible)" },
];

export const dataTypes = [
  { type: "sleep", usage: "Sessions, stades, durée" },
  { type: "heart-rate-variability", usage: "HRV quotidienne (ms)" },
  { type: "resting-heart-rate", usage: "FC repos" },
  { type: "heart-rate", usage: "FC intraday (stress proxy)" },
  { type: "daily-respiratory-rate", usage: "Fréquence respiratoire nocturne" },
  { type: "oxygen-saturation", usage: "SpO₂" },
  { type: "steps", usage: "Pas quotidiens" },
  { type: "active-zone-minutes", usage: "Zones cardio Fitbit" },
  { type: "weight", usage: "Poids" },
  { type: "body-fat", usage: "Masse maigre (balance connectée)" },
  { type: "daily-vo2-max", usage: "VO₂ max (runs GPS Fitbit)" },
  { type: "exercise", usage: "Workouts" },
];
