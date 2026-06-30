import { useId } from "react";
import { COLORS, smoothLinePath, weekdayLetter, zoneColor, formatSleepDuration, smoothAreaPath } from "./chartUtils";
import { useFluidChartSize } from "./useFluidChartSize";

const SLEEP = "#8b7fd4";
const LOAD_CHART_BASE = { w: 520, h: 132 };
const SLEEP_WINDOW_BASE = { w: 520, h: 132 };
const STEPS_WEEK_BASE = { w: 392, h: 148 };
const SLEEP_DEBT_BASE = { w: 520, h: 164 };
const SPO2_VITAL_BASE = { w: 272, h: 132 };
const KPI_BASE = { w: 392, h: 158 };
const RECOVERY_CHART_BASE = { w: 400, h: 172 };
const INK = "#2b2f37";
const RECOVERY_A0 = 150;
const RECOVERY_SP = 240;

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, r, a0, a1) {
  const s = polar(cx, cy, r, a0);
  const e = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${s.x.toFixed(1)} ${s.y.toFixed(1)} A${r} ${r} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
}

function recoveryAngle(v) {
  return RECOVERY_A0 + RECOVERY_SP * (Math.min(100, Math.max(0, v)) / 100);
}

function recoveryScoreColor(score) {
  if (score == null) return COLORS.GREY;
  if (score >= 66) return COLORS.TEAL;
  if (score >= 33) return COLORS.AMBER;
  return COLORS.CORAL;
}

function recoveryDelta(history, focusDate, score) {
  if (score == null || !history?.length) return null;
  const idx = focusDate ? history.findIndex((d) => d.date === focusDate) : history.length - 1;
  const todayIdx = idx >= 0 ? idx : history.length - 1;
  const yesterdayIdx = todayIdx - 1;
  if (yesterdayIdx < 0) return null;
  const prev = history[yesterdayIdx]?.recovery;
  const cur = history[todayIdx]?.recovery ?? score;
  if (prev == null || cur == null) return null;
  return cur - prev;
}

function clock(min) {
  const v = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

/** Compact KPI bar charts — designed at ~392px wide, not full-bleed. */
function KpiBarChartFrame({ children, wide = false, fluid = false, balanced = false, className = "" }) {
  const cls = [
    "lueur-kpi-bar-chart",
    wide && "lueur-kpi-bar-chart--wide",
    fluid && "lueur-kpi-bar-chart--fluid",
    balanced && "lueur-kpi-bar-chart--balanced",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}

/** One vertical bar per night, from bedtime (top) to wake (bottom). Aligned
 *  bars = regular schedule; staggered bars = irregular. */
export function SleepWindowChart({ series, avgBed, avgWake }) {
  const { ref, vw: VW, vh: VH, scale: s } = useFluidChartSize(SLEEP_WINDOW_BASE, 280);
  if (!series?.length) return null;
  const pad = { t: 12 * s, r: 12 * s, b: 6 * s, l: 40 * s };
  const plotW = VW - pad.l - pad.r;
  const plotH = VH - pad.t - pad.b;
  const beds = series.map((item) => item.bed_min);
  const wakes = series.map((item) => item.wake_min);
  const lo = Math.min(...beds) - 15;
  const hi = Math.max(...wakes) + 15;
  const y = (t) => pad.t + (plotH * (t - lo)) / (hi - lo || 1);
  const n = series.length;
  const step = plotW / n;
  const barW = Math.min(12 * s, step * 0.44);
  const ticks = [lo, lo + (hi - lo) / 3, lo + (2 * (hi - lo)) / 3, hi];

  return (
    <KpiBarChartFrame balanced>
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
      <rect x={pad.l} y={pad.t} width={plotW} height={plotH} rx={10 * s} fill="#f8f9fb" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(t)} x2={VW - pad.r} y2={y(t)} stroke="#eceef2" strokeWidth={1 * s} />
          <text x={pad.l - 6 * s} y={y(t) + 3 * s} textAnchor="end" fontSize={8.5 * s} fill="#b3b8c0" fontFamily="var(--lueur-mono)">
            {clock(t)}
          </text>
        </g>
      ))}
      {avgBed != null && (
        <line x1={pad.l} y1={y(avgBed)} x2={VW - pad.r} y2={y(avgBed)} stroke={SLEEP} strokeDasharray="4 4" strokeOpacity="0.38" strokeWidth={1 * s} />
      )}
      {avgWake != null && (
        <line x1={pad.l} y1={y(avgWake)} x2={VW - pad.r} y2={y(avgWake)} stroke={SLEEP} strokeDasharray="4 4" strokeOpacity="0.38" strokeWidth={1 * s} />
      )}
      {series.map((item, i) => {
        const cx = pad.l + step * (i + 0.5);
        const yb = y(item.bed_min);
        const yw = y(item.wake_min);
        return (
          <rect key={item.date} x={cx - barW / 2} y={yb} width={barW} height={Math.max(3 * s, yw - yb)} rx={barW / 2} fill={SLEEP} fillOpacity="0.72" />
        );
      })}
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

/** ACWR ratio over colored zones: blue = under-load, teal = safe (0.8–1.3),
 *  amber = caution (1.3–1.5), coral = overload (>1.5). */
export function LoadBalanceChart({ series }) {
  const gradId = useId().replace(/:/g, "");
  const { ref, vw: VW, vh: VH, scale: s } = useFluidChartSize(LOAD_CHART_BASE, 320);
  if (!series?.length) return null;

  const t = Math.min(s, 1.05);
  const pad = { t: 14 * s, r: 16 * s, b: 10 * s, l: 36 * s };
  const plotW = VW - pad.l - pad.r;
  const plotH = VH - pad.t - pad.b;
  const ratios = series.map((item) => item.ratio);
  const lo = 0.4;
  const hi = Math.max(1.6, Math.max(...ratios) + 0.12);
  const y = (r) => pad.t + plotH * (1 - (Math.max(lo, Math.min(hi, r)) - lo) / (hi - lo || 1));
  const n = series.length;
  const step = plotW / Math.max(n - 1, 1);
  const x = (i) => pad.l + step * i;
  const pts = ratios.map((r, i) => ({ x: x(i), y: y(r), r }));
  const line = smoothLinePath(pts);
  const area = smoothAreaPath(pts, y(lo));
  const last = pts[n - 1];
  const inOpt = last.r >= 0.8 && last.r <= 1.3;
  const badgeColor = inOpt ? COLORS.TEAL : COLORS.AMBER;
  const badgeLabel = `Ratio ${last.r.toFixed(2)}`;
  const badgeW = Math.max(78 * t, badgeLabel.length * 6.4 * t + 16 * t);
  const badgeH = 20 * t;
  const badgeX = Math.min(Math.max(pad.l, last.x - badgeW * 0.55), VW - pad.r - badgeW);
  const badgeAbove = last.y > VH - pad.b - badgeH - 14 * t;
  const badgeY = badgeAbove ? last.y - badgeH - 10 * t : last.y - badgeH / 2 - 2 * t;

  const band = (r1, r2, fill, op) => (
    <rect
      x={pad.l}
      y={y(r2)}
      width={plotW}
      height={Math.max(0, y(r1) - y(r2))}
      fill={fill}
      fillOpacity={op}
    />
  );

  return (
    <KpiBarChartFrame balanced>
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          className="lueur-chart-fluid-svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={INK} stopOpacity="0.07" />
              <stop offset="1" stopColor={INK} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x={pad.l} y={pad.t} width={plotW} height={plotH} rx={8 * t} fill="#f8f9fb" />
          {band(lo, 0.8, COLORS.BLUE, 0.06)}
          {band(0.8, 1.3, COLORS.TEAL, 0.1)}
          {band(1.3, 1.5, COLORS.AMBER, 0.1)}
          {band(1.5, hi, COLORS.CORAL, 0.08)}
          {[1.0, 0.8, 1.3, 1.5].map((tick) => (
            <g key={tick}>
              <line
                x1={pad.l}
                y1={y(tick)}
                x2={VW - pad.r}
                y2={y(tick)}
                stroke={tick === 1 ? "#c5cad3" : "#e8eaee"}
                strokeWidth={1}
                strokeDasharray={tick === 1 ? "4 4" : undefined}
              />
              <text
                x={pad.l - 6 * t}
                y={y(tick) + 3 * t}
                textAnchor="end"
                fontSize={8.5 * t}
                fill="#9aa0ab"
                fontFamily="var(--lueur-mono)"
              >
                {tick.toFixed(1)}
              </text>
            </g>
          ))}
          <rect
            x={pad.l}
            y={y(1.3)}
            width={plotW}
            height={Math.max(0, y(0.8) - y(1.3))}
            fill={COLORS.TEAL}
            fillOpacity="0.08"
          />
          <line
            x1={pad.l}
            y1={y(1.3)}
            x2={VW - pad.r}
            y2={y(1.3)}
            stroke={COLORS.TEAL}
            strokeWidth={1}
            strokeOpacity="0.35"
          />
          <line
            x1={pad.l}
            y1={y(0.8)}
            x2={VW - pad.r}
            y2={y(0.8)}
            stroke={COLORS.TEAL}
            strokeWidth={1}
            strokeOpacity="0.35"
          />
          <text
            x={pad.l + 6 * t}
            y={y(1.05) + 3 * t}
            fontSize={8.5 * t}
            fill={COLORS.TEAL}
            fontWeight="500"
            fontFamily="var(--lueur-mono)"
          >
            zone optimale
          </text>
          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={line}
            fill="none"
            stroke={INK}
            strokeWidth={1.85 * t}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.slice(0, -1).map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.2 * t}
              fill={INK}
              fillOpacity="0.55"
              stroke="#fff"
              strokeWidth={1 * t}
            />
          ))}
          <circle
            cx={last.x}
            cy={last.y}
            r={3.5 * t}
            fill={badgeColor}
            stroke="#fff"
            strokeWidth={1.8 * t}
          />
          <g transform={`translate(${badgeX}, ${badgeY})`}>
            <rect x="0" y="0" width={badgeW} height={badgeH} rx={6 * t} fill={badgeColor} />
            <text
              x={9 * t}
              y={13.5 * t}
              fontSize={10.5 * t}
              fontWeight="600"
              fill="#fff"
              fontFamily="var(--lueur-sans)"
            >
              {badgeLabel}
            </text>
          </g>
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

/** 7-day step bars with goal line and weekly summary. */
export function StepsWeekChart({ series, goal = 10000 }) {
  const { ref, vw: VW, vh: VH, scale: s } = useFluidChartSize(STEPS_WEEK_BASE, 280);
  if (!series?.length) return null;
  const padL = 14 * s;
  const padR = 14 * s;
  const padT = 24 * s;
  const padB = 26 * s;
  const vals = series.map((item) => item.value);
  const n = vals.length;
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / n);
  const metCount = vals.filter((v) => v >= goal).length;
  const maxV = Math.max(goal * 1.35, ...vals);
  const slot = (VW - padL - padR) / n;
  const barW = Math.min(26 * s, slot * 0.5);
  const baseY = VH - padB;
  const goalY = padT + (baseY - padT) * (1 - goal / maxV);
  const TEAL = COLORS.TEAL;
  const MUT = "#cdd2da";

  return (
    <KpiBarChartFrame>
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
      <text x={padL} y={14 * s} fontSize={9.5 * s} fill="#9aa0ab" fontFamily="var(--lueur-mono)">
        moy. {n} j · {avg.toLocaleString("fr-FR")} pas · {metCount}/{n} atteints
      </text>
      {vals.map((v, i) => {
        const cx = padL + slot * (i + 0.5);
        const h = (baseY - padT) * (v / maxV);
        const met = v >= goal;
        const isToday = i === n - 1;
        return (
          <g key={series[i].date ?? i}>
            <rect
              x={cx - barW / 2}
              y={baseY - h}
              width={barW}
              height={h}
              rx={5 * s}
              fill={met ? TEAL : MUT}
              fillOpacity={met ? 0.95 : 0.85}
            />
            {isToday && (
              <rect
                x={cx - barW / 2 - 2 * s}
                y={baseY - h - 2 * s}
                width={barW + 4 * s}
                height={h + 2 * s}
                rx={7 * s}
                fill="none"
                stroke={met ? TEAL : "#9aa0ab"}
                strokeWidth={1.5 * s}
                strokeOpacity="0.4"
              />
            )}
            <text
              x={cx}
              y={baseY - h - 7 * s}
              textAnchor="middle"
              fontSize={8.5 * s}
              fill={met ? TEAL : "#9aa0ab"}
              fontFamily="var(--lueur-mono)"
            >
              {(v / 1000).toFixed(1)}k
            </text>
            <text x={cx} y={VH - 9 * s} textAnchor="middle" fontSize={9 * s} fill="#b3b8c0" fontFamily="var(--lueur-mono)">
              {weekdayLetter(series[i].date)}
            </text>
          </g>
        );
      })}
      <line
        x1={padL}
        y1={goalY}
        x2={VW - padR}
        y2={goalY}
        stroke="#15171c"
        strokeWidth={1.2 * s}
        strokeDasharray="4 4"
        strokeOpacity="0.55"
      />
      <g transform={`translate(${padL}, ${goalY - 9 * s})`}>
        <rect x="0" y="0" width={78 * s} height={18 * s} rx={6 * s} fill="#15171c" />
        <text x={8 * s} y={13 * s} fontSize={9.5 * s} fill="#fff" fontFamily="var(--lueur-mono)">
          objectif {(goal / 1000).toFixed(0)}k
        </text>
      </g>
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

/** Sleep hours vs need with deficit shading and cumulative debt. */
export function SleepDebtChart({ series, defaultNeed = 7.5 }) {
  const { ref, vw: VW, vh: VH, scale: s } = useFluidChartSize(SLEEP_DEBT_BASE, 300);
  if (!series?.length) return null;
  const chartNeed = defaultNeed;
  const rows = series.map((row) => ({
    ...row,
    value: row.value ?? 0,
    need: row.need ?? chartNeed,
  }));
  const padL = 58 * s;
  const padR = 16 * s;
  const padT = 34 * s;
  const padB = 30 * s;
  const n = rows.length;
  const maxV = Math.max(chartNeed + 1, ...rows.map((row) => Math.max(row.value, row.need)));
  const slot = (VW - padL - padR) / n;
  const barW = Math.min(30 * s, slot * 0.52);
  const baseY = VH - padB;
  const sy = (h) => padT + (baseY - padT) * (1 - h / maxV);
  const needMin = Math.min(...rows.map((row) => row.need));
  const needMax = Math.max(...rows.map((row) => row.need));
  const needLabelY = sy(needMax);
  const needLabel =
    needMin === needMax
      ? `besoin ${formatSleepDuration(needMin)}`
      : `besoin ${formatSleepDuration(needMin)} – ${formatSleepDuration(needMax)}`;
  const BLUE = COLORS.BLUE;
  const CORAL = COLORS.CORAL;
  const debt = rows.reduce((sum, row) => {
    if (row.value > 0 && row.value < row.need) return sum + row.need - row.value;
    return sum;
  }, 0);
  const debtLabel = debt > 0 ? `dette ${debt.toFixed(1)}h / ${n}j` : "";
  const debtBadgeW =
    debt > 0 ? Math.max(112 * s, debtLabel.length * 6.2 * s + 18 * s) : 0;
  const debtBadgeX = Math.max(padL, VW - padR - debtBadgeW);

  const valueLabelY = (barTop, barBottom, rowNeedY) => {
    const barH = barBottom - barTop;
    if (barH >= 26 * s) return barTop + barH / 2 + 4 * s;
    const above = barTop - 9 * s;
    if (above > rowNeedY + 14 * s && above > padT + 6 * s) return above;
    return Math.min(barBottom - 8 * s, rowNeedY - 12 * s);
  };

  return (
    <KpiBarChartFrame wide>
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
      {rows.map((row, i) => {
        const v = row.value;
        const rowNeed = row.need;
        const rowNeedY = sy(rowNeed);
        const cx = padL + slot * (i + 0.5);
        const short = v > 0 && v < rowNeed;
        const barTop = sy(v);
        const barBottom = baseY;
        const barH = barBottom - barTop;
        const labelY = v > 0 ? valueLabelY(barTop, barBottom, rowNeedY) : null;
        const labelInside = barH >= 26 * s;
        return (
          <g key={row.date ?? i}>
            <line
              x1={cx - barW / 2 - 2 * s}
              y1={rowNeedY}
              x2={cx + barW / 2 + 2 * s}
              y2={rowNeedY}
              stroke={BLUE}
              strokeWidth={1.2 * s}
              strokeDasharray="3 4"
              strokeOpacity="0.55"
            />
            {short && (
              <rect
                x={cx - barW / 2}
                y={rowNeedY}
                width={barW}
                height={Math.max(0, sy(v) - rowNeedY)}
                rx={5 * s}
                fill={CORAL}
                fillOpacity="0.16"
              />
            )}
            {v > 0 && (
              <rect
                x={cx - barW / 2}
                y={barTop}
                width={barW}
                height={barH}
                rx={5 * s}
                fill={BLUE}
                fillOpacity="0.9"
              />
            )}
            {v > 0 && labelY != null && (
              <text
                x={cx}
                y={labelY}
                textAnchor="middle"
                fontSize={10 * s}
                fontWeight={labelInside ? "600" : "500"}
                fill={labelInside ? "#fff" : short ? "#cf6f4f" : BLUE}
                fontFamily="var(--lueur-mono)"
              >
                {v.toFixed(1)}
              </text>
            )}
            <text x={cx} y={VH - 10 * s} textAnchor="middle" fontSize={10 * s} fill="#9aa0ab" fontFamily="var(--lueur-mono)">
              {weekdayLetter(row.date)}
            </text>
          </g>
        );
      })}
      <text
        x={padL - 10 * s}
        y={needLabelY + 4 * s}
        textAnchor="end"
        fontSize={10 * s}
        fill={BLUE}
        fontFamily="var(--lueur-mono)"
      >
        {needLabel}
      </text>
      {debt > 0 && (
        <g transform={`translate(${debtBadgeX}, ${8 * s})`}>
          <rect x="0" y="0" width={debtBadgeW} height={20 * s} rx={7 * s} fill="#fbeee9" stroke={CORAL} strokeOpacity="0.4" />
          <text x={9 * s} y={14 * s} fontSize={9.5 * s} fill="#cf6f4f" fontFamily="var(--lueur-mono)">
            {debtLabel}
          </text>
        </g>
      )}
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

/** Zoned recovery gauge + delta vs yesterday + 7-day mini trend. */
export function RecoveryZonedChart({ score, zone, history, focusDate, statusLabel }) {
  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize(RECOVERY_CHART_BASE, 300);
  if (score == null) return null;

  const t = Math.min(s, 1.08);
  const cx = W * 0.245;
  const cy = H * 0.54;
  const r = Math.min(W * 0.145, H * 0.36);
  const valCol = zone ? zoneColor(zone) : recoveryScoreColor(score);
  const marker = polar(cx, cy, r, recoveryAngle(score));
  const delta = recoveryDelta(history, focusDate, score);
  const trend = (history || [])
    .slice(-7)
    .map((d) => d.recovery)
    .filter((v) => v != null);

  const panelL = W * 0.48;
  const panelR = W * 0.97;
  const panelW = panelR - panelL;
  const badgeH = 20 * t;
  const badgeY = 8 * t;
  const trendLabelY = badgeY + badgeH + 16 * t;
  const trendTop = trendLabelY + 14 * t;
  const trendBot = H - 10 * t;

  let trendLine = null;
  let trendLast = null;
  if (trend.length >= 2) {
    const tmin = Math.min(...trend) - 3;
    const tmax = Math.max(...trend) + 3;
    const tpts = trend.map((v, i) => ({
      x: panelL + (panelW * i) / (trend.length - 1),
      y: trendTop + (trendBot - trendTop) * (1 - (v - tmin) / (tmax - tmin || 1)),
    }));
    trendLine = smoothLinePath(tpts);
    trendLast = tpts[tpts.length - 1];
  }

  const deltaUp = delta != null && delta > 0;
  const deltaFlat = delta != null && delta === 0;
  const deltaSign = deltaFlat ? "=" : deltaUp ? "▲" : "▼";
  const deltaCol = deltaFlat ? "#9aa0ab" : deltaUp ? "#13916f" : COLORS.CORAL;
  const deltaBg = deltaFlat ? "#f3f4f6" : deltaUp ? "#e7f6f1" : "#fbeee9";
  const deltaText =
    delta != null
      ? `${deltaSign} ${delta > 0 ? "+" : ""}${delta} vs hier`
      : null;
  const deltaBadgeW = deltaText
    ? Math.min(panelW, Math.max(76 * t, deltaText.length * 6.4 * t + 18 * t))
    : 0;

  const scoreSize = Math.min(26 * t, r * 0.65);
  const labelSize = 8 * t;
  const statusSize = 10.5 * t;
  const scoreY = cy;
  const labelY = cy - scoreSize * 0.5 - labelSize * 0.35;
  const statusY = cy + scoreSize * 0.52 + statusSize * 0.15;
  const markerNearLabel =
    Math.hypot(marker.x - cx, marker.y - statusY) < r * 0.38 ||
    Math.hypot(marker.x - cx, marker.y - scoreY) < r * 0.32;

  return (
    <KpiBarChartFrame balanced className="lueur-recovery-zoned-chart">
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
          <path
            d={arcPath(cx, cy, r, RECOVERY_A0, RECOVERY_A0 + RECOVERY_SP)}
            fill="none"
            stroke="#eef1f5"
            strokeWidth={10 * t}
            strokeLinecap="round"
          />
          <path
            d={arcPath(cx, cy, r, recoveryAngle(0), recoveryAngle(33))}
            fill="none"
            stroke={COLORS.CORAL}
            strokeWidth={10 * t}
            strokeOpacity="0.22"
          />
          <path
            d={arcPath(cx, cy, r, recoveryAngle(33), recoveryAngle(66))}
            fill="none"
            stroke={COLORS.AMBER}
            strokeWidth={10 * t}
            strokeOpacity="0.22"
          />
          <path
            d={arcPath(cx, cy, r, recoveryAngle(66), recoveryAngle(100))}
            fill="none"
            stroke={COLORS.TEAL}
            strokeWidth={10 * t}
            strokeOpacity="0.22"
          />
          <path
            d={arcPath(cx, cy, r, RECOVERY_A0, recoveryAngle(score))}
            fill="none"
            stroke={valCol}
            strokeWidth={10 * t}
            strokeLinecap="round"
          />
          {!markerNearLabel && (
            <circle
              cx={marker.x}
              cy={marker.y}
              r={5.5 * t}
              fill="#fff"
              stroke={valCol}
              strokeWidth={2.5 * t}
            />
          )}
          <text
            x={cx}
            y={labelY}
            textAnchor="middle"
            fontSize={labelSize}
            letterSpacing={1.2 * t}
            fill="#9aa0ab"
            fontFamily="var(--lueur-mono)"
          >
            RÉCUP
          </text>
          <text
            x={cx}
            y={scoreY}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={scoreSize}
            fontWeight="300"
            fill="#15171c"
            fontFamily="var(--lueur-sans)"
          >
            {score}
          </text>
          {statusLabel && (
            <text
              x={cx}
              y={statusY}
              textAnchor="middle"
              dominantBaseline="hanging"
              fontSize={statusSize}
              fontWeight="600"
              fill={valCol}
              fontFamily="var(--lueur-sans)"
            >
              {statusLabel}
            </text>
          )}
          {deltaText && (
            <g transform={`translate(${panelL}, ${badgeY})`}>
              <rect x="0" y="0" width={deltaBadgeW} height={badgeH} rx={6 * t} fill={deltaBg} />
              <text
                x={9 * t}
                y={13.5 * t}
                fontSize={11 * t}
                fontWeight="600"
                fill={deltaCol}
                fontFamily="var(--lueur-sans)"
              >
                {deltaText}
              </text>
            </g>
          )}
          {trendLine && (
            <>
              <text
                x={panelL}
                y={trendLabelY}
                fontSize={8.5 * t}
                fill="#9aa0ab"
                fontFamily="var(--lueur-sans)"
              >
                tendance 7 j
              </text>
              <path
                d={trendLine}
                fill="none"
                stroke={COLORS.TEAL}
                strokeWidth={1.8 * t}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {trendLast && (
                <circle
                  cx={trendLast.x}
                  cy={trendLast.y}
                  r={3 * t}
                  fill={COLORS.TEAL}
                  stroke="#fff"
                  strokeWidth={1.5 * t}
                />
              )}
            </>
          )}
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

/** 14-day stress line over calme / modéré / élevé zones. */
export function StressZonesChart({ series, compact = false }) {
  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize(KPI_BASE, 280);
  const data = (series || []).filter((row) => row.value != null).slice(-14);
  if (data.length < 2) return null;

  const padL = 12 * s;
  const padR = 14 * s;
  const padT = 14 * s;
  const padB = 24 * s;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = data.length;
  const values = data.map((row) => row.value);
  const today = values[n - 1];
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / n);
  const sy = (v) => padT + plotH * (1 - v / 100);
  const sx = (i) => padL + (plotW * i) / (n - 1);
  const pts = values.map((v, i) => ({ x: sx(i), y: sy(v) }));
  const line = smoothLinePath(pts);
  const last = pts[n - 1];
  const badgeTone =
    today >= 66 ? COLORS.CORAL : today >= 33 ? COLORS.AMBER : COLORS.TEAL;

  return (
    <KpiBarChartFrame balanced={compact}>
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
          <rect x={padL} y={sy(33)} width={plotW} height={sy(0) - sy(33)} fill={COLORS.TEAL} fillOpacity="0.1" />
          <rect x={padL} y={sy(66)} width={plotW} height={sy(33) - sy(66)} fill={COLORS.AMBER} fillOpacity="0.1" />
          <rect x={padL} y={sy(100)} width={plotW} height={sy(66) - sy(100)} fill={COLORS.CORAL} fillOpacity="0.1" />
          <text
            x={W - padR - 3 * s}
            y={sy(16) + 3 * s}
            textAnchor="end"
            fontSize={8.5 * s}
            fill="#13916f"
            fontFamily="var(--lueur-mono)"
          >
            calme
          </text>
          <text
            x={W - padR - 3 * s}
            y={sy(50) + 3 * s}
            textAnchor="end"
            fontSize={8.5 * s}
            fill="#b07d12"
            fontFamily="var(--lueur-mono)"
          >
            modéré
          </text>
          <text
            x={W - padR - 3 * s}
            y={sy(83) + 3 * s}
            textAnchor="end"
            fontSize={8.5 * s}
            fill="#cf6f4f"
            fontFamily="var(--lueur-mono)"
          >
            élevé
          </text>
          <line
            x1={padL}
            y1={sy(avg)}
            x2={W - padR}
            y2={sy(avg)}
            stroke={INK}
            strokeWidth={1 * s}
            strokeDasharray="3 4"
            strokeOpacity="0.4"
          />
          <path
            d={line}
            fill="none"
            stroke={INK}
            strokeWidth={2.4 * s}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={last.x}
            cy={last.y}
            r={5 * s}
            fill={badgeTone}
            stroke="#fff"
            strokeWidth={2.5 * s}
          />
          <g transform={`translate(${last.x - 74 * s}, ${last.y - 11 * s})`}>
            <rect x="0" y="0" width={70 * s} height={22 * s} rx={7 * s} fill={badgeTone} />
            <text
              x={9 * s}
              y={15 * s}
              fontSize={12 * s}
              fontWeight="600"
              fill="#fff"
              fontFamily="var(--lueur-sans)"
            >
              indice {today}
            </text>
          </g>
          <text x={padL} y={H - 8 * s} fontSize={8.5 * s} fill="#b3b8c0" fontFamily="var(--lueur-mono)">
            {n} jours · moy. {avg}
          </text>
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

/** Skin temperature deviations as diverging bars centered on baseline. */
export function SkinTempDivergingChart({ series, threshold = 0.3 }) {
  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize(KPI_BASE, 280);
  const data = (series || []).filter((v) => v != null).slice(-14);
  if (!data.length) return null;

  const padL = 30 * s;
  const padR = 14 * s;
  const padT = 18 * s;
  const padB = 24 * s;
  const plotW = W - padL - padR;
  const maxAbs = Math.max(threshold, ...data.map((v) => Math.abs(v)), 0.4);
  const baseY = (padT + (H - padB)) / 2;
  const half = (H - padB - padT) / 2;
  const sy = (d) => baseY - half * (d / maxAbs);
  const n = data.length;
  const slot = plotW / n;
  const barW = Math.min(15 * s, slot * 0.55);

  return (
    <KpiBarChartFrame balanced>
      <div ref={ref} className="lueur-chart-fluid-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
          <line
            x1={padL}
            y1={sy(threshold)}
            x2={W - padR}
            y2={sy(threshold)}
            stroke={COLORS.CORAL}
            strokeWidth={1 * s}
            strokeDasharray="3 4"
            strokeOpacity="0.5"
          />
          <line
            x1={padL}
            y1={sy(-threshold)}
            x2={W - padR}
            y2={sy(-threshold)}
            stroke={COLORS.BLUE}
            strokeWidth={1 * s}
            strokeDasharray="3 4"
            strokeOpacity="0.5"
          />
          <line x1={padL} y1={baseY} x2={W - padR} y2={baseY} stroke="#c9ced6" strokeWidth={1.2 * s} />
          <text
            x={padL - 6 * s}
            y={sy(threshold) + 3 * s}
            textAnchor="end"
            fontSize={8.5 * s}
            fill="#cf6f4f"
            fontFamily="var(--lueur-mono)"
          >
            +{threshold}
          </text>
          <text
            x={padL - 6 * s}
            y={baseY + 3 * s}
            textAnchor="end"
            fontSize={8.5 * s}
            fill="#9aa0ab"
            fontFamily="var(--lueur-mono)"
          >
            base
          </text>
          <text
            x={padL - 6 * s}
            y={sy(-threshold) + 3 * s}
            textAnchor="end"
            fontSize={8.5 * s}
            fill={COLORS.BLUE}
            fontFamily="var(--lueur-mono)"
          >
            −{threshold}
          </text>
          {data.map((v, i) => {
            const cx = padL + slot * (i + 0.5);
            const y = sy(v);
            const up = v >= 0;
            const h = Math.abs(baseY - y);
            const col = up ? COLORS.CORAL : COLORS.BLUE;
            const isToday = i === n - 1;
            return (
              <g key={i}>
                <rect
                  x={cx - barW / 2}
                  y={up ? y : baseY}
                  width={barW}
                  height={Math.max(1.5 * s, h)}
                  rx={3 * s}
                  fill={col}
                  fillOpacity={isToday ? 0.95 : 0.6}
                />
                {isToday && (
                  <text
                    x={cx}
                    y={up ? y - 6 * s : y + 12 * s}
                    textAnchor="middle"
                    fontSize={9 * s}
                    fill={col}
                    fontFamily="var(--lueur-mono)"
                  >
                    {v >= 0 ? "+" : ""}
                    {v.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </KpiBarChartFrame>
  );
}

export function spo2LowNightCount(series) {
  return (series || []).filter((row) => row.value != null && row.value < 95).length;
}

/** SpO₂ line with normal band, vigilance zone, and low-night count. */
export function Spo2ThresholdChart({
  series,
  variant,
  compact = false,
  width = 392,
  height = 158,
}) {
  const mode = variant || (compact ? "compact" : "default");
  const modeConfig = {
    default: {
      base: KPI_BASE,
      minW: 280,
      tCap: null,
      padL: 28,
      padR: 12,
      padT: 20,
      padB: 12,
      axisFont: 10,
      lineW: 2.4,
      dotR: 5,
      showBubble: true,
      showLowBadge: true,
      showThresholdHint: true,
      wrapClass: "",
      framed: true,
    },
    vital: {
      base: SPO2_VITAL_BASE,
      minW: 200,
      tCap: 1,
      padL: 34,
      padR: 10,
      padT: 18,
      padB: 8,
      axisFont: 10.5,
      lineW: 2.3,
      dotR: 4.5,
      showBubble: false,
      showLowBadge: false,
      showThresholdHint: true,
      wrapClass: "lueur-spo2-chart--vital",
      framed: false,
    },
    compact: {
      base: { w: width, h: height },
      minW: 160,
      tCap: 1.05,
      padL: 24,
      padR: 8,
      padT: 12,
      padB: 4,
      axisFont: 9,
      lineW: 2,
      dotR: 3.5,
      showBubble: true,
      showLowBadge: false,
      showThresholdHint: false,
      wrapClass: "lueur-chart-fluid-wrap--split",
      framed: false,
    },
  }[mode];

  const { ref, vw: W, vh: H, scale: s } = useFluidChartSize(modeConfig.base, modeConfig.minW);
  const data = (series || []).filter((row) => row.value != null).slice(-14);
  if (data.length < 2) return null;

  const t = modeConfig.tCap != null ? Math.min(s, modeConfig.tCap) : s;
  const padL = modeConfig.padL * t;
  const padR = modeConfig.padR * t;
  const padT = modeConfig.padT * t;
  const padB = modeConfig.padB * t;
  const lo = 90;
  const hi = 100;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = data.length;
  const values = data.map((row) => row.value);
  const today = values[n - 1];
  const sx = (i) => padL + (plotW * i) / (n - 1);
  const sy = (v) => padT + plotH * (1 - (v - lo) / (hi - lo));
  const pts = values.map((v, i) => ({ x: sx(i), y: sy(v), v }));
  const line = smoothLinePath(pts);
  const lowN = spo2LowNightCount(data);
  const last = pts[n - 1];
  const bubbleW = mode === "compact" ? 46 * t : 54 * t;
  const bubbleH = mode === "compact" ? 18 * t : 22 * t;
  const bubbleX = Math.min(Math.max(padL, last.x - bubbleW * 0.5), W - padR - bubbleW);
  const bubbleY = Math.max(padT, last.y - bubbleH - 6 * t);
  const axisFont = modeConfig.axisFont * t;

  const svg = (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="lueur-chart-fluid-svg" aria-hidden="true">
      <rect
        x={padL}
        y={padT}
        width={plotW}
        height={sy(95) - padT}
        fill={COLORS.TEAL}
        fillOpacity="0.1"
      />
      <rect
        x={padL}
        y={sy(95)}
        width={plotW}
        height={Math.max(0, sy(90) - sy(95))}
        fill={COLORS.AMBER}
        fillOpacity="0.1"
      />
      <line
        x1={padL}
        y1={sy(95)}
        x2={W - padR}
        y2={sy(95)}
        stroke={COLORS.AMBER}
        strokeWidth={1.2 * t}
        strokeDasharray="4 4"
        strokeOpacity="0.75"
      />
      <text
        x={padL - 6 * t}
        y={sy(100) + 4 * t}
        textAnchor="end"
        fontSize={axisFont}
        fill="#0f7d62"
        fontFamily="var(--lueur-mono)"
        fontWeight="500"
      >
        100
      </text>
      <text
        x={padL - 6 * t}
        y={sy(95) + 4 * t}
        textAnchor="end"
        fontSize={axisFont}
        fill="#9a7a2e"
        fontFamily="var(--lueur-mono)"
        fontWeight="500"
      >
        95
      </text>
      {modeConfig.showThresholdHint && (
        <text
          x={W - padR}
          y={sy(95) - 7 * t}
          textAnchor="end"
          fontSize={axisFont * 0.92}
          fill="#9a7a2e"
          fontFamily="var(--lueur-mono)"
        >
          ≥ 95 %
        </text>
      )}
      <path
        d={line}
        fill="none"
        stroke={COLORS.BLUE}
        strokeWidth={modeConfig.lineW * t}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts
        .filter((p) => p.v < 95)
        .map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={(modeConfig.dotR - 1) * t}
            fill="#fff"
            stroke={COLORS.AMBER}
            strokeWidth={1.6 * t}
          />
        ))}
      <circle
        cx={last.x}
        cy={last.y}
        r={modeConfig.dotR * t}
        fill={COLORS.BLUE}
        stroke="#fff"
        strokeWidth={2.2 * t}
      />
      {modeConfig.showBubble && (
        <g transform={`translate(${bubbleX}, ${bubbleY})`}>
          <rect x="0" y="0" width={bubbleW} height={bubbleH} rx={(mode === "compact" ? 5 : 7) * t} fill={INK} />
          <text
            x={7 * t}
            y={(mode === "compact" ? 12 : 15) * t}
            fontSize={(mode === "compact" ? 10 : 12) * t}
            fontWeight="600"
            fill="#fff"
            fontFamily="var(--lueur-sans)"
          >
            {mode === "compact" ? `${today}%` : `${today} %`}
          </text>
        </g>
      )}
      {modeConfig.showLowBadge && lowN > 0 && (
        <g transform={`translate(${padL}, ${H - 16 * t})`}>
          <rect x="0" y="0" width={122 * t} height={16 * t} rx={6 * t} fill="#fbf3e6" />
          <text x={7 * t} y={12 * t} fontSize={9.5 * t} fill="#b07d12" fontFamily="var(--lueur-mono)">
            {lowN} nuit{lowN > 1 ? "s" : ""} sous 95 %
          </text>
        </g>
      )}
    </svg>
  );

  const wrap = (
    <div ref={ref} className={`lueur-chart-fluid-wrap ${modeConfig.wrapClass}`.trim()}>
      {svg}
    </div>
  );

  if (modeConfig.framed) {
    return <KpiBarChartFrame balanced>{wrap}</KpiBarChartFrame>;
  }

  return wrap;
}
