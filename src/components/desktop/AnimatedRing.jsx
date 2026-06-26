import { useEffect, useRef } from "react";
import gsap from "gsap";

export function AnimatedRing({
  value,
  max = 100,
  size = 280,
  stroke = 14,
  color,
  glow,
  className = "",
}) {
  const ringRef = useRef(null);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const targetOffset = c * (1 - pct);

  useEffect(() => {
    if (!ringRef.current) return;
    gsap.fromTo(
      ringRef.current,
      { strokeDashoffset: c },
      { strokeDashoffset: targetOffset, duration: 1.6, ease: "power3.out" }
    );
  }, [targetOffset, c]);

  return (
    <div
      className={`animated-ring ${className}`}
      style={{ "--ring-size": `${size}px`, "--ring-stroke": stroke }}
    >
      <svg className="animated-ring-svg" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          ref={ringRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          filter={glow ? `url(#glow-${size})` : undefined}
          className="ring-progress"
        />
      </svg>
      <div className="ring-pulse" style={{ borderColor: color, boxShadow: `0 0 40px ${color}33` }} />
    </div>
  );
}
