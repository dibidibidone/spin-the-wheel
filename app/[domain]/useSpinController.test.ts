import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpinController } from "@/app/[domain]/useSpinController";
import type { SpinConfig } from "@/lib/types";

const config: SpinConfig = { segmentCount: 8, spinsBeforeWin: 3, winningIndex: 7, behavior: "near-miss" };

describe("useSpinController", () => {
  it("near-misses before the winning spin, then wins on spin N", () => {
    const { result } = renderHook(() => useSpinController(config));
    expect(result.current.status).toBe("idle");

    // spin 1
    act(() => result.current.spin());
    expect(result.current.status).toBe("spinning");
    const r1 = result.current.rotation;
    expect(r1).toBeGreaterThan(0);
    act(() => result.current.onAnimationComplete());
    expect(result.current.status).toBe("almost");

    // spin 2
    act(() => result.current.spin());
    act(() => result.current.onAnimationComplete());
    expect(result.current.status).toBe("almost");
    expect(result.current.rotation).toBeGreaterThan(r1);

    // spin 3 -> win
    act(() => result.current.spin());
    act(() => result.current.onAnimationComplete());
    expect(result.current.status).toBe("won");
  });

  it("ignores spin() while a spin is in progress", () => {
    const { result } = renderHook(() => useSpinController(config));
    act(() => result.current.spin());
    const r = result.current.rotation;
    act(() => result.current.spin()); // ignored
    expect(result.current.rotation).toBe(r);
  });
});
