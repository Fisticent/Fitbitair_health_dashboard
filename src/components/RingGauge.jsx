export function RingGauge({ value, max = 100, size = 200, stroke = 10, color, label, sublabel, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = c * (1 - pct);

  return (
    <div className="ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1f1f1f"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="ring-center">
        {children ?? (
          <>
            <span className="ring-value" style={{ color }}>
              {typeof value === "number" && max === 100 ? `${Math.round(value)}%` : value}
            </span>
            {label && <span className="ring-label">{label}</span>}
            {sublabel && <span className="ring-sublabel">{sublabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}
