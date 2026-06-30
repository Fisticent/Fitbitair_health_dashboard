import { describe, expect, it } from "vitest";
import { timelineToHypnoRects, seriesStats, smoothLinePath, lineChart, pctFromZ, recoveryContributorStatus } from "./chartUtils";

describe("pctFromZ", () => {
  it("maps z≈0 to ~50 and positive z higher", () => {
    expect(pctFromZ(0)).toBe(50);
    expect(pctFromZ(0.44)).toBeGreaterThanOrEqual(66);
    expect(pctFromZ(-0.8)).toBeLessThan(50);
  });

  it("drives contributor status from recovery z", () => {
    expect(recoveryContributorStatus(-0.8).text).toBe("À surveiller");
    expect(recoveryContributorStatus(0.9).text).toBe("Bon");
    expect(recoveryContributorStatus(1.2).text).toBe("Optimal");
  });
});

describe("seriesStats", () => {
  it("computes avg and band edges", () => {
    const s = seriesStats([40, 50, 60]);
    expect(s.avg).toBe(50);
    expect(s.min).toBe(40);
    expect(s.max).toBe(60);
    expect(s.sd).toBeGreaterThan(0);
  });
});

describe("lineChart", () => {
  it("uses smooth curves for line and area", () => {
    const { line, area } = lineChart([10, 20, 15, 25], 100, 50, 4);
    expect(line).toContain("C");
    expect(area).toContain("Z");
  });
});

describe("smoothLinePath", () => {
  it("returns a path for two or more points", () => {
    const d = smoothLinePath([
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 15 },
    ]);
    expect(d.startsWith("M")).toBe(true);
    expect(d).toContain("C");
  });
});

describe("timelineToHypnoRects", () => {
  it("merges adjacent one-minute slices into unified bars", () => {
    const timeline = Array.from({ length: 30 }, (_, i) => ({
      start: `2026-06-28T02:00:${String(i).padStart(2, "0")}Z`,
      end: `2026-06-28T02:00:${String(i + 1).padStart(2, "0")}Z`,
      lane: 2,
    }));

    const { rects } = timelineToHypnoRects(timeline, 700, [14, 52, 90, 128], 22);
    expect(rects).toHaveLength(1);
    expect(Number(rects[0].w)).toBeGreaterThan(100);
  });
});
