// Pure reel math for the slot landings. A reel scrolls a vertical strip of
// symbol ids downward, then snaps so the last `rows` ids are the visible window.
// Offsets are in *rows* (unitless); the component converts to a CSS transform.
import { easeOutCubic } from "./spinMath";

// One reel's strip: `spinRows` of deterministic filler (pool cycled) followed by
// the scripted result column. Deterministic so spins are reproducible/testable.
export function buildReelStrip(pool: string[], resultColumn: string[], spinRows: number): string[] {
  const filler: string[] = [];
  for (let i = 0; i < spinRows; i++) filler.push(pool[i % pool.length]);
  return [...filler, ...resultColumn];
}

// Eased remaining offset (rows) at `elapsed`ms: starts at distanceRows, ends at 0.
export function reelOffsetRows(elapsed: number, durationMs: number, distanceRows: number): number {
  if (durationMs <= 0) return 0;
  const t = Math.min(Math.max(elapsed / durationMs, 0), 1);
  return distanceRows * (1 - easeOutCubic(t));
}

// Per-reel stop time: reels stop left -> right across `totalMs`. Reel 0 stops at
// totalMs*(1-spread); the last reel at totalMs.
export function reelStopMs(reelIndex: number, reelCount: number, totalMs: number, spread = 0.45): number {
  if (reelCount <= 1) return totalMs;
  const frac = reelIndex / (reelCount - 1);
  return totalMs * (1 - spread) + totalMs * spread * frac;
}

// The rows-tall visible window of a strip starting at `topRow`. This is a plain
// slice: if the window overruns the strip end it returns FEWER than `rows` items
// (no wrap-around). Callers that need a full window must pass an in-bounds topRow.
export function visibleWindow(strip: string[], topRow: number, rows: number): string[] {
  return strip.slice(topRow, topRow + rows);
}
