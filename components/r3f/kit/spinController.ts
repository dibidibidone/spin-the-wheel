import { easeOutCubic, targetRotationDeg } from "./spinMath";

export type SpinStatus = "idle" | "spinning" | "nearmiss" | "won";

export function createSpinController(
  {
    winningIndex = 7,
    winOnSpin = 1,
    durationMs = 4500,
    turns = 6,
    segments = 8,
    nearMissIndex,
  }: {
    winningIndex?: number;
    winOnSpin?: number;
    durationMs?: number;
    turns?: number;
    segments?: number;
    nearMissIndex?: number;
  } = {}
) {
  const nearIdx = nearMissIndex ?? (winningIndex + 1) % segments;
  const winTarget = targetRotationDeg(winningIndex, segments, turns);
  const nearTarget = targetRotationDeg(nearIdx, segments, turns);

  let status: SpinStatus = "idle";
  let elapsed = 0;
  let rotation = 0;
  let spinCount = 0;
  let winning = false;
  let target = winTarget;

  return {
    start() {
      if (status !== "idle" && status !== "nearmiss") return;
      spinCount += 1;
      winning = spinCount >= winOnSpin;
      target = winning ? winTarget : nearTarget;
      status = "spinning";
      elapsed = 0;
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed = Math.min(elapsed + dtMs, durationMs);
      rotation = easeOutCubic(elapsed / durationMs) * target;
      if (elapsed >= durationMs) {
        rotation = target;
        status = winning ? "won" : "nearmiss";
      }
    },
    reset() {
      status = "idle";
      elapsed = 0;
      rotation = 0;
      spinCount = 0;
      winning = false;
      target = winTarget;
    },
    get status() { return status; },
    get rotation() { return rotation; },
    get spinCount() { return spinCount; },
    get winning() { return winning; },
    get target() { return target; },
  };
}
