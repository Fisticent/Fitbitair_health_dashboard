import { describe, expect, it } from "vitest";
import { inferSigma, vitalGaugeConfig } from "./vitalGaugeUtils";

describe("vitalGaugeConfig", () => {
  it("places value in norm band when |z| < 1", () => {
    const cfg = vitalGaugeConfig({
      name: "VFC",
      value: 54,
      baseline: 58,
      z: -0.8,
      unit: "ms",
    });
    expect(cfg.activeIndex).toBe(1);
    expect(cfg.normMin).toBeLessThan(54);
    expect(cfg.normMax).toBeGreaterThan(54);
  });

  it("infers sigma from z when available", () => {
    expect(inferSigma({ name: "VFC", value: 54, baseline: 58, z: -2 })).toBe(2);
  });

  it("flags alert zone when |z| >= 2", () => {
    const cfg = vitalGaugeConfig({
      name: "Temp. peau",
      value: 34.4,
      baseline: 35,
      z: -2.4,
      unit: "°C",
    });
    expect(cfg.activeIndex).toBe(0);
  });
});
