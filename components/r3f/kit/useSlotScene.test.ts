import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSlotScene } from "./useSlotScene";
import { withConversionDefaults } from "./conversion";
import type { SlotTheme, SoundInstance } from "./types";

const theme: SlotTheme = {
  reels: 3, rows: 3,
  symbols: [
    { id: "a", label: "A", glyph: "A", color: "#fff" },
    { id: "b", label: "B", glyph: "B", color: "#fff" },
    { id: "book", label: "Book", glyph: "📖", color: "#fc0", isWin: true },
  ],
  winSymbolId: "book", winCount: 3, winOnSpin: 2,
  nearMissGrid: [["a", "book", "b"], ["a", "b", "a"], ["b", "a", "b"]],
  winGrid: [["a", "book", "b"], ["a", "book", "a"], ["b", "book", "b"]],
  durationMs: 1000,
  cabinet: { frame: "#000", glass: "#000", glow: "#000", accent: "#fc0" },
};
const sound: SoundInstance = { tick: vi.fn(), win: vi.fn(), setMuted: vi.fn(), muted: () => true };
const conversion = withConversionDefaults({ prize: "200 Free Spins", redirectUrl: "https://x.test/go" });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSlotScene", () => {
  it("onSpin starts the controller and is blocked while spinning", () => {
    const { result } = renderHook(() => useSlotScene({ reduced: true, sound, theme, conversion }));
    expect(result.current.status).toBe("idle");
    act(() => result.current.onSpin());
    expect(result.current.status).toBe("spinning");
    expect(result.current.controller.spinCount).toBe(1);
    act(() => result.current.onSpin()); // blocked
    expect(result.current.controller.spinCount).toBe(1);
    expect(sound.tick).toHaveBeenCalled();
  });

  it("a won status opens the WinSheet after the reveal delay", () => {
    const { result } = renderHook(() => useSlotScene({ reduced: true, sound, theme, conversion }));
    act(() => result.current.onStatus("won"));
    expect(sound.win).toHaveBeenCalled();
    act(() => vi.runAllTimers());
    expect(result.current.claimStep).toBe("reveal");
  });

  it("onDismiss resets to idle and hides the sheet", () => {
    const { result } = renderHook(() => useSlotScene({ reduced: true, sound, theme, conversion }));
    act(() => result.current.onStatus("won"));
    act(() => vi.runAllTimers());
    act(() => result.current.onDismiss());
    expect(result.current.status).toBe("idle");
    expect(result.current.claimStep).toBe("hidden");
  });
});
