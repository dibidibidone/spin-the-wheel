import { describe, it, expect } from "vitest";
import { presetToRange } from "./statsRange";

const now = new Date("2026-07-01T12:00:00.000Z");

describe("presetToRange", () => {
  it("all -> no bounds", () => {
    expect(presetToRange("all", now)).toEqual({});
  });
  it("7d -> from is 7 days before now, to is now", () => {
    const { from, to } = presetToRange("7d", now);
    expect(to).toEqual(now);
    expect(from?.toISOString()).toBe("2026-06-24T12:00:00.000Z");
  });
  it("30d -> from is 30 days before now", () => {
    expect(presetToRange("30d", now).from?.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });
  it("today -> from is local midnight, to is now", () => {
    const { from, to } = presetToRange("today", now);
    expect(to).toEqual(now);
    expect(from!.getHours()).toBe(0);
    expect(from!.getMinutes()).toBe(0);
    expect(from!.getTime()).toBeLessThanOrEqual(now.getTime());
  });
});
