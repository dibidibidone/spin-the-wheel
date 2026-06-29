import { describe, it, expect } from "vitest";
import { liveCount } from "./liveCount";

describe("liveCount", () => {
  it("drifts within ~2.5% of the base", () => {
    expect(liveCount(1000, 0.5)).toBe(1000); // mid = no drift
    expect(liveCount(1000, 1)).toBe(1025);   // max up
    expect(liveCount(1000, 0)).toBe(975);    // max down
  });
  it("never drops below 1 for a positive base", () => {
    expect(liveCount(2, 0)).toBeGreaterThanOrEqual(1);
  });
  it("returns 0 for a non-positive base", () => {
    expect(liveCount(0, 0.5)).toBe(0);
  });
});
