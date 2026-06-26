import { useMemo, useState } from "react";
import { LueurCard } from "./LueurCard";
import { COLORS, formatChartDate, pickVisibleXLabels, xLabelStyle } from "./chartUtils";
import { seriesBaseline } from "../../utils/comparisons";
import { formatMetricValue } from "../../utils/formatMetric";
import { LueurMetricLabel } from "./LueurInfoTip";
import { MiniSparkChart } from "./MiniSparkChart";

const W = 520;
const H_SCORES = 176;

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
  if (!seg.length) return "";
  const head = seg.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const last = seg[seg.length - 1];
  const first = seg[0];
  return `${head} L${last.x.toFixed(1)} ${baseY} L${first.x.toFixed(1)} ${baseY} Z`;
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
          <MiniSparkChart
            points={hrvPoints}
            width={W}
            height={100}
            pad={12}
            color={COLORS.TEAL}
            gradient="teal"
            valueUnit="ms"
            formatValue={(v) => formatMetricValue("HRV", v)}
          />
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
          <MiniSparkChart
            points={rhrPoints}
            width={W}
            height={100}
            pad={12}
            color={COLORS.CORAL}
            gradient="coral"
            valueUnit="bpm"
            formatValue={(v) => formatMetricValue("RHR", v)}
          />
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
          <MiniSparkChart
            points={respPoints}
            width={W}
            height={100}
            pad={12}
            color={COLORS.BLUE}
            gradient="blue"
            valueUnit="/min"
            formatValue={(v) => formatMetricValue("Respiration", v)}
          />
        </div>
      )}
      {spo2Points.length > 0 && (
        <div className="lueur-vitals-split-block">
          <div className="lueur-vitals-split-head">
            <span className="lueur-stat-chart-label">SpO₂</span>
            {spo2Avg != null && (
              <span className="lueur-chart-avg-pill lueur-chart-avg-pill--blue">
                moy. {formatMetricValue("SpO2", spo2Avg)} %
              </span>
            )}
          </div>
          <MiniSparkChart
            points={spo2Points}
            width={W}
            height={100}
            pad={12}
            color={COLORS.BLUE}
            gradient="blue"
            valueUnit="%"
            formatValue={(v) => formatMetricValue("SpO2", v)}
          />
        </div>
      )}
    </div>
  );
}

const SLEEP_COLOR = "#8b7fd4";
const SCORE_TICKS = [0, 25, 50, 75, 100];

function LueurScoresChart({ history }) {
  const [hover, setHover] = useState(null);

  const layout = useMemo(() => {
    if (!history?.length) return null;
    const pad = { t: 12, r: 16, b: 8, l: 16 };
    const innerW = W - pad.l - pad.r;
    const innerH = H_SCORES - pad.t - pad.b;
    const n = history.length;
    const xInset = 12;
    const plotW = innerW - xInset * 2;
    const xOf = (i) => pad.l + xInset + (plotW * i) / Math.max(n - 1, 1);
    const yOf = (v) => pad.t + innerH * (1 - Math.min(100, Math.max(0, v)) / 100);

    const recovery = buildSegments(history, "recovery", xOf, yOf);
    const sleep = buildSegments(history, "sleep", xOf, yOf);
    const strain = buildSegments(history, "strain", xOf, yOf);

    const xPoints = history.map((row, i) => ({
      date: row.date,
      x: xOf(i),
    }));

    return {
      pad,
      innerH,
      innerW,
      n,
      recovery,
      sleep,
      strain,
      recAvg: seriesBaseline(history, "recovery"),
      baseY: pad.t + innerH,
      yOf,
      xPoints,
    };
  }, [history]);

  if (!layout) return null;

  const { pad, innerH, n, recovery, sleep, strain, recAvg, baseY, yOf, xPoints } = layout;
  const bandW = layout.innerW / Math.max(n - 1, 1);
  const activeIdx = hover;
  const activeRow = activeIdx != null ? history[activeIdx] : null;
  const activeX = activeIdx != null ? xPoints[activeIdx]?.x : null;

  const avgPill =
    recAvg != null ? (
      <div className="lueur-weight-chart-avg-pill">Récup. moy. {recAvg} %</div>
    ) : null;

  return (
    <ChartPanel avgPill={avgPill} plotHeight={H_SCORES} onMouseLeave={() => setHover(null)}>
          <div className="lueur-chart-plot-row">
          <ChartYAxis ticks={SCORE_TICKS} height={H_SCORES} />
          <div className="lueur-chart-plot">
          {activeRow && activeX != null && (
            <div className="lueur-spark-tooltip" style={{ left: `${(activeX / W) * 100}%` }}>
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

          <svg
            width={W}
            height={H_SCORES}
            viewBox={`0 0 ${W} ${H_SCORES}`}
            className="lueur-weight-chart-svg lueur-chart-plot-svg"
            aria-hidden="true"
          >
            <rect
              x={pad.l}
              y={pad.t}
              width={W - pad.l - pad.r}
              height={baseY - pad.t}
              rx="10"
              fill="#f8f9fb"
            />

            {SCORE_TICKS.map((tick) => (
              <line
                key={tick}
                x1={pad.l + 4}
                y1={yOf(tick)}
                x2={W - pad.r}
                y2={yOf(tick)}
                stroke="#e8eaee"
                strokeWidth="1"
              />
            ))}

            {recAvg != null && (
              <line
                x1={pad.l + 4}
                y1={yOf(recAvg)}
                x2={W - pad.r}
                y2={yOf(recAvg)}
                stroke={COLORS.TEAL}
                strokeDasharray="5 5"
                strokeOpacity="0.45"
              />
            )}

            {recovery?.segments.map((seg, i) => (
              <path
                key={`rec-a-${i}`}
                d={areaFromSegment(seg, baseY)}
                fill={COLORS.TEAL}
                fillOpacity="0.12"
              />
            ))}
            {sleep?.segments.map((seg, i) => (
              <path
                key={`slp-a-${i}`}
                d={areaFromSegment(seg, baseY)}
                fill={SLEEP_COLOR}
                fillOpacity="0.1"
              />
            ))}

            {recovery?.segments.map((seg, i) => (
              <path
                key={`rec-l-${i}`}
                d={seg.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={COLORS.TEAL}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ))}
            {sleep?.segments.map((seg, i) => (
              <path
                key={`slp-l-${i}`}
                d={seg.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={SLEEP_COLOR}
                strokeWidth="2"
                strokeLinecap="round"
                strokeOpacity="0.85"
              />
            ))}
            {strain?.segments.map((seg, i) => (
              <path
                key={`str-l-${i}`}
                d={seg.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={COLORS.BLUE}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            ))}

            {history.map((row, i) => (
              <rect
                key={row.date}
                x={xPoints[i].x - bandW / 2}
                y={pad.t}
                width={bandW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}

            {activeX != null && (
              <line
                x1={activeX}
                y1={pad.t}
                x2={activeX}
                y2={baseY}
                stroke="#9aa0ab"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />
            )}
          </svg>

          <ChartXLabels points={xPoints} width={W} />
          </div>
          </div>

          <ChartLegend
            items={[
              { label: "Récupération", color: COLORS.TEAL },
              { label: "Sommeil", color: SLEEP_COLOR },
              { label: "Charge", color: COLORS.BLUE },
            ]}
          />
          <p className="lueur-chart-footnote">
            Récupération, sommeil et charge sur la même échelle 0–100 %.
          </p>
    </ChartPanel>
  );
}

function LueurStressChart({ history }) {
  const [hover, setHover] = useState(null);

  const stressHistory = useMemo(
    () => (history || []).filter((d) => d.stress != null),
    [history],
  );

  const layout = useMemo(() => {
    if (!stressHistory.length) return null;
    const pad = { t: 12, r: 16, b: 8, l: 16 };
    const innerW = W - pad.l - pad.r;
    const innerH = H_SCORES - pad.t - pad.b;
    const n = stressHistory.length;
    const xInset = 12;
    const plotW = innerW - xInset * 2;
    const xOf = (i) =>
      pad.l + xInset + (n === 1 ? plotW / 2 : (plotW * i) / Math.max(n - 1, 1));
    const yOf = (v) => pad.t + innerH * (1 - Math.min(100, Math.max(0, v)) / 100);

    const stress = buildSegments(stressHistory, "stress", xOf, yOf);
    const xPoints = stressHistory.map((row, i) => ({
      date: row.date,
      x: xOf(i),
    }));

    return {
      pad,
      innerH,
      innerW,
      n,
      stress,
      stressAvg: seriesBaseline(stressHistory, "stress"),
      baseY: pad.t + innerH,
      yOf,
      xPoints,
    };
  }, [stressHistory]);

  if (!stressHistory.length) {
    return (
      <div className="lueur-chart-empty">
        <p>
          Pas encore de courbe stress — il faut la FC diurne (intraday) sur au moins un jour
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
          <span className="lueur-stress-single-label">Stress estimé</span>
        </div>
        <p className="lueur-meta">{formatChartDate(row.date)}</p>
        <p className="lueur-chart-footnote">
          Un seul jour de FC diurne pour l&apos;instant — la courbe apparaît dès 2 jours synchronisés.
        </p>
      </div>
    );
  }

  if (!layout) return null;

  const { pad, innerH, n, stress, stressAvg, baseY, yOf, xPoints } = layout;
  const bandW = layout.innerW / Math.max(n - 1, 1);
  const activeIdx = hover;
  const activeRow = activeIdx != null ? stressHistory[activeIdx] : null;
  const activeX = activeIdx != null ? xPoints[activeIdx]?.x : null;

  const pills = [
    stressAvg != null ? { text: `Stress moy. ${stressAvg} %`, tone: "coral" } : null,
    n === 1
      ? {
          text: `${stressHistory[0].stress} % aujourd'hui · tendance dès 2 jours de FC diurne`,
          tone: "muted",
        }
      : null,
  ].filter(Boolean);

  return (
    <ChartPanel pills={pills} plotHeight={H_SCORES} onMouseLeave={() => setHover(null)}>
      <div className="lueur-chart-plot-row">
        <ChartYAxis ticks={SCORE_TICKS} height={H_SCORES} />
        <div className="lueur-chart-plot">
          {activeRow && activeX != null && (
            <div className="lueur-spark-tooltip" style={{ left: `${(activeX / W) * 100}%` }}>
              <span className="lueur-spark-tooltip-date">{formatChartDate(activeRow.date)}</span>
              {activeRow.stress != null && (
                <span className="lueur-spark-tooltip-value">Stress {activeRow.stress} %</span>
              )}
            </div>
          )}

          <svg
            width={W}
            height={H_SCORES}
            viewBox={`0 0 ${W} ${H_SCORES}`}
            className="lueur-weight-chart-svg lueur-chart-plot-svg"
            aria-hidden="true"
          >
            <rect
              x={pad.l}
              y={pad.t}
              width={W - pad.l - pad.r}
              height={baseY - pad.t}
              rx="10"
              fill="#f8f9fb"
            />

            {SCORE_TICKS.map((tick) => (
              <line
                key={tick}
                x1={pad.l + 4}
                y1={yOf(tick)}
                x2={W - pad.r}
                y2={yOf(tick)}
                stroke="#e8eaee"
                strokeWidth="1"
              />
            ))}

            {stressAvg != null && (
              <line
                x1={pad.l + 4}
                y1={yOf(stressAvg)}
                x2={W - pad.r}
                y2={yOf(stressAvg)}
                stroke={COLORS.CORAL}
                strokeDasharray="5 5"
                strokeOpacity="0.45"
              />
            )}

            {stress?.segments.map((seg, i) => (
              <path
                key={`stress-a-${i}`}
                d={areaFromSegment(seg, baseY)}
                fill={COLORS.CORAL}
                fillOpacity="0.12"
              />
            ))}
            {stress?.segments.map((seg, i) => (
              <path
                key={`stress-l-${i}`}
                d={seg.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}
                fill="none"
                stroke={COLORS.CORAL}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ))}

            {stress?.coords
              ?.filter((p) => p.y != null)
              .map((p) => (
                <circle
                  key={p.date}
                  cx={p.x}
                  cy={p.y}
                  r={n === 1 ? 5 : 3.5}
                  fill={COLORS.CORAL}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              ))}

            {stressHistory.map((row, i) => (
              <rect
                key={row.date}
                x={xPoints[i].x - bandW / 2}
                y={pad.t}
                width={bandW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            ))}

            {activeX != null && (
              <line
                x1={activeX}
                y1={pad.t}
                x2={activeX}
                y2={baseY}
                stroke="#9aa0ab"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />
            )}
          </svg>

          <ChartXLabels points={xPoints} width={W} />
        </div>
      </div>

      <ChartLegend items={[{ label: "Stress (estimation FC)", color: COLORS.CORAL }]} />
    </ChartPanel>
  );
}

export function LueurComparePanel({ history }) {
  if (!history?.length) return null;

  const hasRespSpo2 = history.some((d) => d.respiratory != null || d.spo2 != null);

  return (
    <LueurCard>
      <p className="lueur-label lueur-card-section-label">Comparatif</p>
      <p className="lueur-meta" style={{ marginBottom: 20 }}>
        Courbes 14 jours · survolez pour le détail · poids dans Santé
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
          Stress · 14 jours
        </LueurMetricLabel>
        <LueurStressChart history={history} />
      </div>
    </LueurCard>
  );
}
