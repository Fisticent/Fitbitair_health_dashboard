/** Guiding question per main navigation section. */
export const SECTION_INTENTS = [
  {
    id: "today",
    label: "Aujourd'hui",
    question: "Comment je me sens / quoi faire aujourd'hui ?",
    dot: "#15171c",
  },
  {
    id: "sleep",
    label: "Sommeil",
    question: "Comment s'est passée la nuit ?",
    dot: "#5b8def",
  },
  {
    id: "readiness",
    label: "Récupération",
    question: "Pourquoi ce score de récup ?",
    dot: "#15b393",
  },
  {
    id: "strain",
    label: "Charge",
    question: "Qu'est-ce que j'ai demandé à mon corps ?",
    dot: "#ef8a6a",
  },
  {
    id: "health",
    label: "Santé",
    question: "Mes signaux sont-ils normaux pour moi ?",
    detail: "Corps & composition",
    dot: "#8b7fd4",
  },
  {
    id: "plus",
    label: "Analyses",
    question: "Quelle est la tendance sur 2–8 semaines ?",
    dot: "#9aa0ab",
  },
];

export function intentForSection(sectionId) {
  return SECTION_INTENTS.find((s) => s.id === sectionId) ?? null;
}
