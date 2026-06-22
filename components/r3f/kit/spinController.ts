import { easeOutCubic, targetRotationDeg } from "./spinMath";

export type SpinStatus = "idle" | "spinning" | "won";

export function createSpinController(
  { winningIndex = 7, durationMs = 4500, turns = 6, segments = 8 } = {}
) {
  const target = targetRotationDeg(winningIndex, segments, turns);
  let status: SpinStatus = "idle";
  let elapsed = 0;
  let rotation = 0;

  return {
    start() {
      if (status !== "idle") return;
      status = "spinning";
      elapsed = 0;
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed = Math.min(elapsed + dtMs, durationMs);
      rotation = easeOutCubic(elapsed / durationMs) * target;
      if (elapsed >= durationMs) {
        rotation = target;
        status = "won";
      }
    },
    reset() {
      status = "idle";
      elapsed = 0;
      rotation = 0;
    },
    get status() { return status; },
    get rotation() { return rotation; },
    target,
  };
}
