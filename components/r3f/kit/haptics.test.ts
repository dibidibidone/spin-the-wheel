import { describe, it, expect, vi } from "vitest";
import { createHaptics } from "./haptics";

describe("createHaptics", () => {
  it("vibrates with distinct patterns when enabled", () => {
    const vibrate = vi.fn(() => true);
    const h = createHaptics({ reduced: false, vibrate });
    h.spin(); h.win(); h.claim();
    expect(vibrate).toHaveBeenCalledTimes(3);
    // win is a stronger multi-pulse pattern (array), claim is a single pulse (number)
    expect(Array.isArray((vibrate.mock.calls[1] as Array<unknown>)[0])).toBe(true);
  });

  it("no-ops under reduced motion", () => {
    const vibrate = vi.fn(() => true);
    const h = createHaptics({ reduced: true, vibrate });
    h.spin(); h.win(); h.claim();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("no-ops when no vibrate function is available", () => {
    const h = createHaptics({ reduced: false });
    expect(() => { h.spin(); h.win(); h.claim(); }).not.toThrow();
  });
});
