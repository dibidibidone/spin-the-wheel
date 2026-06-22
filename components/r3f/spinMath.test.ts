import { describe, it, expect } from "vitest";
import { targetRotationDeg, segmentUnderPointer, easeOutCubic } from "./spinMath";

describe("spinMath", () => {
  it("lands the winning segment under the top pointer", () => {
    const t = targetRotationDeg(7, 8, 6);
    expect(((t % 360) + 360) % 360).toBeCloseTo(22.5, 5);
    expect(segmentUnderPointer(t, 8)).toBe(7);
  });

  it("includes the requested number of full turns", () => {
    expect(targetRotationDeg(7, 8, 6)).toBeCloseTo(2182.5, 5);
    expect(targetRotationDeg(0, 8, 0)).toBeCloseTo(337.5, 5);
  });

  it("maps rotations back to segments", () => {
    expect(segmentUnderPointer(0, 8)).toBe(0);
    expect(segmentUnderPointer(targetRotationDeg(3, 8, 2), 8)).toBe(3);
    expect(segmentUnderPointer(targetRotationDeg(5, 8, 4), 8)).toBe(5);
  });

  it("easeOutCubic spans 0..1", () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 5);
    expect(easeOutCubic(1)).toBeCloseTo(1, 5);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
