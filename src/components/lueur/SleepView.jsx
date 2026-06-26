import { useEffect, useState } from "react";
import { LueurCard } from "./LueurCard";
import { ProgressRing } from "./ProgressRing";
import { HypnogramFull, StageBreakdown } from "./Hypnogram";
import { LargeSparkChart } from "./MiniSparkChart";
import { COLORS, formatDateLong, formatSleepDuration, formatMinutes, formatClockTime, scoreStatusLabel } from "./chartUtils";
import { scoreZone } from "../../utils/metricStatus";
import { formatMetricValue } from "../../utils/formatMetric";
import { cumulativeSleepDebt } from "../../utils/sleepDebt";
import { LueurMetricLabel } from "./LueurInfoTip";

export function SleepView({ data, onBack, history }) {
  const { sleep, focus_date, recovery } = data;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [focus_date]);

  const sleepScore = sleep?.score;
  const status = scoreStatusLabel(sleepScore);
  const zone = scoreZone(sleepScore);

  const totalMin =
    (sleep?.stages?.deep_min || 0) +
    (sleep?.stages?.rem_min || 0) +
    (sleep?.stages?.light_min || 0) +
    (sleep?.stages?.awake_min || 0);
  const timeInBed =
    sleep?.time_in_bed_hours ??
    (totalMin > 0 ? totalMin / 60 : null);
  const bedtime = formatClockTime(sleep?.bedtime);
  const wakeup = formatClockTime(sleep?.wakeup);

  const hrHistory = history?.map((d) => d.rhr) ?? [];
  const hrvHistory = history?.map((d) => d.hrv) ?? [];
  const minRhr = hrHistory.filter((v) => v != null).length
    ? Math.min(...hrHistory.filter((v) => v != null))
    : recovery?.components?.rhr?.value;
  const avgHrv = hrvHistory.filter((v) => v != null).length
    ? Math.round(
        hrvHistory.filter((v) => v != null).reduce((a, b) => a + b, 0) /
          hrvHistory.filter((v) => v != null).length,
      )
    : recovery?.components?.hrv?.value;

  const sleepDebt7 = cumulativeSleepDebt(history, 7);

  return (
    <div>
      <button type="button" className="lueur-back-link" onClick={onBack}>
        ← Aujourd'hui
      </button>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div className="lueur-section-title">Sommeil</div>
          <div className="lueur-section-sub" style={{ marginBottom: 0 }}>
            Nuit du {formatDateLong(focus_date)}
          </div>
        </div>
      </div>

      <LueurCard hero>
        <div className="lueur-hero-flex">
          <ProgressRing
            size={220}
            radius={96}
            stroke={13}
            value={sleepScore ?? 0}
            color={COLORS.BLUE}
          >
            <div className="lueur-ring-label">SCORE</div>
            <div className="lueur-ring-value" style={{ fontSize: 60, fontWeight: 300 }}>
              {sleepScore ?? "—"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: status.color }}>
              {zone.label}
            </div>
          </ProgressRing>
          <div className="lueur-grid-3" style={{ flex: 1, minWidth: 280, marginTop: 0 }}>
            <div>
              <div className="lueur-metric-md">{formatSleepDuration(sleep?.hours)}</div>
              <div style={{ fontSize: 12.5, color: "var(--lueur-muted)" }}>durée totale</div>
            </div>
            <div>
              <div className="lueur-metric-md">{formatSleepDuration(timeInBed)}</div>
              <div style={{ fontSize: 12.5, color: "var(--lueur-muted)" }}>temps au lit</div>
            </div>
            <div>
              <div className="lueur-metric-md">{sleep?.efficiency ?? "—"} %</div>
              <LueurMetricLabel id="sleep_efficiency" as="span" className="lueur-metric-caption-tip">
                efficacité
              </LueurMetricLabel>
            </div>
            <div>
              <div className="lueur-metric-md">
                {sleep?.need != null ? formatSleepDuration(sleep.need) : "—"}
              </div>
              <LueurMetricLabel id="sleep_need" as="span" className="lueur-metric-caption-tip">
                besoin estimé
              </LueurMetricLabel>
            </div>
            <div>
              <div
                className="lueur-metric-md"
                style={{
                  color:
                    sleep?.debt_hours > 0 ? "var(--lueur-coral)" : "var(--lueur-text)",
                }}
              >
                {sleep?.debt_hours != null
                  ? sleep.debt_hours > 0
                    ? formatSleepDuration(sleep.debt_hours)
                    : "0h"
                  : "—"}
              </div>
              <LueurMetricLabel id="sleep_debt" as="span" className="lueur-metric-caption-tip">
                dette{sleepDebt7 > 0 ? ` · 7j ${formatSleepDuration(sleepDebt7)}` : ""}
              </LueurMetricLabel>
            </div>
            <div>
              <div className="lueur-metric-md">
                {sleep?.latency_min != null ? formatMinutes(sleep.latency_min) : "—"}
              </div>
              <LueurMetricLabel id="sleep_latency" as="span" className="lueur-metric-caption-tip">
                latence
              </LueurMetricLabel>
            </div>
            <div>
              <div className="lueur-metric-md">{bedtime ?? "—"}</div>
              <div style={{ fontSize: 12.5, color: "var(--lueur-muted)" }}>coucher</div>
            </div>
            <div>
              <div className="lueur-metric-md">{wakeup ?? "—"}</div>
              <div style={{ fontSize: 12.5, color: "var(--lueur-muted)" }}>réveil</div>
            </div>
          </div>
        </div>
      </LueurCard>

      <LueurCard hero style={{ marginTop: 20 }}>
        <LueurMetricLabel id="hypnogram" as="p" className="lueur-label" style={{ marginBottom: 18 }}>
          Hypnogramme
        </LueurMetricLabel>
        <HypnogramFull
          timeline={sleep?.stage_timeline}
          stages={sleep?.stages}
          bedtime={sleep?.bedtime}
          wakeup={sleep?.wakeup}
        />
        <StageBreakdown stages={sleep?.stages} drawn={drawn} />
      </LueurCard>

      <div className="lueur-grid-2">
        <LueurCard>
          <LueurMetricLabel id="rhr" as="p" className="lueur-label" style={{ marginBottom: 4 }}>
            Fréq. cardiaque nocturne
          </LueurMetricLabel>
          <div className="lueur-meta" style={{ marginBottom: 14 }}>
            Minimum{" "}
            <b style={{ color: "var(--lueur-text)" }}>
              {minRhr != null ? `${formatMetricValue("FC repos", minRhr)} bpm` : "—"}
            </b>
          </div>
          <LargeSparkChart values={hrHistory} color={COLORS.BLUE} gradient="blue" />
        </LueurCard>
        <LueurCard>
          <LueurMetricLabel id="hrv" as="p" className="lueur-label" style={{ marginBottom: 4 }}>
            HRV nocturne
          </LueurMetricLabel>
          <div className="lueur-meta" style={{ marginBottom: 14 }}>
            Moyenne{" "}
            <b style={{ color: "var(--lueur-text)" }}>
              {avgHrv != null ? `${formatMetricValue("HRV", avgHrv)} ms` : "—"}
            </b>
          </div>
          <LargeSparkChart values={hrvHistory} color={COLORS.TEAL} gradient="teal" />
        </LueurCard>
      </div>
    </div>
  );
}
