/** Textes d'aide pour les métriques du dashboard (scores maison, non médical). */

export const METRIC_TOOLTIPS = {
  recovery:
    "X-Récupération (0–100 %) : niveau de récupération du jour. Combine VFC, FC repos, sommeil et respiration vs ta moyenne sur 14 jours. Vert = prêt à pousser, rouge = récupération prioritaire.",
  strain:
    "Charge (0–100 %) : charge cardiovasculaire du jour, estimée depuis les minutes en zones FC Fitbit. Plus le score est haut, plus la journée a sollicité ton système.",
  sleep:
    "X-Sommeil (0–100 %) : performance sommeil vs ton besoin (durée, efficacité, stades profond/REM). Un bon sommeil tire la récupération vers le haut le lendemain.",
  steps:
    "Pas du jour vs objectif journalier (10 000 par défaut Fitbit — clique sur l'objectif pour le modifier). Distance associée : km Fitbit/Health Connect quand synchronisée, sinon estimation (~76 cm/pas). Compte dans la charge et l'âge physiologique même sans session d'exercice enregistrée.",
  calories:
    "Calories actives (kcal) : somme Fitbit `active-energy-burned` — marche, zones FC, effort. Le total estimé ajoute un métabolisme de base calculé (Mifflin-St Jeor) car le basal n'est pas exposé par l'API.",
  hrv:
    "VFC (variabilité de la fréquence cardiaque, en ms) : plus elle est haute vs ta normale, plus ton système nerveux paraît détendu et récupéré. Mesurée la nuit ou au repos.",
  rhr:
    "FC repos (bpm) : fréquence cardiaque au repos. Une valeur basse et stable est généralement un bon signe ; une hausse vs ta moyenne peut signaler fatigue ou stress.",
  stress:
    "Moniteur stress (indice 0–100, estimation) : combine la baisse de VFC (signal principal, sur ln-VFC comme WHOOP) et l'élévation de FC diurne vs repos, chacune comparée à ta baseline ~14 jours. L'élévation de FC est atténuée les jours de forte charge pour ne pas confondre sport et stress. Couche « aiguë » ; la dérive long terme est suivie par le moniteur santé. Pas un capteur de stress réel.",
  x_age:
    "X-Âge (âge physiologique) : âge fonctionnel estimé à partir de FC repos, VFC, sommeil, activité et VO₂. Compare-toi à ton âge réel pour voir si tu « rajeunis » ou non.",
  pace_of_aging:
    "Rythme de vieillissement : vitesse de changement de ton X-Âge sur 7 jours. Négatif = tendance au rajeunissement, positif = vieillissement physiologique accéléré.",
  health_monitor:
    "Moniteur santé : vitaux du jour comparés à ta moyenne sur 30 jours. Vert = dans la norme personnelle, orange/rouge = écart significatif (à interpréter avec prudence).",
  exercise:
    "Sessions d'exercice enregistrées (Fitbit / Health Connect) : nombre, durée et distance. Pas le détail des séries — uniquement ce que l'API `exercise` expose.",
  trends:
    "Rythme 14 jours : barre haute = récupération (vert ≥ 67 %, jaune 34–66 %, rouge < 34 %). Barre bleue = charge (0–100 %). Survole un jour pour le détail.",
  journal:
    "Journal local (navigateur) : café, alcool, stress ressenti. Sert à corréler tes habitudes avec récupération et sommeil — données non envoyées au cloud.",
  coverage:
    "Couverture KPI : alignement avec le tableau Obsidian (hors capteurs ECG/arythmie/tension). Vert = données en direct, violet = estimation, gris = manuel ou planifié.",
  weight:
    "Poids mesuré. La cible est calculée depuis ta taille (IMC sain 18,5–24,9) : fourchette idéale et écart à la cible médiane.",
  bmi:
    "Indice de masse corporelle (poids / taille²). La barre situe ta valeur parmi les repères OMS : bas poids, normal, surpoids ou obésité.",
  vo2:
    "VO₂ max (ml/kg/min) : capacité aérobie estimée ou mesurée. Direct si test GPS/cardio, sinon estimation Fitbit. Plus c'est haut, meilleure l'endurance.",
  body_fat:
    "Masse grasse (%). La cible saine dépend de ton âge et sexe (repères ACE). Barre = position vs fourchette idéale ; saisie manuelle possible.",
  cycle:
    "Cycle menstruel : non implémenté — nécessiterait une synchronisation Health Connect / application dédiée.",
  strength:
    "Entraînement : sessions Fitbit/Health Connect (type, durée, distance). Pas le détail répétitions/charges — uniquement ce que l'API `exercise` expose.",
  pdf:
    "Rapport PDF hebdomadaire : fonctionnalité planifiée, pas encore disponible dans ce dashboard.",
  VFC:
    "Variabilité entre les battements cardiaques (ms). Reflet du système nerveux autonome — clé de la récupération.",
  HRV:
    "Variabilité entre les battements cardiaques (ms). Reflet du système nerveux autonome — clé de la récupération.",
  "FC repos":
    "Fréquence cardiaque au repos (bpm). Comparée à ta moyenne sur 30 jours dans ce panneau.",
  Respiration:
    "Fréquence respiratoire au repos (/min). Légère hausse peut accompagner stress ou maladie légère.",
  spo2:
    "SpO₂ (%) : saturation en oxygène du sang, souvent mesurée au repos ou la nuit. Valeurs habituelles ≥ 95 %. Dépend du capteur (Fitbit, montre).",
  SpO2:
    "SpO₂ (%) : saturation en oxygène du sang, souvent mesurée au repos ou la nuit. Valeurs habituelles ≥ 95 %.",
  sleep_efficiency:
    "Efficacité sommeil (%) : temps endormi ÷ temps au lit. Un score élevé indique peu d'éveils et de temps éveillé au lit.",
  sleep_need:
    "Besoin de sommeil estimé : base 7h30 + ajustement selon la charge de la veille. Sert au score sommeil et à la dette.",
  sleep_debt:
    "Dette du jour : différence entre besoin et heures dormies (si déficit). Un écart ponctuel est normal ; surveille la tendance.",
  sleep_debt_7d:
    "Dette cumulée sur 7 jours : somme des déficits des nuits enregistrées. Indicateur de rattrapage à prévoir.",
  sleep_balance:
    "Durée dormie vs besoin du jour — contributeur du score de récupération.",
  sleep_latency:
    "Latence d'endormissement : délai entre coucher et premier sommeil significatif.",
  hypnogram:
    "Hypnogramme : répartition des stades (éveil, léger, profond, REM) sur la nuit. Sert au score qualité sommeil.",
  hr_zones:
    "Minutes en zones FC Fitbit : brûlage graisse (léger), cardio (modéré), pic (intense). Alimentent la charge en %.",
  strain_intensity:
    "Niveau d'intensité dérivé du score de charge (Léger → Maximal sur l'échelle 0–100 %).",
  strain_load:
    "Charge interne (load) : somme pondérée des minutes en zones FC — utilisée pour calculer le score en %.",
  strain_recovery_fit:
    "Adéquation charge / récupération : ton corps est-il prêt à encaisser la charge d'hier et d'aujourd'hui ?",
  compare_vitals:
    "VFC et FC repos sur 14 jours, comparées à ta moyenne personnelle.",
  compare_scores:
    "Récupération, sommeil et charge sur 14 jours — survole un jour pour le détail.",
  compare_stress:
    "Courbe stress (indice 0–100) : VFC + FC diurne vs ta baseline ~14 j, atténuée les jours de sport. Nécessite la FC intraday synchronisée.",
  activity_day:
    "Synthèse activité du jour : pas, distance (km Fitbit ou estimée), calories actives et temps d'exercice.",
  body_composition:
    "Poids, IMC, masse grasse et masse maigre — dernières mesures synchronisées ou saisie manuelle.",
  skin_temp:
    "Écart de température cutanée nocturne — nécessite un capteur compatible (non alimenté si absent de la sync).",
  contributors:
    "Facteurs qui tirent ton score de récupération vers le haut ou le bas ce jour-là.",
  sleep_regularity:
    "Régularité des heures de coucher sur ~14 nuits. Un score élevé = rythme stable, favorable à la récupération.",
  load_balance:
    "Compare ta charge des 7 derniers jours à ton rythme habituel (28 jours). La barre indique où tu te situes : sous-charge, optimal, prudence ou surcharge.",
  hrv_balance:
    "VFC récente vs ta baseline longue. Un score bas peut signaler fatigue accumulée ou stress.",
  advanced_signals:
    "Indicateurs dérivés de ton historique — utiles pour la tendance, pas pour un diagnostic médical.",
  lean_mass:
    "Masse maigre estimée à partir du poids et du % de masse grasse.",
  profile_sex:
    "Sexe biologique pour le métabolisme de base (Mifflin-St Jeor : +5 kcal/j homme, −161 femme) et les repères neutres de l'X-Âge. Non fourni par Google Health.",
  profile_identity:
    "Informations d'identité complémentaires à Google Health. Elles affinent le BMR, les calories totales estimées et l'X-Âge.",
  profile_dob:
    "Date de naissance pour un âge exact (années + mois). Sans saisie, l'âge entier Google est utilisé — souvent moins précis pour le BMR.",
  profile_height:
    "Taille en centimètres pour l'IMC et le BMR. Priorité : ta saisie manuelle, sinon la dernière taille synchronisée depuis Health Connect.",
  profile_weight:
    "Poids de secours (kg) si aucune pesée récente n'est synchronisée. Les pesées Fitbit / balance restent prioritaires quand elles existent.",
  profile_goals:
    "Objectifs d'affichage locaux : barres de progression et pourcentages dans Aujourd'hui, Récupération et Charge. Stockés sur cet appareil.",
  profile_local:
    "Ces réglages ne sont pas envoyés à Google. Ils sont mémorisés dans ton navigateur et transmis à l'API locale pour recalculer BMR et X-Âge.",
  profile_bmr:
    "Métabolisme de base estimé (kcal/j) à partir du poids, taille, âge et sexe. Ajouté aux calories actives pour le total journalier estimé.",
};

export const COVERAGE_STATUS_TIPS = {
  active: "Données disponibles via l'API Google Health",
  proxy: "Calcul ou estimation maison (pas une mesure directe capteur)",
  partial: "Couverture partielle — données incomplètes",
  manual: "Saisie manuelle locale (ex. journal)",
  planned: "Fonctionnalité prévue, pas encore implémentée",
  unavailable: "Non disponible avec tes sources actuelles",
  hardware: "Nécessite un capteur matériel dédié",
};

export function getMetricTip(id) {
  return METRIC_TOOLTIPS[id] ?? null;
}
