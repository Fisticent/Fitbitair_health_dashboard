import { useEffect, useState } from "react";
import { ringDash, ringDashValue } from "./chartUtils";

export function ProgressRing({
  size = 300,
  radius,
  stroke = 14,
  value,
  max = 100,
  color = "#15b393",
  trackColor = "#eef1f5",
  label,
  sublabel,
  statusPill,
  children,
  className = "",
  centerClassName = "",
}) {
  const [drawn, setDrawn] = useState(false);
  const cx = size / 2;
  const r = radius ?? cx - stroke;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const dash = max === 100
    ? ringDash(r, pct, drawn)
    : ringDashValue(r, value ?? 0, max, drawn);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [value, max, size]);

  return (
    <div
      className={`lueur-ring-wrap ${className}`}
      style={{ position: "relative", width: size, height: size }}
    >
      <svg className="lueur-ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={dash.strokeDasharray}
          strokeDashoffset={dash.strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className={`lueur-ring-center ${centerClassName}`.trim()}>
        {!children && label && (
          <div className="lueur-ring-label" style={{ fontSize: size > 200 ? 11 : 10 }}>
            {label}
          </div>
        )}
        {children ?? (
          <>
            <div
              className="lueur-ring-value"
              style={{
                fontSize: size > 250 ? 84 : size > 180 ? 60 : 26,
                fontWeight: size > 180 ? 300 : 600,
                margin: label ? "6px 0" : 0,
              }}
            >
              {value != null ? (max === 100 ? Math.round(value) : value) : "—"}
              {max === 100 && value != null && size <= 180 ? "%" : ""}
            </div>
            {sublabel && (
              <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: 4 }}>
                {sublabel}
              </div>
            )}
            {statusPill}
          </>
        )}
      </div>
    </div>
  );
}

export function MiniRing({ size = 84, value, max = 100, color, stroke = 6, onClick, label }) {
  const [drawn, setDrawn] = useState(false);
  const cx = size / 2;
  const r = cx - stroke / 2 - 2;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const dash = ringDash(r, pct, drawn);

  useEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [value, max]);

  const inner = (
    <>
      <div className="lueur-ring-wrap" style={{ width: size, height: size }}>
        <svg className="lueur-ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#eef1f5" strokeWidth={stroke} />
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={dash.strokeDasharray}
            strokeDashoffset={dash.strokeDashoffset}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        <div className="lueur-ring-center lueur-ring-center--mini">
          <span className="lueur-ring-value">
            {value != null ? Math.round(value) : "—"}
          </span>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="lueur-pill" onClick={onClick}>
        {inner}
        {label && <span className="lueur-pill-label">{label}</span>}
      </button>
    );
  }
  return (
    <div className="lueur-pill">
      {inner}
      {label && <span className="lueur-pill-label">{label}</span>}
    </div>
  );
}
