import { describe, expect, it } from "vitest";
import { timelineToHypnoRects } from "./chartUtils";

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
