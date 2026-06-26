import { useEffect, useState } from "react";

export function useAnimatedNumber(target, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null || Number.isNaN(target)) return;
    let start = null;
    const from = value;
    const diff = target - from;

    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + diff * eased);
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}
