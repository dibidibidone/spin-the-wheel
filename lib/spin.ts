import type { SpinConfig } from "./types";

export type SpinPlan = { targetIndex: number; isWin: boolean };

export function planSpin(spinNumber: number, config: SpinConfig): SpinPlan {
  const { spinsBeforeWin, winningIndex, segmentCount } = config;
  if (spinNumber >= spinsBeforeWin) {
    return { targetIndex: winningIndex, isWin: true };
  }
  const offset = spinNumber % 2 === 1 ? -1 : 1;
  const targetIndex = ((winningIndex + offset) % segmentCount + segmentCount) % segmentCount;
  return { targetIndex, isWin: false };
}

export function rotationForIndex(
  targetIndex: number,
  segmentCount: number,
  accumulatedRotation: number,
  minTurns = 5,
): number {
  const segAngle = 360 / segmentCount;
  const targetMod = (((-(targetIndex * segAngle)) % 360) + 360) % 360;
  const currentMod = ((accumulatedRotation % 360) + 360) % 360;
  const advance = (((targetMod - currentMod) % 360) + 360) % 360;
  return accumulatedRotation + minTurns * 360 + advance;
}
