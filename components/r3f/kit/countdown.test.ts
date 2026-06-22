import { describe, it, expect, beforeEach } from "vitest";
import { formatMMSS, remainingMs, seedDeadline } from "./countdown";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  } as Storage;
}

describe("countdown", () => {
  it("formats milliseconds as mm:ss, clamping at zero", () => {
    expect(formatMMSS(599_000)).toBe("09:59");
    expect(formatMMSS(0)).toBe("00:00");
    expect(formatMMSS(-1000)).toBe("00:00");
    expect(formatMMSS(65_000)).toBe("01:05");
  });

  it("clamps remaining at zero", () => {
    expect(remainingMs(1_000, 5_000)).toBe(0);
    expect(remainingMs(5_000, 1_000)).toBe(4_000);
  });

  it("seeds a deadline once and reuses it on reload", () => {
    const s = fakeStorage();
    const first = seedDeadline("k", 600_000, 1_000, s);
    expect(first).toBe(601_000);
    const second = seedDeadline("k", 600_000, 30_000, s); // later 'now', same key
    expect(second).toBe(601_000); // unchanged — persisted
  });

  it("works without storage (returns a fresh deadline)", () => {
    expect(seedDeadline("k", 600_000, 1_000, null)).toBe(601_000);
  });
});
