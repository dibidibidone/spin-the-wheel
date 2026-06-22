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
    expect(typeof (vibrate.mock.calls[2] as Array<unknown>)[0]).toBe("number"); // claim = single pulse
  });

  it("no-ops under reduced motion", () => {
    const vibrate = vi.fn(() => true);
    const h = createHaptics({ reduced: true, vibrate });
    h.spin(); h.win(); h.claim();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("no-ops when no vibrate function is available", () => {
    const nav = globalThis.navigator as (Navigator & { vibrate?: unknown }) | undefined;
    const original = nav ? nav.vibrate : undefined;
    if (nav) delete (nav as { vibrate?: unknown }).vibrate; // ensure the navigator fallback finds nothing
    const h = createHaptics({ reduced: false });
    expect(() => { h.spin(); h.win(); h.claim(); }).not.toThrow();
    if (nav && original !== undefined) (nav as { vibrate?: unknown }).vibrate = original;
  });
});
