// components/r3f/kit/slotMath.test.ts
import { describe, it, expect } from "vitest";
import { buildReelStrip, reelOffsetRows, reelStopMs, visibleWindow } from "./slotMath";

describe("buildReelStrip", () => {
  it("prepends deterministic filler and ends with the result column", () => {
    const strip = buildReelStrip(["a", "b", "c"], ["x", "y", "z"], 5);
    expect(strip).toHaveLength(8); // 5 filler + 3 result
    expect(strip.slice(-3)).toEqual(["x", "y", "z"]);
    expect(strip.slice(0, 5)).toEqual(["a", "b", "c", "a", "b"]); // pool cycled
  });
});

describe("reelOffsetRows", () => {
  it("starts at the full distance and eases to 0", () => {
    expect(reelOffsetRows(0, 1000, 24)).toBeCloseTo(24, 5);
    expect(reelOffsetRows(1000, 1000, 24)).toBeCloseTo(0, 5);
  });
  it("is monotonically decreasing", () => {
    const a = reelOffsetRows(200, 1000, 24);
    const b = reelOffsetRows(600, 1000, 24);
    expect(b).toBeLessThan(a);
  });
  it("clamps past the duration and guards zero duration", () => {
    expect(reelOffsetRows(5000, 1000, 24)).toBe(0);
    expect(reelOffsetRows(10, 0, 24)).toBe(0);
  });
});

describe("reelStopMs", () => {
  it("stops reels left -> right, last reel at totalMs", () => {
    const first = reelStopMs(0, 5, 2000);
    const last = reelStopMs(4, 5, 2000);
    expect(first).toBeLessThan(last);
    expect(last).toBeCloseTo(2000, 5);
    expect(first).toBeGreaterThan(0);
  });
  it("returns totalMs for a single reel", () => {
    expect(reelStopMs(0, 1, 2000)).toBe(2000);
  });
});

describe("visibleWindow", () => {
  it("slices the rows-tall window from a top row", () => {
    expect(visibleWindow(["a", "b", "c", "d", "e"], 2, 3)).toEqual(["c", "d", "e"]);
  });
  it("returns a short slice at the strip boundary (no wrap-around)", () => {
    expect(visibleWindow(["a", "b", "c"], 2, 3)).toEqual(["c"]);
  });
});
