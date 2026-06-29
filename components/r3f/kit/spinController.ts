import { easeOutQuint, targetRotationDeg } from "./spinMath";

export type SpinStatus = "idle" | "spinning" | "nearmiss" | "won";

// easeOutQuint leaves a long, imperceptible "dead creep" near the end (the wheel is within a
// hair of the target while elapsed crawls to the full duration). Once the remaining rotation is
// under this many degrees the wheel *looks* stopped, so we land it — and fire the BOOM — then,
// instead of waiting out the dead tail.
const SETTLED_DEG = 0.5;

export function createSpinController(
  {
    winningIndex = 7,
    winOnSpin = 1,
    durationMs = 4500,
    winDurationMs = durationMs,
    turns = 6,
    segments = 8,
    nearMissIndex,
  }: {
    winningIndex?: number;
    winOnSpin?: number;
    durationMs?: number;
    winDurationMs?: number; // win spin runs longer than a near-miss for a drawn-out final creep
    turns?: number;
    segments?: number;
    nearMissIndex?: number;
  } = {}
) {
  const nearIdx = nearMissIndex ?? (winningIndex + 1) % segments;
  // The wheel decelerates from higher rest-angles, so the pointer enters each segment across
  // its upper edge. Land the win at 0.95 — it creeps in *barely* (5% past the edge), looking
  // like it'll stop in the next segment until the last moment. Land the near-miss at 0.05 —
  // it creeps all the way down to the win boundary and stops just short ("so close!").
  const winTarget = targetRotationDeg(winningIndex, segments, turns, 0.95);
  const nearTarget = targetRotationDeg(nearIdx, segments, turns, 0.05);

  let status: SpinStatus = "idle";
  let elapsed = 0;
  let rotation = 0;
  let spinCount = 0;
  let winning = false;
  let target = winTarget;
  let duration = durationMs; // active spin's duration (the win runs longer than a near-miss)

  return {
    start() {
      if (status !== "idle" && status !== "nearmiss") return;
      spinCount += 1;
      winning = spinCount >= winOnSpin;
      target = winning ? winTarget : nearTarget;
      duration = winning ? winDurationMs : durationMs;
      status = "spinning";
      elapsed = 0;
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed = Math.min(elapsed + dtMs, duration);
      rotation = easeOutQuint(elapsed / duration) * target;
      if (elapsed >= duration || target - rotation <= SETTLED_DEG) {
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
      duration = durationMs;
    },
    get status() { return status; },
    get rotation() { return rotation; },
    get spinCount() { return spinCount; },
    get winning() { return winning; },
    get target() { return target; },
  };
}
