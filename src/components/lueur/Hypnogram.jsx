import {
  COLORS,
  formatClockTime,
  stagesToHypnoSegments,
  timelineToHypnoRects,
} from "./chartUtils";
import { useFluidChartSize } from "./useFluidChartSize";

const STAGE_LABELS = [
  { key: "awake_min", label: "Éveil", color: COLORS.GREY },
  { key: "rem_min", label: "Paradoxal", color: COLORS.BLUE },
  { key: "light_min", label: "Léger", color: COLORS.LBLUE },
  { key: "deep_min", label: "Profond", color: COLORS.TEAL },
];

const MINI = { width: 260, height: 70, laneY: [6, 22, 38, 54], barH: 12 };
const FULL = { width: 700, height: 160, laneY: [14, 52, 90, 128], barH: 22 };

function resolveRects(timeline, stages, config) {
  const { width, laneY, barH } = config;
  if (timeline?.length) {
    const { rects } = timelineToHypnoRects(timeline, width, laneY, barH);
    if (rects.length) return { rects, fromTimeline: true };
  }
  const rects = stagesToHypnoSegments(stages, width, laneY, barH);
  return { rects, fromTimeline: false };
}

export function HypnogramMini({ timeline, stages, width = MINI.width }) {
  const { ref, vw, vh, scale: s } = useFluidChartSize({ w: width, h: MINI.height }, 180);
  const laneY = MINI.laneY.map((y) => y * s);
  const barH = MINI.barH * s;
  const config = { width: vw, height: vh, laneY, barH };
  const { rects } = resolveRects(timeline, stages, config);

  if (!rects.length) {
    return <p className="lueur-mono-meta">Hypnogramme indisponible</p>;
  }

  return (
    <div ref={ref} className="lueur-hypno-mini">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width="100%"
        className="lueur-hypno-svg lueur-chart-fluid-svg"
        aria-hidden
      >
        {rects.map((r) => (
          <rect key={r.key ?? `${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={3 * s} fill={r.color} />
        ))}
      </svg>
      <HypnogramLegend />
    </div>
  );
}

export function HypnogramFull({ timeline, stages, bedtime, wakeup, width = FULL.width }) {
  const { ref, vw, vh, scale: s } = useFluidChartSize({ w: width, h: FULL.height }, 320);
  const laneY = FULL.laneY.map((y) => y * s);
  const barH = FULL.barH * s;
  const config = { width: vw, height: vh, laneY, barH };
  const { rects, fromTimeline } = resolveRects(timeline, stages, config);
  const startLabel = formatClockTime(bedtime) || (fromTimeline ? formatClockTime(timeline?.[0]?.start) : null);
  const endLabel = formatClockTime(wakeup) || (fromTimeline ? formatClockTime(timeline?.[timeline.length - 1]?.end) : null);

  return (
    <div className="lueur-hypno-full">
      <div className="lueur-hypno-chart">
        <div className="lueur-hypno-lanes" style={{ height: vh }}>
          {STAGE_LABELS.map((item) => (
            <span key={item.key}>{item.label}</span>
          ))}
        </div>
        <div ref={ref} className="lueur-hypno-plot lueur-chart-fluid-wrap">
          <svg
            viewBox={`0 0 ${vw} ${vh}`}
            width="100%"
            className="lueur-hypno-svg lueur-chart-fluid-svg"
            aria-hidden
          >
            {rects.map((r) => (
              <rect key={r.key ?? `${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={5 * s} fill={r.color} />
            ))}
          </svg>
          {(startLabel || endLabel) && (
            <div className="lueur-hypno-axis">
              <span>{startLabel ?? "—"}</span>
              <span>{endLabel ?? "—"}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StageBreakdown({ stages, drawn = true }) {
  if (!stages) return null;
  const total =
    (stages.awake_min || 0) +
    (stages.rem_min || 0) +
    (stages.light_min || 0) +
    (stages.deep_min || 0);
  if (total <= 0) return null;

  const maxPct = Math.max(
    ...STAGE_LABELS.map((s) => ((stages[s.key] || 0) / total) * 100),
  );

  return (
    <div className="lueur-stage-breakdown">
      {STAGE_LABELS.map((s) => {
        const min = stages[s.key] || 0;
        const pct = (min / total) * 100;
        const h = Math.floor(min / 60);
        const m = Math.round(min % 60);
        const dur = h > 0 ? `${h} h ${m > 0 ? `${m}` : ""}`.trim() : `${m} min`;
        const barW = drawn ? (pct / maxPct) * 100 : 0;

        return (
          <div key={s.key} className="lueur-stage-row">
            <span className="lueur-stage-swatch" style={{ background: s.color }} />
            <span className="lueur-stage-name">{s.label}</span>
            <div className="lueur-progress-track" style={{ height: 8 }}>
              <div
                className="lueur-progress-fill"
                style={{ width: `${barW}%`, background: s.color }}
              />
            </div>
            <span className="lueur-stage-dur">{dur}</span>
          </div>
        );
      })}
    </div>
  );
}

function HypnogramLegend() {
  return (
    <div className="lueur-hypno-legend">
      {STAGE_LABELS.map((s) => (
        <span key={s.key}>
          <i style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
