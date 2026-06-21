import { describe, it, expect } from "vitest";
import { planSpin, rotationForIndex } from "@/lib/spin";
import type { SpinConfig } from "@/lib/types";

const cfg: SpinConfig = { segmentCount: 8, spinsBeforeWin: 3, winningIndex: 4, behavior: "near-miss" };

describe("planSpin", () => {
  it("returns a near-miss adjacent wedge before the winning spin", () => {
    expect(planSpin(1, cfg)).toEqual({ targetIndex: 3, isWin: false }); // offset -1
    expect(planSpin(2, cfg)).toEqual({ targetIndex: 5, isWin: false }); // offset +1
  });

  it("wins exactly on the Nth spin", () => {
    expect(planSpin(3, cfg)).toEqual({ targetIndex: 4, isWin: true });
  });

  it("wins on the first spin when spinsBeforeWin is 1", () => {
    const c: SpinConfig = { ...cfg, spinsBeforeWin: 1, winningIndex: 2 };
    expect(planSpin(1, c)).toEqual({ targetIndex: 2, isWin: true });
  });

  it("wraps the near-miss index around the wheel", () => {
    const c: SpinConfig = { ...cfg, winningIndex: 0 };
    expect(planSpin(1, c).targetIndex).toBe(7); // (0 - 1 + 8) % 8
  });
});

describe("rotationForIndex", () => {
  it("lands index 0 with at least minTurns full rotations", () => {
    expect(rotationForIndex(0, 8, 0)).toBe(1800); // 5*360 + 0
  });

  it("lands index 2 centered under the pointer", () => {
    const r = rotationForIndex(2, 8, 0); // segAngle 45 -> targetMod 270
    expect(r).toBe(2070); // 1800 + 270
    expect(r % 360).toBe((360 - (2 * 45)) % 360);
  });

  it("always advances forward across successive spins", () => {
    const r1 = rotationForIndex(2, 8, 0);
    const r2 = rotationForIndex(0, 8, r1);
    expect(r2).toBeGreaterThan(r1);
    expect(r2 % 360).toBe(0);
  });
});
