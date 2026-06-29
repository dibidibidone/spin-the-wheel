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
  winDurationMs = durationMs,
  spinRows = 24,
}: {
  reels: number;
  rows: number;
  pool: string[];
  nearMissGrid: string[][];
  winGrid: string[][];
  winOnSpin?: number;
  durationMs?: number;
  winDurationMs?: number; // the win spin lasts longer, settling slowly at the end for suspense
  spinRows?: number;
}) {
  // Scale the win's scroll distance with its longer duration so the reels keep a believable
  // fast spin (the extra filler streams past) instead of floating down in slow motion.
  const winSpinRows = Math.max(spinRows, Math.round((spinRows * winDurationMs) / durationMs));

  let status: SlotStatus = "idle";
  let spinCount = 0;
  let elapsed = 0;
  let winning = false;
  let duration = durationMs;      // the in-flight spin's total (the win runs longer)
  let activeSpinRows = spinRows;  // the in-flight spin's scroll distance / filler length
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
      duration = winning ? winDurationMs : durationMs;
      activeSpinRows = winning ? winSpinRows : spinRows;
      const grid = winning ? winGrid : nearMissGrid;
      strips = grid.map((col) => buildReelStrip(pool, col, activeSpinRows));
      for (let i = 0; i < reels; i++) { offsets[i] = activeSpinRows; stopped[i] = false; }
      elapsed = 0;
      status = "spinning";
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed += dtMs;
      let allStopped = true;
      for (let i = 0; i < reels; i++) {
        const stopMs = reelStopMs(i, reels, duration);
        if (elapsed >= stopMs) { offsets[i] = 0; stopped[i] = true; }
        else { offsets[i] = reelOffsetRows(elapsed, stopMs, activeSpinRows); allStopped = false; }
      }
      if (allStopped) status = winning ? "won" : "nearmiss";
    },
    reset() {
      status = "idle"; spinCount = 0; elapsed = 0; winning = false;
      duration = durationMs; activeSpinRows = spinRows;
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
    get spinRows() { return activeSpinRows; }, // reflects the in-flight spin (win scrolls farther)
  };
}

export type SlotController = ReturnType<typeof createSlotController>;
