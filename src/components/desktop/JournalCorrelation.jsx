import { useMemo } from "react";
import { readAllJournal } from "../../hooks/useJournal";

function avg(nums) {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function JournalCorrelation({ history = [] }) {
  const insights = useMemo(() => {
    const journal = readAllJournal();
    const rows = history
      .filter((d) => journal[d.date])
      .map((d) => ({
        ...d,
        j: journal[d.date],
      }));

    if (rows.length < 3) {
      return { rows, messages: ["Ajoute au moins 3 jours de journal pour voir des tendances."] };
    }

    const highStress = rows.filter((r) => r.j.stress >= 4);
    const lowStress = rows.filter((r) => r.j.stress <= 2);
    const alcohol = rows.filter((r) => r.j.alcohol);
    const noAlcohol = rows.filter((r) => !r.j.alcohol);
    const heavyCoffee = rows.filter((r) => r.j.coffee >= 3);
    const noCoffee = rows.filter((r) => r.j.coffee === 0);

    const messages = [];

    const recHigh = avg(highStress.map((r) => r.recovery).filter((n) => n != null));
    const recLow = avg(lowStress.map((r) => r.recovery).filter((n) => n != null));
    if (recHigh != null && recLow != null && highStress.length && lowStress.length) {
      const delta = recLow - recHigh;
      messages.push(
        `Stress élevé (4–5) : récup. moy. ${recHigh} % vs ${recLow} % quand stress ≤ 2${delta > 0 ? ` (−${delta} pts)` : ""}.`,
      );
    }

    const sleepAlc = avg(alcohol.map((r) => r.sleep).filter((n) => n != null));
    const sleepNoAlc = avg(noAlcohol.map((r) => r.sleep).filter((n) => n != null));
    if (sleepAlc != null && sleepNoAlc != null && alcohol.length && noAlcohol.length) {
      messages.push(
        `Alcool : sommeil moy. ${sleepAlc} % vs ${sleepNoAlc} % sans alcool.`,
      );
    }

    const recCoffee = avg(heavyCoffee.map((r) => r.recovery).filter((n) => n != null));
    const recNoCoffee = avg(noCoffee.map((r) => r.recovery).filter((n) => n != null));
    if (recCoffee != null && recNoCoffee != null && heavyCoffee.length && noCoffee.length) {
      messages.push(
        `≥ 3 cafés : récup. moy. ${recCoffee} % vs ${recNoCoffee} % sans café.`,
      );
    }

    if (!messages.length) {
      messages.push("Pas encore assez de variété dans le journal pour des corrélations claires.");
    }

    return { rows, messages };
  }, [history]);

  return (
    <section className="journal-correlation glass-panel span-full">
      <h3 className="journal-correlation-title">Corrélation journal</h3>
      <p className="panel-sub">
        {insights.rows.length} jour{insights.rows.length > 1 ? "s" : ""} avec saisie · basé sur ton historique local
      </p>
      <ul className="journal-correlation-list">
        {insights.messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </section>
  );
}
