import { useLayoutEffect, useRef, useState } from "react";

/**
 * Sync SVG viewBox dimensions to the container's rendered width (1:1 px mapping).
 * Prevents blurry upscale when a small viewBox is stretched with width: 100%.
 */
export function useFluidChartSize(base, minW = 280) {
  const ref = useRef(null);
  const [size, setSize] = useState(base);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const w = Math.max(minW, Math.round(el.getBoundingClientRect().width));
      const h = Math.round(w * (base.h / base.w));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [base.h, base.w, minW]);

  return { ref, vw: size.w, vh: size.h, scale: size.w / base.w };
}
