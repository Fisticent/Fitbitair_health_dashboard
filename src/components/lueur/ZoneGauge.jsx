function markerLeft(value, scaleMin, scaleMax) {
  const clamped = Math.max(scaleMin, Math.min(scaleMax, value));
  return ((clamped - scaleMin) / (scaleMax - scaleMin)) * 100;
}

function segmentFlex(from, to, scaleMin, scaleMax) {
  return ((to - from) / (scaleMax - scaleMin)) * 100;
}

function segmentFlexValues(scaleMin, scaleMax, segments) {
  let from = scaleMin;
  return segments.map((seg) => {
    const flex = segmentFlex(from, seg.to, scaleMin, scaleMax);
    from = seg.to;
    return flex;
  });
}

/** Horizontal segmented gauge with position marker — shared by ACWR, IMC, etc. */
export function ZoneGauge({
  value,
  scaleMin,
  scaleMax,
  segments,
  activeIndex,
  ariaLabel,
  embedded,
  legendDense,
}) {
  if (value == null || !segments?.length) return null;

  const activeIdx =
    activeIndex >= 0 ? activeIndex : segments.findIndex((seg) => value < seg.to);
  const flexValues = segmentFlexValues(scaleMin, scaleMax, segments);

  return (
    <div
      className={`lueur-zone-gauge${embedded ? " lueur-zone-gauge--embedded" : ""}${legendDense ? " lueur-zone-gauge--legend-dense" : ""}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="lueur-zone-gauge-track">
        {segments.map((seg, i) => (
          <span
            key={seg.label}
            className="lueur-zone-gauge-seg"
            style={{
              flex: flexValues[i],
              background: seg.color,
              opacity: i === activeIdx ? 0.58 : 0.16,
            }}
            title={seg.label}
          />
        ))}
        <span
          className="lueur-zone-gauge-marker"
          style={{ left: `${markerLeft(value, scaleMin, scaleMax)}%` }}
          aria-hidden="true"
        />
      </div>
      <div
        className="lueur-zone-gauge-legend"
        style={{ gridTemplateColumns: flexValues.map((f) => `${f}fr`).join(" ") }}
      >
        {segments.map((seg, i) => (
          <span
            key={seg.label}
            className={`lueur-zone-gauge-legend-item${i === activeIdx ? " is-active" : ""}`}
          >
            <span className="lueur-zone-gauge-legend-dot" style={{ background: seg.color }} />
            {seg.label}
          </span>
        ))}
      </div>
    </div>
  );
}
