import { useMemo, useState } from "react";
import { LueurCard } from "./LueurCard";
import { COLORS, formatChartDate, pickVisibleXLabels, xLabelStyle, smoothLinePath, smoothAreaPath } from "./chartUtils";
import { seriesBaseline } from "../../utils/comparisons";
import { formatMetricValue } from "../../utils/formatMetric";
import { LueurMetricLabel } from "./LueurInfoTip";
import { MiniSparkChart } from "./MiniSparkChart";
import { Spo2ThresholdChart, StressZonesChart } from "./AdvancedCharts";
import { useFluidChartSize } from "./useFluidChartSize";

const W = 520;
const SCORES_MULTIPLES_H = 228;
const VITALS_SPLIT_CHART_H = 96;

function dayLabel(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric" });
}

function buildSegments(history, key, xOf, yOf) {
  const coords = history.map((row, i) => ({
    i,
    date: row.date,
    value: row[key] ?? null,
    x: xOf(i),
    y: row[key] != null ? yOf(row[key]) : null,
  }));

  const segments = [];
  let current = [];
  for (const pt of coords) {
    if (pt.y == null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(pt);
    }
  }
  if (current.length) segments.push(current);

  return { coords, segments };
}

function areaFromSegment(seg, baseY) {
  return smoothAreaPath(seg, baseY);
}

function ChartLegend({ items }) {
  return (
    <div className="lueur-chart-legend">
      {items.map((item) => (
        <span key={item.label} className="lueur-chart-legend-item">
          <span className="lueur-chart-legend-dot" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ChartAvgPills({ pills }) {
  if (!pills?.length) return null;
  return (
    <div className="lueur-chart-avg-row">
      {pills.map((pill) => (
        <span
          key={pill.text}
          className={`lueur-chart-avg-pill lueur-chart-avg-pill--${pill.tone}`}
        >
          {pill.text}
        </span>
      ))}
    </div>
  );
}

function ChartXLabels({ points, width }) {
  const visible = useMemo(
    () => pickVisibleXLabels(points, width),
    [points, width],
  );

  return (
    <div className="lueur-weight-chart-xlabels" aria-hidden="true">
      {visible.map((pt) => (
        <span
          key={pt.date}
          className="lueur-weight-chart-xlabel"
          style={xLabelStyle(pt, width)}
        >
          {dayLabel(pt.date)}
        </span>
      ))}
    </div>
  );
}

function ChartYAxis({ ticks, height, padTop = 12, padBottom = 8 }) {
  if (!ticks?.length) return null;
  const plotH = height - padTop - padBottom;
  return (
    <div
      className="lueur-chart-yaxis"
      style={{ height: plotH, marginTop: padTop, marginBottom: padBottom }}
      aria-hidden="true"
    >
      {[...ticks].reverse().map((tick) => (
        <span key={tick}>{tick}</span>
      ))}
    </div>
  );
}

function ChartPanel({ children, pills, avgPill, onMouseLeave, plotHeight }) {
  return (
    <div className="lueur-weight-chart-panel">
      <div
        className="lueur-weight-chart"
        onMouseLeave={onMouseLeave}
        style={plotHeight ? { "--chart-plot-h": `${plotHeight}px` } : undefined}
      >
        {avgPill}
        <ChartAvgPills pills={pills} />
        {children}
      </div>
    </div>
  );
}

function LueurVitalsChart({ history }) {
  const hrvPoints = useMemo(
    () =>
      (history || [])
        .filter((d) => d.hrv != null)
        .map((d) => ({ date: d.date, value: d.hrv })),
    [history],
  );
  const rhrPoints = useMemo(
    () =>
      (history || [])
        .filter((d) => d.rhr != null)
        .map((d) => ({ date: d.date, value: d.rhr })),
    [history],
  );

  if (!hrvPoints.length && !rhrPoints.length) return null;

  const hrvAvg = seriesBaseline(history, "hrv");
  const rhrAvg = seriesBaseline(history, "rhr");

  return (
    <div className="lueur-vitals-split">
      {hrvPoints.length > 0 && (
        <div className="lueur-vitals-split-block">
          <div className="lueur-vitals-split-head">
            <span className="lueur-stat-chart-label">VFC</span>
            {hrvAvg != null && (
              <span className="lueur-chart-avg-pill lueur-chart-avg-pill--teal">
                moy. {formatMetricValue("HRV", hrvAvg)} ms
              </span>
            )}
          </div>
          <div className="lueur-vitals-split-chart">
            <MiniSparkChart
              points={hrvPoints}
              width={W}
              height={VITALS_SPLIT_CHART_H}
              pad={12}
              color={COLORS.TEAL}
              gradient="teal"
              valueUnit="ms"
              enriched
              formatValue={(v) => formatMetricValue("HRV", v)}
            />
          </div>
        </div>
      )}
      {rhrPoints.length > 0 && (
        <div className="lueur-vitals-split-block">
          <div className="lueur-vitals-split-head">
            <span className="lueur-stat-chart-label">FC repos</span>
            {rhrAvg != null && (
              <span className="lueur-chart-avg-pill lueur-chart-avg-pill--coral">
                moy. {formatMetricValue("RHR", rhrAvg)} bpm
              </span>
            )}
          </div>
          <div className="lueur-vitals-split-chart">
            <MiniSparkChart
              points={rhrPoints}
              width={W}
              height={VITALS_SPLIT_CHART_H}
              pad={12}
              color={COLORS.CORAL}
              gradient="coral"
              valueUnit="bpm"
              enriched
              formatValue={(v) => formatMetricValue("RHR", v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LueurRespSpo2Chart({ history }) {
  const respPoints = useMemo(
    () =>
      (history || [])
        .filter((d) => d.respiratory != null)
        .map((d) => ({ date: d.date, value: d.respiratory })),
    [history],
  );
  const spo2Points = useMemo(
    () =>
      (history || [])
        .filter((d) => d.spo2 != null)
        .map((d) => ({ date: d.date, value: d.spo2 })),
    [history],
  );

  if (!respPoints.length && !spo2Points.length) return null;

  const respAvg = seriesBaseline(history, "respiratory");
  const spo2Avg = seriesBaseline(history, "spo2");
  const spo2LowN = spo2Points.filter((p) => p.value < 95).length;

  return (
    <div className="lueur-vitals-split">
      {respPoints.length > 0 && (
        <div className="lueur-vitals-split-block">
          <div className="lueur-vitals-split-head">
            <span className="lueur-stat-chart-label">Respiration</span>
            {respAvg != null && (
              <span className="lueur-chart-avg-pill lueur-chart-avg-pill--blue">
                moy. {formatMetricValue("Respiration", respAvg)}/min
              </span>
            )}
          </div>
          <div className="lueur-vitals-split-chart">
            <MiniSparkChart
              points={respPoints}
              width={W}
              height={VITALS_SPLIT_CHART_H}
              pad={12}
              color={COLORS.BLUE}
              gradient="blue"
              valueUnit="/min"
              enriched
              formatValue={(v) => formatMetricValue("Respiration", v)}
            />
          </div>
        </div>
      )}
      {spo2Points.length > 0 && (
        <div className="lueur-vitals-split-block">
          <div className="lueur-vitals-split-head">
            <span className="lueur-stat-chart-label">SpO₂</span>
            <div className="lueur-vitals-split-pills">
              {spo2Avg != null && (
                <span className="lueur-chart-avg-pill lueur-chart-avg-pill--blue">
                  moy. {formatMetricValue("SpO2", spo2Avg)} %
                </span>
              )}
              {spo2LowN > 0 && (
                <span className="lueur-chart-avg-pill lueur-chart-avg-pill--coral">
                  {spo2LowN} nuit{spo2LowN > 1 ? "s" : ""} sous 95 %
                </span>
              )}
            </div>
          </div>
          <div className="lueur-vitals-split-chart">
            {spo2Points.length >= 2 ? (
              <Spo2ThresholdChart
                series={spo2Points}
                variant="compact"
                width={W}
                height={VITALS_SPLIT_CHART_H}
              />
            ) : (
              <MiniSparkChart
                points={spo2Points}
                width={W}
                height={VITALS_SPLIT_CHART_H}
                pad={12}
                color={COLORS.BLUE}
                gradient="blue"
                valueUnit="%"
                enriched
                formatValue={(v) => formatMetricValue("SpO2", v)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const SLEEP_COLOR = "#8b7fd4";
const SCORE_TRACKS = [
  { key: "recovery", label: "Récupération", color: COLORS.TEAL, fillOpacity: 0.12 },
  { key: "sleep", label: "Sommeil", color: SLEEP_COLOR, fillOpacity: 0.1 },
  { key: "strain", label: "Charge", color: COLORS.BLUE, fillOpacity: 0.08 },
];

function LueurScoresChart({ history }) {
  const [hover, setHover] = useState(null);
  const { ref, vw, vh, scale: s } = useFluidChartSize({ w: W, h: SCORES_MULTIPLES_H }, 300);
  const t = Math.min(s, 1.08);

  const layout = useMemo(() => {
    if (!history?.length) return null;

    const padL = vw * 0.175;
    const padR = vw * 0.11;
    const padT = 8 * t;
    const padB = 22 * t;
    const trackGap = 7 * t;
    const n = history.length;
    const plotW = vw - padL - padR;
    const trackH = (vh - padT - padB - 2 * trackGap) / 3;
    const xOf = (i) => padL + (plotW * i) / Math.max(n - 1, 1);
    const xPoints = history.map((row, i) => ({ date: row.date, x: xOf(i) }));
    const bandW = plotW / Math.max(n - 1, 1);

    const tracks = SCORE_TRACKS.map((def, ti) => {
      const trackTop = padT + ti * (trackH + trackGap);
      const baseY = trackTop + trackH;
      const yOf = (v) => trackTop + trackH * (1 - Math.min(100, Math.max(0, v)) / 100);
      const seg = buildSegments(history, def.key, xOf, yOf);
      const avg = seriesBaseline(history, def.key);
      const valid = seg.coords.filter((c) => c.y != null);
      const last = valid[valid.length - 1] ?? null;

      return {
        ...def,
        trackTop,
        trackH,
        baseY,
        yOf,
        seg,
        avg,
        last,
      };
    });

    return { padL, padR, padT, padB, trackH, xPoints, bandW, tracks, plotBottom: padT + 3 * trackH + 2 * trackGap };
  }, [history, vw, vh, t]);

  if (!layout) return null;

  const { padL, padR, xPoints, bandW, tracks, plotBottom, padT } = layout;
  const activeIdx = hover;
  const activeRow = activeIdx != null ? history[activeIdx] : null;
  const activeX = activeIdx != null ? xPoints[activeIdx]?.x : null;

  return (
    <div className="lueur-scores-multiples-panel">
      <div
        className="lueur-scores-multiples"
        onMouseLeave={() => setHover(null)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setHover(null);
        }}
        tabIndex={0}
        role="img"
        aria-label={`Scores sur ${history.length} jours. Flèches pour parcourir, toucher pour sélectionner.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const cur = hover ?? history.length - 1;
            const next =
              e.key === "ArrowRight"
                ? Math.min(history.length - 1, cur + 1)
                : Math.max(0, cur - 1);
            setHover(next);
          } else if (e.key === "Escape") {
            setHover(null);
          }
        }}
      >
        {activeRow && activeX != null && (
          <div className="lueur-spark-tooltip" style={{ left: `${(activeX / vw) * 100}%` }}>
            <span className="lueur-spark-tooltip-date">{formatChartDate(activeRow.date)}</span>
            {activeRow.recovery != null && (
              <span className="lueur-spark-tooltip-value">Récup. {activeRow.recovery} %</span>
            )}
            {activeRow.sleep != null && (
              <span className="lueur-spark-tooltip-value">Sommeil {activeRow.sleep} %</span>
            )}
            {activeRow.strain != null && (
              <span className="lueur-spark-tooltip-value">Charge {activeRow.strain} %</span>
            )}
          </div>
        )}
        <div ref={ref} className="lueur-chart-fluid-wrap">
          <svg
            viewBox={`0 0 ${vw} ${vh}`}
            width="100%"
            className="lueur-chart-fluid-svg lueur-scores-multiples-svg"
            aria-hidden="true"
          >
            {tracks.map((track) => (
              <g key={track.key}>
                <rect
                  x={padL - 4 * t}
                  y={track.trackTop}
                  width={vw - padL - padR + 8 * t}
                  height={track.trackH}
                  rx={8 * t}
                  fill="#f8f9fb"
                />
                <text
                  x={10 * t}
                  y={track.trackTop + 14 * t}
                  fontSize={11 * t}
                  fontWeight="600"
                  fill={track.color}
                  fontFamily="var(--lueur-sans)"
                >
                  {track.label}
                </text>
                {track.avg != null && (
                  <text
                    x={10 * t}
                    y={track.trackTop + 28 * t}
                    fontSize={9 * t}
                    fill="var(--lueur-muted)"
                    fontFamily="var(--lueur-mono)"
                  >
                    moy {track.avg}
                  </text>
                )}
                {track.seg.segments.map((segment, si) => (
                  <path
                    key={`${track.key}-a-${si}`}
                    d={areaFromSegment(segment, track.baseY)}
                    fill={track.color}
                    fillOpacity={track.fillOpacity}
                  />
                ))}
                {track.avg != null && (
                  <line
                    x1={padL}
                    y1={track.yOf(track.avg)}
                    x2={vw - padR}
                    y2={track.yOf(track.avg)}
                    stroke="#c5cad3"
                    strokeWidth={1 * t}
                    strokeDasharray="4 4"
                    strokeOpacity="0.9"
                  />
                )}
                {track.seg.segments.map((segment, si) => {
                  const d =
                    segment.length >= 2
                      ? smoothLinePath(segment)
                      : segment.length === 1
                        ? `M${segment[0].x.toFixed(1)} ${segment[0].y.toFixed(1)}`
                        : "";
                  if (!d) return null;
                  return (
                    <path
                      key={`${track.key}-l-${si}`}
                      d={d}
                      fill="none"
                      stroke={track.color}
                      strokeWidth={2 * t}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}
                {track.last && (
                  <>
                    <circle
                      cx={track.last.x}
                      cy={track.last.y}
                      r={3.5 * t}
                      fill={track.color}
                      stroke="#fff"
                      strokeWidth={1.5 * t}
                    />
                    <text
                      x={Math.min(track.last.x + 8 * t, vw - padR - 4 * t)}
                      y={track.last.y - 5 * t}
                      fontSize={10 * t}
                      fontWeight="600"
                      fill={track.color}
                      fontFamily="var(--lueur-mono)"
                    >
                      {track.last.value}
                    </text>
                  </>
                )}
              </g>
            ))}
            {history.map((row, i) => (
              <rect
                key={row.date}
                x={xPoints[i].x - bandW / 2}
                y={padT}
                width={bandW}
                height={plotBottom - padT}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setHover(i);
                }}
              />
            ))}
            {activeX != null && (
              <line
                x1={activeX}
                y1={padT}
                x2={activeX}
                y2={plotBottom}
                stroke="var(--lueur-muted)"
                strokeWidth={1 * t}
                strokeDasharray="3 3"
                strokeOpacity="0.45"
              />
            )}
          </svg>
          <ChartXLabels points={xPoints} width={vw} />
        </div>
      </div>
      <p className="lueur-chart-footnote">
        Une piste par KPI, échelle 0–100 partagée, moyenne propre à chaque série. Zéro occlusion.
      </p>
    </div>
  );
}

function LueurStressChart({ history }) {
  const stressHistory = useMemo(
    () => (history || []).filter((d) => d.stress != null).slice(-14),
    [history],
  );

  if (!stressHistory.length) {
    return (
      <div className="lueur-chart-empty">
        <p>
          Pas encore de courbe — il faut la FC diurne (intraday) sur au moins un jour
          synchronisé, en plus de la FC repos.
        </p>
        <p className="lueur-meta" style={{ marginTop: 8 }}>
          Vérifie que Fitbit / Health Connect partage bien la fréquence cardiaque continue.
        </p>
      </div>
    );
  }

  if (stressHistory.length === 1) {
    const row = stressHistory[0];
    return (
      <div className="lueur-stress-single">
        <div className="lueur-stress-single-head">
          <span className="lueur-stress-single-value">{row.stress}%</span>
          <span className="lueur-stress-single-label">Charge cardio estimée</span>
        </div>
        <p className="lueur-meta">{formatChartDate(row.date)}</p>
        <p className="lueur-chart-footnote">
          Un seul jour de FC diurne pour l&apos;instant — la courbe apparaît dès 2 jours synchronisés.
        </p>
      </div>
    );
  }

  const series = stressHistory.map((row) => ({ date: row.date, value: row.stress }));
  return <StressZonesChart series={series} />;
}

export function LueurComparePanel({ history }) {
  if (!history?.length) return null;

  const hasRespSpo2 = history.some((d) => d.respiratory != null || d.spo2 != null);

  return (
    <LueurCard>
      <p className="lueur-label lueur-card-section-label">Comparatif</p>
      <p className="lueur-meta" style={{ marginBottom: 20 }}>
        Courbes 14 jours · toucher ou flèches pour le détail · poids dans Santé
      </p>

      <div className="lueur-compare-block">
        <LueurMetricLabel id="compare_vitals" as="p" className="lueur-stat-chart-label">
          Vitaux · vs moyenne
        </LueurMetricLabel>
        <LueurVitalsChart history={history} />
      </div>

      {hasRespSpo2 && (
        <div className="lueur-compare-block">
          <LueurMetricLabel id="compare_resp_spo2" as="p" className="lueur-stat-chart-label">
            Respiration & SpO₂ · 14 jours
          </LueurMetricLabel>
          <LueurRespSpo2Chart history={history} />
        </div>
      )}

      <div className="lueur-compare-block">
        <LueurMetricLabel id="compare_scores" as="p" className="lueur-stat-chart-label">
          Scores · vs moyenne
        </LueurMetricLabel>
        <LueurScoresChart history={history} />
      </div>

      <div className="lueur-compare-block">
        <LueurMetricLabel id="compare_stress" as="p" className="lueur-stat-chart-label">
          Charge cardio diurne · 14 jours
        </LueurMetricLabel>
        <LueurStressChart history={history} />
      </div>
    </LueurCard>
  );
}
