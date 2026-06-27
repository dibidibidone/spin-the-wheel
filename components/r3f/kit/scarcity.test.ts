import { describe, it, expect } from "vitest";
import { scarcityLeft } from "./scarcity";

describe("scarcityLeft", () => {
  it("returns a believable remaining count between 5% and 30% gone", () => {
    expect(scarcityLeft(50, 0)).toBe(48);   // min 5% gone -> 47.5 -> ceil-ish 48
    expect(scarcityLeft(50, 0.999)).toBe(35); // max 30% gone -> 35
  });
  it("never returns below 1 for a positive total", () => {
    expect(scarcityLeft(2, 0.999)).toBeGreaterThanOrEqual(1);
  });
  it("returns 0 for a non-positive total", () => {
    expect(scarcityLeft(0, 0.5)).toBe(0);
  });
});
