import { useEffect, useState } from "react";
import { LueurCard } from "./LueurCard";
import { ProgressRing } from "./ProgressRing";
import { TrendBars, recoveryTrendFromHistory, recoveryTrendAvg } from "./TrendBars";
import { zoneColor, formatDateLong, scoreStatusLabel } from "./chartUtils";
import { RECOVERY_ZONE_LABEL } from "../../data/labels";
import { scoreZone } from "../../utils/metricStatus";
import { formatMetricValue } from "../../utils/formatMetric";
import { LueurMetricLabel } from "./LueurInfoTip";

function buildContributors(recovery, sleep, priorStrain) {
  const items = [];
  const comp = recovery?.components || {};

  if (comp.rhr?.value != null) {
    const s = scoreStatusLabel(100 - Math.abs((comp.rhr.value - 60) * 2));
    items.push({
      label: "Fréquence cardiaque au repos",
      tipId: "rhr",
      showBar: false,
      val: comp.rhr.value,
      display: `${formatMetricValue("FC repos", comp.rhr.value)} bpm`,
      score: Math.min(100, Math.max(0, 100 - Math.abs(comp.rhr.value - 55) * 3)),
      color: s.color,
      statusText: s.text,
    });
  }

  if (comp.hrv?.value != null) {
    const s = scoreStatusLabel(Math.min(100, comp.hrv.value));
    items.push({
      label: "Équilibre HRV",
      tipId: "hrv",
      showBar: false,
      val: comp.hrv.value,
      display: `${formatMetricValue("HRV", comp.hrv.value)} ms`,
      score: Math.min(100, comp.hrv.value * 1.5),
      color: s.color,
      statusText: s.text,
    });
  }

  if (comp.respiratory?.value != null) {
    const s = scoreStatusLabel(90);
    items.push({
      label: "Respiration",
      tipId: "Respiration",
      showBar: false,
      val: comp.respiratory.value,
      display: `${formatMetricValue("Respiration", comp.respiratory.value)}/min`,
      score: 85,
      color: s.color,
      statusText: s.text,
    });
  }

  if (comp.skin_temp?.value != null) {
    const dev = comp.skin_temp.value;
    // Warmer than baseline is worse; cooler/at baseline is fine.
    const score = Math.min(100, Math.max(0, 100 - Math.max(0, dev) * 120));
    const s = scoreStatusLabel(score);
    const sign = dev >= 0 ? "+" : "";
    items.push({
      label: "Température cutanée",
      tipId: "skin_temp",
      showBar: false,
      val: dev,
      display: `${sign}${dev.toFixed(2)} °C vs baseline`,
      score,
      color: s.color,
      statusText: s.text,
    });
  }

  if (sleep?.score != null) {
    const s = scoreStatusLabel(sleep.score);
    items.push({
      label: "Sommeil",
      tipId: "sleep",
      val: sleep.score,
      display: `${sleep.score} %`,
      score: sleep.score,
      color: s.color,
      statusText: s.text,
    });
  }

  if (comp.sleep_hours?.value != null) {
    const need = comp.sleep_hours.need || 7.5;
    const pct = Math.min(100, (comp.sleep_hours.value / need) * 100);
    const s = scoreStatusLabel(pct);
    items.push({
      label: "Équilibre du sommeil",
      tipId: "sleep_balance",
      val: Math.round(pct),
      display: `${comp.sleep_hours.value}h`,
      score: pct,
      color: s.color,
      statusText: s.text,
    });
  }

  // Prior-day strain is an actual input to the score (it raises the sleep need);
  // show J-1, not today's load.
  if (priorStrain != null) {
    const priorPct = Math.max(0, 100 - priorStrain);
    const s = scoreStatusLabel(priorPct);
    items.push({
      label: "Charge de la veille",
      tipId: "strain",
      val: Math.round(priorPct),
      display: `${priorStrain} %`,
      score: priorPct,
      color: s.color,
      statusText: s.text,
    });
  }

  return items;
}

export function ReadinessView({ data, onBack, history }) {
  const { recovery, sleep, vitals, focus_date } = data;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [focus_date]);

  const recoveryScore = recovery?.score;
  const status = scoreStatusLabel(recoveryScore);
  const zone = scoreZone(recoveryScore);
  // Ring + label must follow the recovery zone, not a hardcoded green.
  const ringColor = recovery?.zone ? zoneColor(recovery.zone) : status.color;
  // Prior-day strain from history (the value compute_recovery actually consumes).
  const priorDate = (() => {
    try {
      const d = new Date(`${focus_date}T12:00:00`);
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    } catch {
      return null;
    }
  })();
  const priorStrain = priorDate
    ? history?.find((h) => h.date === priorDate)?.strain ?? null
    : null;
  // API sends skin_temp as an object {nightly, baseline, deviation}.
  const skinTempDev = vitals?.skin_temp?.deviation ?? null;
  const contributors = buildContributors(recovery, sleep, priorStrain);
  const trend = recoveryTrendFromHistory(history);
  const trendAvg = recoveryTrendAvg(history);

  const narrative =
    recovery?.zone === "green"
      ? "Votre corps est bien récupéré."
      : recovery?.zone === "yellow"
        ? "Récupération modérée — adaptez votre charge."
        : recovery?.zone === "red"
          ? "Priorité au repos et à la récupération."
          : "Synthèse de récupération basée sur vos signaux vitaux.";

  const detail =
    recovery?.zone === "green"
      ? "La variabilité cardiaque et le sommeil sont favorables. Bonne journée pour un entraînement exigeant."
      : "Consultez les contributeurs ci-dessous pour ajuster votre journée.";

  return (
    <div>
      <button type="button" className="lueur-back-link" onClick={onBack}>
        ← Aujourd'hui
      </button>
      <div className="lueur-section-title">Récupération</div>
      <div className="lueur-section-sub">{formatDateLong(focus_date)}</div>

      <LueurCard hero>
        <div className="lueur-hero-flex">
          <ProgressRing
            size={220}
            radius={96}
            stroke={13}
            value={recoveryScore ?? 0}
            color={ringColor}
          >
            <div className="lueur-ring-value" style={{ fontSize: 60, fontWeight: 300 }}>
              {recoveryScore ?? "—"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ringColor }}>
              {RECOVERY_ZONE_LABEL[recovery?.zone] || zone.label}
            </div>
          </ProgressRing>
          <div className="lueur-hero-text">
            <h3>{narrative}</h3>
            <p>{detail}</p>
          </div>
        </div>
      </LueurCard>

      <LueurCard hero style={{ marginTop: 20 }}>
        <LueurMetricLabel id="contributors" as="p" className="lueur-label" style={{ marginBottom: 8 }}>
          Contributeurs
        </LueurMetricLabel>
        <p className="lueur-meta" style={{ marginBottom: 14 }}>
          Lecture indicative des signaux — les barres ne reflètent pas les poids exacts du score.
        </p>
        {contributors.length === 0 ? (
          <p className="lueur-meta">Aucun contributeur disponible pour ce jour.</p>
        ) : (
          contributors.map((c) => (
            <div key={c.label} className="lueur-contributor-row">
              <span className="lueur-contributor-dot" style={{ background: c.color }} />
              <div className="lueur-contributor-main">
                <LueurMetricLabel id={c.tipId} as="span" className="lueur-contributor-label">
                  {c.label}
                </LueurMetricLabel>
                {c.showBar !== false && (
                  <div className="lueur-progress-track">
                    <div
                      className="lueur-progress-fill"
                      style={{
                        width: drawn ? `${Math.min(100, c.score)}%` : "0%",
                        background: c.color,
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="lueur-contributor-aside">
                <span className="lueur-contributor-value">{c.display}</span>
                {c.sub && <span className="lueur-contributor-sub">{c.sub}</span>}
                <span className="lueur-contributor-status" style={{ color: c.color }}>
                  {c.statusText}
                </span>
              </div>
            </div>
          ))
        )}
      </LueurCard>

      <div className="lueur-grid-2">
        {skinTempDev != null && (
          <LueurCard>
            <LueurMetricLabel id="skin_temp" as="p" className="lueur-label" style={{ marginBottom: 4 }}>
              Température cutanée
            </LueurMetricLabel>
            <div className="lueur-meta" style={{ marginBottom: 8 }}>
              Écart{" "}
              <b style={{ color: "var(--lueur-text)" }}>
                {skinTempDev >= 0 ? "+" : ""}
                {skinTempDev.toFixed(2)} °C
              </b>{" "}
              vs baseline
            </div>
            <p className="lueur-mono-meta">
              Mesurée pendant le sommeil · plus chaud que ta normale = récupération à surveiller.
            </p>
          </LueurCard>
        )}
        <LueurCard style={skinTempDev == null ? { gridColumn: "span 2" } : undefined}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <LueurMetricLabel id="trends" as="p" className="lueur-label" style={{ marginBottom: 0 }}>
              Récupération · 7 jours
            </LueurMetricLabel>
            {trendAvg != null && (
              <span className="lueur-meta" style={{ marginBottom: 0 }}>
                Moyenne <b style={{ color: "var(--lueur-text)" }}>{trendAvg}</b>
              </span>
            )}
          </div>
          <TrendBars data={trend} height={130} gap={10} />
        </LueurCard>
      </div>
    </div>
  );
}
