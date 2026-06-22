import { buildReelStrip, reelOffsetRows, reelStopMs } from "./slotMath";

export type SlotStatus = "idle" | "spinning" | "nearmiss" | "won";

export function createSlotController({
  reels,
  rows,
  pool,
  nearMissGrid,
  winGrid,
  winOnSpin = 2,
  durationMs = 2600,
  spinRows = 24,
}: {
  reels: number;
  rows: number;
  pool: string[];
  nearMissGrid: string[][];
  winGrid: string[][];
  winOnSpin?: number;
  durationMs?: number;
  spinRows?: number;
}) {
  let status: SlotStatus = "idle";
  let spinCount = 0;
  let elapsed = 0;
  let winning = false;
  const offsets = new Array<number>(reels).fill(0);
  const stopped = new Array<boolean>(reels).fill(true); // true = at rest (idle); set false per reel on start()

  // Neutral idle board: a calm strip per reel so something renders before spin 1.
  const neutralGrid = Array.from({ length: reels }, (_, i) =>
    Array.from({ length: rows }, (_, r) => pool[(i * rows + r) % pool.length])
  );
  // NOTE: `strips` is REPLACED (new array) on each start()/reset() — never cache
  // `controller.strips`; always read it through the getter so you see the current spin.
  let strips: string[][] = neutralGrid.map((col) => buildReelStrip(pool, col, spinRows));

  return {
    start() {
      if (status !== "idle" && status !== "nearmiss") return;
      spinCount += 1;
      winning = spinCount >= winOnSpin;
      const grid = winning ? winGrid : nearMissGrid;
      strips = grid.map((col) => buildReelStrip(pool, col, spinRows));
      for (let i = 0; i < reels; i++) { offsets[i] = spinRows; stopped[i] = false; }
      elapsed = 0;
      status = "spinning";
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed += dtMs;
      let allStopped = true;
      for (let i = 0; i < reels; i++) {
        const stopMs = reelStopMs(i, reels, durationMs);
        if (elapsed >= stopMs) { offsets[i] = 0; stopped[i] = true; }
        else { offsets[i] = reelOffsetRows(elapsed, stopMs, spinRows); allStopped = false; }
      }
      if (allStopped) status = winning ? "won" : "nearmiss";
    },
    reset() {
      status = "idle"; spinCount = 0; elapsed = 0; winning = false;
      for (let i = 0; i < reels; i++) { offsets[i] = 0; stopped[i] = true; }
      strips = neutralGrid.map((col) => buildReelStrip(pool, col, spinRows));
    },
    get status() { return status; },
    get spinCount() { return spinCount; },
    get winning() { return winning; },
    get strips() { return strips; },
    offsets,
    stopped,
    reels,
    rows,
    spinRows,
  };
}

export type SlotController = ReturnType<typeof createSlotController>;
