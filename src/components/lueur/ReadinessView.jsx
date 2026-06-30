import { LueurCard } from "./LueurCard";
import { RecoveryZonedChart, SkinTempDivergingChart } from "./AdvancedCharts";
import { ContributorsPanel, buildContributors } from "./ContributorsPanel";
import { TrendBars, recoveryTrendFromHistory, recoveryTrendAvg } from "./TrendBars";
import { formatDateLong } from "./chartUtils";
import { RECOVERY_ZONE_LABEL } from "../../data/labels";
import { scoreZone } from "../../utils/metricStatus";
import { LueurMetricLabel } from "./LueurInfoTip";

export function ReadinessView({ data, onBack, history }) {
  const { recovery, sleep, vitals, focus_date, health_monitor } = data;

  const recoveryScore = recovery?.score;
  const zone = scoreZone(recoveryScore);
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
  const skinTempHistory = (history ?? [])
    .map((d) => d.skin_temp_dev)
    .filter((v) => v != null);
  const contributors = buildContributors({ recovery, sleep, priorStrain, health_monitor });
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
          <RecoveryZonedChart
            score={recoveryScore}
            zone={recovery?.zone}
            history={history}
            focusDate={focus_date}
            statusLabel={RECOVERY_ZONE_LABEL[recovery?.zone] || zone.label}
          />
          <div className="lueur-hero-text">
            <h3>{narrative}</h3>
            <p>{detail}</p>
          </div>
        </div>
      </LueurCard>

      <LueurCard hero style={{ marginTop: 20 }}>
        <LueurMetricLabel id="contributors" as="p" className="lueur-label" style={{ marginBottom: 12 }}>
          Contributeurs
        </LueurMetricLabel>
        <ContributorsPanel contributors={contributors} />
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
            <p className="lueur-mono-meta" style={{ marginBottom: 12 }}>
              Mesurée pendant le sommeil · plus chaud que ta normale = récupération à surveiller.
            </p>
            {skinTempHistory.length > 0 && (
              <SkinTempDivergingChart series={skinTempHistory} />
            )}
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
