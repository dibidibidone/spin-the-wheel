# Slot-Machine Landings (Book of Ra + Gates of Olympus) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two standalone, fully-styled slot-machine landing mockups (Book of Ra style, Gates of Olympus style) that reuse the existing wheel landings' conversion funnel + `WinSheet` popup, driven by a scripted near-miss → win-on-2nd-spin slot engine and hybrid 2D-reels-over-3D-backdrop rendering.

**Architecture:** New pure, unit-tested `slotMath` + `slotController` (mirroring the wheel's `spinMath`/`spinController`) drive a DOM/CSS reel cabinet (`SlotReels` + `useSlotDriver` rAF loop). A new `useSlotScene` hook wires the controller to the existing `claimMachine`/`sound`/`haptics`/`navigate` plumbing and exposes a new `nearmiss` status. The existing `SpinOverlay`/`WinSheet` are reused (one additive change: a `nearmiss` CTA label). Each game is a per-folder `theme.ts` + R3F atmospheric backdrop + scene + dynamic page, parallel to `components/r3f/jackpot/` and `components/r3f/alchemy/`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript (strict), `@react-three/fiber`/`drei`/`postprocessing`/`rapier`, `howler`, Vitest (jsdom), Playwright.

## Global Constraints

- **Isolation:** Design-only prototypes. Touch nothing in `app/(public)`, the production `LandingScene`, `app/globals.css`, Prisma, or middleware. Routes live under `app/prototypes/3d/*`; components under `components/r3f/*`.
- **Routing:** New routes sit under `/prototypes/3d/` — already excluded by `middleware.ts`'s negative-lookahead, so no middleware change.
- **Branding:** "Inspired-by" original symbol art only (emoji/text glyphs in this plan) — no trademarked logos/assets. Popup/header stays Boomzino-branded (`/boomzino-logo.jpg`).
- **No regressions:** The wheel landings (`jackpot`, `alchemy`) must stay green. Shared-file edits are strictly additive — `SpinStatus` (`idle|spinning|won`) stays a subset of the new `OverlayStatus`.
- **Win script:** Scripted + deterministic. Near-miss on spin 1, win on `winOnSpin` (default 2). Replayable (dismiss → idle).
- **Lead capture:** `onClaim` stays undefined (best-effort stub); redirect = static `config.redirectUrl`. No backend.
- **Accessibility/robustness:** Sound muted by default + pauses on tab-hide; reduced-motion shortens durations; no-WebGL still renders reels + funnel (DOM). Reuse the kit's existing patterns verbatim.
- **Aliases/commands:** `@/` → repo root. `npm test` (vitest run), `npm run e2e` (playwright), `npx tsc --noEmit` for typecheck.

---

## File Structure

**New shared kit (`components/r3f/kit/`):**
- `slotMath.ts` / `slotMath.test.ts` — pure reel math.
- `slotController.ts` / `slotController.test.ts` — pure slot state machine.
- `SlotReels.tsx` / `slotReels.module.css` / `SlotReels.test.tsx` — DOM/CSS reel cabinet.
- `useSlotDriver.ts` — rAF loop applying offsets + status changes (no own test; exercised by e2e).
- `useSlotScene.ts` / `useSlotScene.test.ts` — wiring hook.

**Modified shared (additive):**
- `types.ts` — add `OverlayStatus`, `SlotSymbol`, `SlotTheme`; extend `OverlayCopy` with optional `retryLabel`, `nearMissLine`.
- `SpinOverlay.tsx` — accept `OverlayStatus`; render `retryLabel` on `nearmiss`.
- `spinOverlay.module.css` — add `.retryHint`.

**New per-game (`components/r3f/slots/<game>/`) + routes:**
- `book-of-ra/{theme.ts, TempleBackdrop.tsx, BookOfRaScene.tsx}` + `app/prototypes/3d/book-of-ra/page.tsx` + `tests/e2e/bookOfRa.spec.ts`.
- `gates-of-olympus/{theme.ts, OlympusBackdrop.tsx, GatesScene.tsx}` + `app/prototypes/3d/gates-of-olympus/page.tsx` + `tests/e2e/gatesOfOlympus.spec.ts`.

**Modified:** `public/prototypes/index.html` — two gallery cards.

---

## Task 1: `slotMath.ts` — pure reel math

**Files:**
- Create: `components/r3f/kit/slotMath.ts`
- Test: `components/r3f/kit/slotMath.test.ts`

**Interfaces:**
- Consumes: `easeOutCubic` from `./spinMath`.
- Produces:
  - `buildReelStrip(pool: string[], resultColumn: string[], spinRows: number): string[]`
  - `reelOffsetRows(elapsed: number, durationMs: number, distanceRows: number): number`
  - `reelStopMs(reelIndex: number, reelCount: number, totalMs: number, spread?: number): number`
  - `visibleWindow(strip: string[], topRow: number, rows: number): string[]`

- [ ] **Step 1: Write the failing test**

```ts
// components/r3f/kit/slotMath.test.ts
import { describe, it, expect } from "vitest";
import { buildReelStrip, reelOffsetRows, reelStopMs, visibleWindow } from "./slotMath";

describe("buildReelStrip", () => {
  it("prepends deterministic filler and ends with the result column", () => {
    const strip = buildReelStrip(["a", "b", "c"], ["x", "y", "z"], 5);
    expect(strip).toHaveLength(8); // 5 filler + 3 result
    expect(strip.slice(-3)).toEqual(["x", "y", "z"]);
    expect(strip.slice(0, 5)).toEqual(["a", "b", "c", "a", "b"]); // pool cycled
  });
});

describe("reelOffsetRows", () => {
  it("starts at the full distance and eases to 0", () => {
    expect(reelOffsetRows(0, 1000, 24)).toBeCloseTo(24, 5);
    expect(reelOffsetRows(1000, 1000, 24)).toBeCloseTo(0, 5);
  });
  it("is monotonically decreasing", () => {
    const a = reelOffsetRows(200, 1000, 24);
    const b = reelOffsetRows(600, 1000, 24);
    expect(b).toBeLessThan(a);
  });
  it("clamps past the duration and guards zero duration", () => {
    expect(reelOffsetRows(5000, 1000, 24)).toBe(0);
    expect(reelOffsetRows(10, 0, 24)).toBe(0);
  });
});

describe("reelStopMs", () => {
  it("stops reels left -> right, last reel at totalMs", () => {
    const first = reelStopMs(0, 5, 2000);
    const last = reelStopMs(4, 5, 2000);
    expect(first).toBeLessThan(last);
    expect(last).toBeCloseTo(2000, 5);
    expect(first).toBeGreaterThan(0);
  });
  it("returns totalMs for a single reel", () => {
    expect(reelStopMs(0, 1, 2000)).toBe(2000);
  });
});

describe("visibleWindow", () => {
  it("slices the rows-tall window from a top row", () => {
    expect(visibleWindow(["a", "b", "c", "d", "e"], 2, 3)).toEqual(["c", "d", "e"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/r3f/kit/slotMath.test.ts`
Expected: FAIL — `Failed to resolve import "./slotMath"` / functions not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/r3f/kit/slotMath.ts
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

// The rows-tall visible window of a strip starting at `topRow`.
export function visibleWindow(strip: string[], topRow: number, rows: number): string[] {
  return strip.slice(topRow, topRow + rows);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/r3f/kit/slotMath.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/slotMath.ts components/r3f/kit/slotMath.test.ts
git commit -m "feat: pure slotMath helpers (strip build, eased offset, stagger)"
```

---

## Task 2: `slotController.ts` — scripted near-miss → win state machine

**Files:**
- Create: `components/r3f/kit/slotController.ts`
- Test: `components/r3f/kit/slotController.test.ts`

**Interfaces:**
- Consumes: `buildReelStrip`, `reelOffsetRows`, `reelStopMs` from `./slotMath`.
- Produces:
  - `type SlotStatus = "idle" | "spinning" | "nearmiss" | "won"`
  - `createSlotController(opts): SlotController` where `opts = { reels, rows, pool, nearMissGrid, winGrid, winOnSpin?, durationMs?, spinRows? }`.
  - `SlotController` exposes: `start()`, `update(dtMs)`, `reset()`, getters `status`, `spinCount`, `winning`, `strips`, and live arrays `offsets`, `stopped`, plus readonly `reels`, `rows`, `spinRows`.

- [ ] **Step 1: Write the failing test**

```ts
// components/r3f/kit/slotController.test.ts
import { describe, it, expect } from "vitest";
import { createSlotController } from "./slotController";

const pool = ["a", "b", "book"];
const nearMissGrid = [["a", "book", "b"], ["a", "b", "a"], ["b", "a", "b"]]; // 1 book
const winGrid = [["a", "book", "b"], ["a", "book", "a"], ["b", "book", "b"]]; // 3 books (a line)

function make() {
  return createSlotController({ reels: 3, rows: 3, pool, nearMissGrid, winGrid, winOnSpin: 2, durationMs: 1000, spinRows: 10 });
}
function settle(c: ReturnType<typeof make>) { c.update(2000); } // past the longest stop time

describe("createSlotController", () => {
  it("starts idle with neutral strips already built", () => {
    const c = make();
    expect(c.status).toBe("idle");
    expect(c.spinCount).toBe(0);
    expect(c.strips).toHaveLength(3);
    expect(c.strips[0]).toHaveLength(10 + 3); // spinRows + rows
  });

  it("spin 1 lands a near-miss; spin 2 lands the win", () => {
    const c = make();
    c.start();
    expect(c.status).toBe("spinning");
    expect(c.spinCount).toBe(1);
    settle(c);
    expect(c.status).toBe("nearmiss");
    expect(c.winning).toBe(false);
    expect(c.strips.map((s) => s.slice(-3))).toEqual(nearMissGrid);

    c.start(); // allowed from nearmiss
    expect(c.status).toBe("spinning");
    expect(c.spinCount).toBe(2);
    settle(c);
    expect(c.status).toBe("won");
    expect(c.winning).toBe(true);
    expect(c.strips.map((s) => s.slice(-3))).toEqual(winGrid);
  });

  it("stops reels left -> right (reel 0 before the last reel)", () => {
    const c = make();
    c.start();
    c.update(560); // > reel0 stop (550), < last reel stop (1000)
    expect(c.stopped[0]).toBe(true);
    expect(c.stopped[2]).toBe(false);
  });

  it("ignores start() while spinning and update() while not spinning", () => {
    const c = make();
    c.update(100); // idle: no-op, no throw
    expect(c.status).toBe("idle");
    c.start();
    c.start(); // ignored while spinning
    expect(c.spinCount).toBe(1);
  });

  it("reset returns to idle and clears the spin count", () => {
    const c = make();
    c.start(); settle(c); c.start(); settle(c);
    expect(c.status).toBe("won");
    c.reset();
    expect(c.status).toBe("idle");
    expect(c.spinCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/r3f/kit/slotController.test.ts`
Expected: FAIL — cannot resolve `./slotController`.

- [ ] **Step 3: Write minimal implementation**

```ts
// components/r3f/kit/slotController.ts
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
  const stopped = new Array<boolean>(reels).fill(true);

  // Neutral idle board: a calm strip per reel so something renders before spin 1.
  const neutralGrid = Array.from({ length: reels }, (_, i) =>
    Array.from({ length: rows }, (_, r) => pool[(i * rows + r) % pool.length])
  );
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/r3f/kit/slotController.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/slotController.ts components/r3f/kit/slotController.test.ts
git commit -m "feat: scripted slotController (near-miss spin 1, win on winOnSpin)"
```

---

## Task 3: Shared types + `nearmiss` CTA in `SpinOverlay`

**Files:**
- Modify: `components/r3f/kit/types.ts`
- Modify: `components/r3f/kit/SpinOverlay.tsx:1-71`
- Modify: `components/r3f/kit/spinOverlay.module.css` (append)
- Test: `components/r3f/kit/SpinOverlay.test.tsx`

**Interfaces:**
- Consumes: existing `OverlayCopy`, `ConversionConfig`; `SlotStatus` from Task 2.
- Produces:
  - `type OverlayStatus = "idle" | "spinning" | "nearmiss" | "won"` (in `types.ts`).
  - `type SlotSymbol = { id: string; label: string; glyph: string; color: string; isWin?: boolean }`.
  - `type SlotTheme = { reels; rows; symbols: SlotSymbol[]; winSymbolId; winCount; winOnSpin; nearMissGrid; winGrid; durationMs; cabinet: { frame; glass; glow; accent } }`.
  - `OverlayCopy` gains optional `retryLabel?: string`, `nearMissLine?: string`.
  - `SpinOverlay` now accepts `status: OverlayStatus`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/r3f/kit/SpinOverlay.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpinOverlay } from "./SpinOverlay";
import { withConversionDefaults } from "./conversion";
import type { OverlayCopy } from "./types";
import type { OverlayVars } from "./SpinOverlay";

const copy: OverlayCopy = {
  logo: "B", heading: "h", ctaLabel: "SPIN", spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!", nearMissLine: "Two of three!",
  winTitle: "You won", winPrize: "WIN", winEmoji: "💰",
};
const vars: OverlayVars = { gold: "#f5c24b", accent: "#ffd56a", surface: "#15564a", text: "#eaf6ee", bannerBg: "#e2483d", bannerBorder: "#f5c24b" };
const config = withConversionDefaults({ prize: "200 Free Spins" });
const noop = () => {};

function renderAt(status: "idle" | "spinning" | "nearmiss" | "won") {
  return render(
    <SpinOverlay copy={copy} vars={vars} config={config} status={status} claimStep="hidden" muted reduced
      onSpin={noop} onToggleSound={noop} onClaimOpen={noop} onClaimSubmit={noop} onDismiss={noop} />
  );
}

describe("SpinOverlay nearmiss CTA", () => {
  it("shows the retry label and stays enabled on nearmiss", () => {
    renderAt("nearmiss");
    const btn = screen.getByTestId("spin-button");
    expect(btn).toHaveTextContent("So close — try again!");
    expect(btn).not.toBeDisabled();
    expect(screen.getByText("Two of three!")).toBeVisible();
  });
  it("shows the plain CTA when idle", () => {
    renderAt("idle");
    expect(screen.getByTestId("spin-button")).toHaveTextContent("SPIN");
  });
  it("disables the CTA while spinning", () => {
    renderAt("spinning");
    const btn = screen.getByTestId("spin-button");
    expect(btn).toHaveTextContent("SPINNING…");
    expect(btn).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/r3f/kit/SpinOverlay.test.tsx`
Expected: FAIL — `retryLabel`/`nearMissLine` not on `OverlayCopy` (TS) and the rendered button still shows `ctaLabel` / is disabled on `nearmiss`.

- [ ] **Step 3a: Add the types** (append to `components/r3f/kit/types.ts`, and extend `OverlayCopy`)

In `OverlayCopy`, add the two optional fields right after `spinningLabel`:

```ts
  spinningLabel: string;
  retryLabel?: string;     // shown on the CTA during a near-miss
  nearMissLine?: string;   // short sub-line under the CTA during a near-miss
```

Append at the end of `types.ts`:

```ts
export type OverlayStatus = "idle" | "spinning" | "nearmiss" | "won";

export type SlotSymbol = {
  id: string;
  label: string;
  glyph: string;   // emoji/text fallback art
  color: string;   // tile tint
  isWin?: boolean; // the scatter/win symbol
};

export type SlotTheme = {
  reels: number;            // 5 (Book of Ra) | 6 (Gates)
  rows: number;             // 3 (Book of Ra) | 5 (Gates)
  symbols: SlotSymbol[];
  winSymbolId: string;
  winCount: number;
  winOnSpin: number;        // spin index that wins (default 2 = near-miss first)
  nearMissGrid: string[][]; // winCount-1 win symbols
  winGrid: string[][];      // winCount+ win symbols
  durationMs: number;
  cabinet: { frame: string; glass: string; glow: string; accent: string };
};
```

- [ ] **Step 3b: Update `SpinOverlay.tsx`**

Change the status type import + prop, and the CTA block. Replace line 3:

```ts
import type { SpinStatus } from "./spinController";
```

with:

```ts
import type { OverlayStatus } from "./types";
```

Change the prop type (the `status:` line in the props block) from `status: SpinStatus;` to `status: OverlayStatus;`.

Replace the CTA `<button>` (lines 56-58) with:

```tsx
        <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status === "spinning" || status === "won"}>
          {status === "spinning" ? copy.spinningLabel : status === "nearmiss" ? (copy.retryLabel ?? copy.ctaLabel) : copy.ctaLabel}
        </button>
        {status === "nearmiss" && copy.nearMissLine && <p className={css.retryHint} data-pe>{copy.nearMissLine}</p>}
```

- [ ] **Step 3c: Append the `.retryHint` style** to `components/r3f/kit/spinOverlay.module.css`:

```css
.retryHint { margin: 4px 0 0; font-weight: 700; font-size: 14px; color: var(--gold);
  text-shadow: 0 0 12px color-mix(in srgb, var(--gold) 50%, transparent); }
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run components/r3f/kit/SpinOverlay.test.tsx && npx tsc --noEmit`
Expected: PASS, and `tsc` clean (the wheel scenes still typecheck — `SpinStatus` ⊆ `OverlayStatus`).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/types.ts components/r3f/kit/SpinOverlay.tsx components/r3f/kit/spinOverlay.module.css components/r3f/kit/SpinOverlay.test.tsx
git commit -m "feat: OverlayStatus + SlotTheme types; nearmiss retry CTA in SpinOverlay"
```

---

## Task 4: `SlotReels` cabinet + `useSlotDriver`

**Files:**
- Create: `components/r3f/kit/useSlotDriver.ts`
- Create: `components/r3f/kit/SlotReels.tsx`
- Create: `components/r3f/kit/slotReels.module.css`
- Test: `components/r3f/kit/SlotReels.test.tsx`

**Interfaces:**
- Consumes: `SlotController`, `SlotStatus` (Task 2); `SlotTheme` (Task 3).
- Produces:
  - `useSlotDriver({ controller, reelRefs, onStatus }): void` — rAF loop applying `translateY` per reel and emitting status changes.
  - `SlotReels({ theme, controller, status, onStatus }): JSX` — renders the cabinet; each reel column has `data-reel`, each tile `data-tile`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/r3f/kit/SlotReels.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SlotReels } from "./SlotReels";
import { createSlotController } from "./slotController";
import type { SlotTheme } from "./types";

const theme: SlotTheme = {
  reels: 3, rows: 3,
  symbols: [
    { id: "a", label: "Ace", glyph: "A", color: "#fff" },
    { id: "b", label: "King", glyph: "K", color: "#fff" },
    { id: "book", label: "Book", glyph: "📖", color: "#fc0", isWin: true },
  ],
  winSymbolId: "book", winCount: 3, winOnSpin: 2,
  nearMissGrid: [["a", "book", "b"], ["a", "b", "a"], ["b", "a", "b"]],
  winGrid: [["a", "book", "b"], ["a", "book", "a"], ["b", "book", "b"]],
  durationMs: 1000,
  cabinet: { frame: "#1a1206", glass: "#0c0802", glow: "#000", accent: "#fc0" },
};

function makeController() {
  return createSlotController({
    reels: theme.reels, rows: theme.rows, pool: theme.symbols.map((s) => s.id),
    nearMissGrid: theme.nearMissGrid, winGrid: theme.winGrid, winOnSpin: theme.winOnSpin,
    durationMs: theme.durationMs, spinRows: 10,
  });
}

describe("SlotReels", () => {
  it("renders one column per reel and a full strip of tiles", () => {
    const c = makeController();
    const { container } = render(<SlotReels theme={theme} controller={c} status="idle" onStatus={() => {}} />);
    expect(container.querySelectorAll("[data-reel]")).toHaveLength(3);
    // each strip = spinRows(10) + rows(3) = 13 tiles
    expect(container.querySelectorAll('[data-reel="0"] [data-tile]')).toHaveLength(13);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/r3f/kit/SlotReels.test.tsx`
Expected: FAIL — cannot resolve `./SlotReels`.

- [ ] **Step 3a: Create `useSlotDriver.ts`**

```ts
// components/r3f/kit/useSlotDriver.ts
import { useEffect, useRef, type MutableRefObject } from "react";
import type { SlotController, SlotStatus } from "./slotController";

// A self-scheduling requestAnimationFrame loop (the reels are DOM over the
// Canvas, so this is independent of R3F's useFrame). It advances the controller,
// writes each reel's transform, and reports status transitions.
export function useSlotDriver({ controller, reelRefs, onStatus }: {
  controller: SlotController;
  reelRefs: MutableRefObject<(HTMLDivElement | null)[]>;
  onStatus: (s: SlotStatus) => void;
}) {
  const cb = useRef(onStatus);
  cb.current = onStatus;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let prev: SlotStatus = controller.status;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      controller.update(dt);
      for (let i = 0; i < controller.reels; i++) {
        const el = reelRefs.current[i];
        if (!el) continue;
        const stripLen = controller.strips[i]?.length ?? controller.spinRows + controller.rows;
        const pct = ((controller.spinRows - controller.offsets[i]) / stripLen) * 100;
        el.style.transform = `translateY(-${pct}%)`;
      }
      if (controller.status !== prev) {
        prev = controller.status;
        cb.current(controller.status);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controller, reelRefs]);
}
```

- [ ] **Step 3b: Create `slotReels.module.css`**

```css
.wrap { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none;
  padding-bottom: 24vh; padding-top: 14vh; z-index: 1; }
.cabinet { --tile: clamp(38px, 12.5vw, 82px); padding: 14px; border-radius: 20px;
  background: var(--frame); border: 3px solid var(--accent);
  box-shadow: 0 24px 70px rgba(0,0,0,.62), inset 0 0 34px var(--glow); }
.glass { display: grid; grid-auto-flow: column; gap: 6px; padding: 8px; border-radius: 14px;
  background: var(--glass); }
.reel { width: var(--tile); height: calc(var(--tile) * var(--rows)); overflow: hidden; position: relative;
  border-radius: 8px; background: rgba(0,0,0,.25); }
.strip { position: absolute; top: 0; left: 0; right: 0; display: flex; flex-direction: column;
  will-change: transform; }
.tile { height: var(--tile); display: grid; place-items: center; font-size: calc(var(--tile) * .52);
  line-height: 1; border-bottom: 1px solid rgba(0,0,0,.22);
  text-shadow: 0 1px 3px rgba(0,0,0,.5); }
.tile.win { filter: drop-shadow(0 0 10px currentColor); }
@media (orientation: landscape) and (max-height: 560px) {
  .wrap { padding-bottom: 16vh; padding-top: 8vh; }
  .cabinet { --tile: clamp(30px, 8.5vh, 60px); }
}
```

- [ ] **Step 3c: Create `SlotReels.tsx`**

```tsx
// components/r3f/kit/SlotReels.tsx
"use client";
import { useMemo, useRef, type CSSProperties } from "react";
import type { SlotController, SlotStatus } from "./slotController";
import type { SlotTheme } from "./types";
import { useSlotDriver } from "./useSlotDriver";
import css from "./slotReels.module.css";

export function SlotReels({ theme, controller, status, onStatus }: {
  theme: SlotTheme;
  controller: SlotController;
  status: SlotStatus;          // re-render trigger: strips refresh on each transition
  onStatus: (s: SlotStatus) => void;
}) {
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  useSlotDriver({ controller, reelRefs, onStatus });

  const byId = useMemo(
    () => Object.fromEntries(theme.symbols.map((s) => [s.id, s])),
    [theme.symbols]
  );
  const strips = controller.strips; // read live; `status` prop forces re-read each transition
  const cabinetVars = {
    "--frame": theme.cabinet.frame, "--glass": theme.cabinet.glass,
    "--glow": theme.cabinet.glow, "--accent": theme.cabinet.accent,
    "--rows": theme.rows,
  } as CSSProperties;

  return (
    <div className={css.wrap} aria-hidden={status === "spinning"} data-status={status}>
      <div className={css.cabinet} style={cabinetVars}>
        <div className={css.glass}>
          {strips.map((strip, ri) => (
            <div className={css.reel} key={ri} data-reel={ri}>
              <div className={css.strip} ref={(el) => { reelRefs.current[ri] = el; }}>
                {strip.map((id, si) => {
                  const sym = byId[id];
                  return (
                    <div
                      key={si}
                      data-tile
                      className={`${css.tile}${sym?.isWin ? " " + css.win : ""}`}
                      style={{ color: sym?.color }}
                      role="img"
                      aria-label={sym?.label}
                    >
                      {sym?.glyph}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/r3f/kit/SlotReels.test.tsx`
Expected: PASS (3 reels, 13 tiles in reel 0).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/useSlotDriver.ts components/r3f/kit/SlotReels.tsx components/r3f/kit/slotReels.module.css components/r3f/kit/SlotReels.test.tsx
git commit -m "feat: SlotReels cabinet + rAF useSlotDriver (DOM reels)"
```

---

## Task 5: `useSlotScene` wiring hook

**Files:**
- Create: `components/r3f/kit/useSlotScene.ts`
- Test: `components/r3f/kit/useSlotScene.test.ts`

**Interfaces:**
- Consumes: `createSlotController`/`SlotStatus` (Task 2), `claimReducer` (`./claimMachine`), `createHaptics` (`./haptics`), `SoundInstance`/`ConversionConfig`/`SlotTheme` (`./types`).
- Produces: `useSlotScene({ reduced, sound, theme, conversion, onClaim?, navigate? })` returning `{ status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss }`.

- [ ] **Step 1: Write the failing test**

```ts
// components/r3f/kit/useSlotScene.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/r3f/kit/useSlotScene.test.ts`
Expected: FAIL — cannot resolve `./useSlotScene`.

- [ ] **Step 3: Write the implementation**

```ts
// components/r3f/kit/useSlotScene.ts
import { useEffect, useMemo, useReducer, useState } from "react";
import { createSlotController, type SlotStatus } from "./slotController";
import { claimReducer } from "./claimMachine";
import { createHaptics } from "./haptics";
import type { SoundInstance, ConversionConfig, SlotTheme } from "./types";

export function useSlotScene({ reduced, sound, theme, conversion, onClaim, navigate }: {
  reduced: boolean;
  sound: SoundInstance;
  theme: SlotTheme;
  conversion: ConversionConfig;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
}) {
  const [status, setStatus] = useState<SlotStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [claimStep, dispatch] = useReducer(claimReducer, "hidden");
  const haptics = useMemo(() => createHaptics({ reduced }), [reduced]);
  const go = navigate ?? ((url: string) => { if (typeof window !== "undefined") window.location.assign(url); });

  const controller = useMemo(
    () => createSlotController({
      reels: theme.reels,
      rows: theme.rows,
      pool: theme.symbols.map((s) => s.id),
      nearMissGrid: theme.nearMissGrid,
      winGrid: theme.winGrid,
      winOnSpin: theme.winOnSpin,
      durationMs: reduced ? 350 : theme.durationMs,
    }),
    [theme, reduced]
  );

  useEffect(() => {
    if (status !== "won") { dispatch({ type: "reset" }); return; }
    const t = setTimeout(() => dispatch({ type: "won" }), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);

  const onSpin = () => {
    if (status !== "idle" && status !== "nearmiss") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
    haptics.spin();
  };
  const onStatus = (s: SlotStatus) => {
    setStatus(s);
    if (s === "won") { sound.win(); haptics.win(); }
    else if (s === "nearmiss") { sound.tick(); haptics.spin(); }
  };
  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  const onClaimOpen = () => dispatch({ type: "open" });
  const onClaimSubmit = async (value: string) => {
    dispatch({ type: "submit" });
    haptics.claim();
    try { await onClaim?.({ field: conversion.registerField, value, prize: conversion.prize }); } catch { /* best-effort lead */ }
    dispatch({ type: "done" });
    go(conversion.redirectUrl);
  };
  const onDismiss = () => { controller.reset(); setStatus("idle"); dispatch({ type: "reset" }); };

  return { status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/r3f/kit/useSlotScene.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/useSlotScene.ts components/r3f/kit/useSlotScene.test.ts
git commit -m "feat: useSlotScene wires slotController to claim/sound/haptics funnel"
```

---

## Task 6: Book of Ra landing (theme + backdrop + scene + route + e2e)

**Files:**
- Create: `components/r3f/slots/book-of-ra/theme.ts`
- Create: `components/r3f/slots/book-of-ra/TempleBackdrop.tsx`
- Create: `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`
- Create: `app/prototypes/3d/book-of-ra/page.tsx`
- Test: `tests/e2e/bookOfRa.spec.ts`

**Interfaces:**
- Consumes: `SlotTheme`/`SoundConfig`/`OverlayCopy` (`../../kit/types`), `OverlayVars` (`../../kit/SpinOverlay`), `withConversionDefaults` (`../../kit/conversion`), `useSlotScene`, `SlotReels`, `SpinOverlay`, `createSound`, `useReducedMotion`, `isWebGLAvailable`, `CoinStorm`, `Effects`, `SlotStatus`.
- Produces: `BookOfRaScene` (default-exported via the dynamic page).

- [ ] **Step 1: Write the failing e2e test**

```ts
// tests/e2e/bookOfRa.spec.ts
import { test, expect } from "@playwright/test";

test("Book of Ra route boots a WebGL canvas with no page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/book-of-ra");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test.describe("near-miss then win", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } }); // shortens reels to ~350ms
  test("spin 1 near-miss -> try again -> spin 2 win -> WinSheet", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/prototypes/3d/book-of-ra");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("win-modal")).toBeHidden();
    const spin = page.getByTestId("spin-button");
    await spin.click({ force: true }); // spin 1
    await expect(spin).toHaveText(/try again/i, { timeout: 30_000 });
    await spin.click({ force: true }); // spin 2
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("200 Free Spins")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("claim-open")).toBeVisible({ timeout: 15_000 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/bookOfRa.spec.ts`
Expected: FAIL — route 404s (page not created yet).

- [ ] **Step 3a: Create `theme.ts`**

```ts
// components/r3f/slots/book-of-ra/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Egyptian temple set. "book" is the scatter/win symbol; 3 books = the win.
export const bookOfRaTheme: SlotTheme = {
  reels: 5,
  rows: 3,
  symbols: [
    { id: "book", label: "Book of Riches", glyph: "📖", color: "#FFD24A", isWin: true },
    { id: "explorer", label: "Explorer", glyph: "🧭", color: "#F2E2B6" },
    { id: "pharaoh", label: "Pharaoh", glyph: "👑", color: "#FFCF6A" },
    { id: "scarab", label: "Scarab", glyph: "🪲", color: "#7FD1B9" },
    { id: "statue", label: "Statue", glyph: "🗿", color: "#D9C9A3" },
    { id: "A", label: "Ace", glyph: "A", color: "#EFE6CC" },
    { id: "K", label: "King", glyph: "K", color: "#EFE6CC" },
    { id: "Q", label: "Queen", glyph: "Q", color: "#EFE6CC" },
    { id: "J", label: "Jack", glyph: "J", color: "#EFE6CC" },
    { id: "T", label: "Ten", glyph: "10", color: "#EFE6CC" },
  ],
  winSymbolId: "book",
  winCount: 3,
  winOnSpin: 2,
  // 2 books (reels 0 & 2) — the 3rd never lands: a near-miss.
  nearMissGrid: [
    ["A", "book", "K"],
    ["Q", "J", "scarab"],
    ["book", "explorer", "T"],
    ["pharaoh", "A", "Q"],
    ["J", "scarab", "K"],
  ],
  // 3 books across the middle line (reels 0, 2, 4) — the win.
  winGrid: [
    ["A", "book", "K"],
    ["Q", "J", "scarab"],
    ["explorer", "book", "T"],
    ["pharaoh", "A", "Q"],
    ["K", "book", "scarab"],
  ],
  durationMs: 2600,
  cabinet: { frame: "#3a2410", glass: "#1c1206", glow: "#7a4a12", accent: "#C8881E" },
};

export const bookOfRaSound: SoundConfig = {
  tick: { freqs: [880], ms: 45, gain: 0.16 },
  win: { freqs: [523, 659, 784], ms: 900, gain: 0.3 },
};

export const bookOfRaCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Unseal the Book of Riches",
  subtitle: "Land 3 Books to open the bonus",
  ctaLabel: "SPIN THE TEMPLE",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "Two Books landed — one more!",
  winTitle: "The Book opens — You won",
  winPrize: "BONUS!",
  winEmoji: "📖",
};

export const bookOfRaOverlayVars: OverlayVars = {
  gold: "#F5C24B", accent: "#FFD56A", surface: "#241606",
  text: "#F4ECD8", bannerBg: "#7a4a12", bannerBorder: "#F5C24B",
};

export const bookOfRaConversion = withConversionDefaults({
  prize: "Book of Riches — 200 Free Spins",
  claimLabel: "Open my bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register?src=book-of-ra",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Khaled", amount: "200 FS", minutesAgo: 2 },
      { name: "Sofia", amount: "€300", minutesAgo: 5 },
      { name: "Marco", amount: "BONUS", minutesAgo: 9 },
    ],
    todayCount: 2874,
  },
});
```

- [ ] **Step 3b: Create `TempleBackdrop.tsx`**

```tsx
// components/r3f/slots/book-of-ra/TempleBackdrop.tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SlotStatus } from "../../kit/slotController";

export function TempleBackdrop({ status, reduced }: { status: SlotStatus; reduced: boolean }) {
  const torchL = useRef<THREE.PointLight>(null!);
  const torchR = useRef<THREE.PointLight>(null!);
  const pillars = [-4.6, -3.0, 3.0, 4.6];

  useFrame((s) => {
    if (reduced) return;
    const t = s.clock.elapsedTime;
    const flick = 0.7 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.08;
    if (torchL.current) torchL.current.intensity = 16 * flick;
    if (torchR.current) torchR.current.intensity = 16 * (1.45 - flick);
  });

  return (
    <group position={[0, 0, -3]}>
      <pointLight ref={torchL} position={[-3, 2.4, 1.5]} color="#FF8A2A" intensity={16} distance={16} />
      <pointLight ref={torchR} position={[3, 2.4, 1.5]} color="#FFB347" intensity={16} distance={16} />
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[30, 18]} />
        <meshStandardMaterial color="#3a2410" roughness={1} />
      </mesh>
      {pillars.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[1.2, 16, 1.2]} />
          <meshStandardMaterial color="#6b4a22" roughness={0.92} emissive="#2a1a08" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {status === "won" && <pointLight position={[0, 0, 3]} color="#FFD24A" intensity={70} distance={22} />}
    </group>
  );
}
```

- [ ] **Step 3c: Create `BookOfRaScene.tsx`**

```tsx
// components/r3f/slots/book-of-ra/BookOfRaScene.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { SlotReels } from "../../kit/SlotReels";
import { SpinOverlay } from "../../kit/SpinOverlay";
import { Effects } from "../../kit/Effects";
import { CoinStorm } from "../../kit/CoinStorm";
import { createSound } from "../../kit/sound";
import { useReducedMotion } from "../../kit/useReducedMotion";
import { useSlotScene } from "../../kit/useSlotScene";
import { isWebGLAvailable } from "../../kit/webgl";
import { TempleBackdrop } from "./TempleBackdrop";
import {
  bookOfRaTheme, bookOfRaSound, bookOfRaCopy, bookOfRaOverlayVars, bookOfRaConversion,
} from "./theme";

export function BookOfRaScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(bookOfRaSound), []);
  const scene = useSlotScene({ reduced, sound, theme: bookOfRaTheme, conversion: bookOfRaConversion });
  const { status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } = scene;

  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(isWebGLAvailable()); }, []);
  useEffect(() => {
    const onVis = () => sound.setMuted(document.hidden ? true : muted);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sound, muted]);

  const overlay = (
    <SpinOverlay
      copy={bookOfRaCopy} vars={bookOfRaOverlayVars} config={bookOfRaConversion}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={bookOfRaTheme} controller={controller} status={status} onStatus={onStatus} />;

  if (!webgl) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #4a2f10 0%, #1a0f04 70%)" }}>
        {reels}
        {overlay}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f04" }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#1a0f04"]} />
        <fog attach="fog" args={["#1a0f04", 6, 28]} />
        <ambientLight intensity={0.4} />
        <TempleBackdrop status={status} reduced={reduced} />
        {status === "won" && <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 55 : 90)} color="#FFD24A" />}
        {!reduced && <Sparkles count={50} scale={[12, 8, 4]} size={3} speed={0.25} color="#FFCF6A" />}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={false} />
      </Canvas>
      {reels}
      {overlay}
    </div>
  );
}
```

- [ ] **Step 3d: Create `app/prototypes/3d/book-of-ra/page.tsx`**

```tsx
"use client";
import dynamic from "next/dynamic";

const BookOfRaScene = dynamic(
  () => import("@/components/r3f/slots/book-of-ra/BookOfRaScene").then((m) => m.BookOfRaScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#1a0f04", color: "#F5C24B", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        ENTERING THE TEMPLE…
      </div>
    ),
  }
);

export default function Page() {
  return <BookOfRaScene />;
}
```

- [ ] **Step 4: Run the e2e + typecheck**

Run: `npx tsc --noEmit && npx playwright test tests/e2e/bookOfRa.spec.ts`
Expected: `tsc` clean; both e2e tests PASS (boot + near-miss→win→WinSheet).

> If the run-server isn't up, start it the way the other prototype e2e expects (Playwright `webServer` in `playwright.config.ts`). Use `{ force: true }` clicks (already in the spec) to survive SwiftShader rAF starvation.

- [ ] **Step 5: Commit**

```bash
git add components/r3f/slots/book-of-ra app/prototypes/3d/book-of-ra tests/e2e/bookOfRa.spec.ts
git commit -m "feat: Book of Ra slot landing (temple backdrop + scripted near-miss/win)"
```

---

## Task 7: Gates of Olympus landing (theme + backdrop + scene + route + e2e)

**Files:**
- Create: `components/r3f/slots/gates-of-olympus/theme.ts`
- Create: `components/r3f/slots/gates-of-olympus/OlympusBackdrop.tsx`
- Create: `components/r3f/slots/gates-of-olympus/GatesScene.tsx`
- Create: `app/prototypes/3d/gates-of-olympus/page.tsx`
- Test: `tests/e2e/gatesOfOlympus.spec.ts`

**Interfaces:**
- Consumes: same kit modules as Task 6.
- Produces: `GatesScene`.

- [ ] **Step 1: Write the failing e2e test**

```ts
// tests/e2e/gatesOfOlympus.spec.ts
import { test, expect } from "@playwright/test";

test("Gates of Olympus route boots a WebGL canvas with no page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/gates-of-olympus");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test.describe("near-miss then win", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });
  test("spin 1 near-miss -> try again -> spin 2 win -> WinSheet", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/prototypes/3d/gates-of-olympus");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("win-modal")).toBeHidden();
    const spin = page.getByTestId("spin-button");
    await spin.click({ force: true });
    await expect(spin).toHaveText(/try again/i, { timeout: 30_000 });
    await spin.click({ force: true });
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("500 Free Spins")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("claim-open")).toBeVisible({ timeout: 15_000 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/e2e/gatesOfOlympus.spec.ts`
Expected: FAIL — route 404s.

- [ ] **Step 3a: Create `theme.ts`**

```ts
// components/r3f/slots/gates-of-olympus/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Mount Olympus set. "zeus" is the scatter/win symbol; 4 scatters = the win.
export const gatesTheme: SlotTheme = {
  reels: 6,
  rows: 5,
  symbols: [
    { id: "zeus", label: "Zeus orb", glyph: "⚡", color: "#C9B6FF", isWin: true },
    { id: "crown", label: "Crown", glyph: "👑", color: "#FFD56A" },
    { id: "hourglass", label: "Hourglass", glyph: "⌛", color: "#F2C879" },
    { id: "ring", label: "Ring", glyph: "💍", color: "#9FE0FF" },
    { id: "chalice", label: "Chalice", glyph: "🍷", color: "#FF8FB0" },
    { id: "gemRed", label: "Red gem", glyph: "🔴", color: "#FF5C6C" },
    { id: "gemBlue", label: "Blue gem", glyph: "🔵", color: "#5C8CFF" },
    { id: "gemGreen", label: "Green gem", glyph: "🟢", color: "#5CE08A" },
    { id: "gemPurple", label: "Purple gem", glyph: "🟣", color: "#B06CFF" },
  ],
  winSymbolId: "zeus",
  winCount: 4,
  winOnSpin: 2,
  // 3 zeus scatters (reels 0, 2, 4) — the 4th never lands: a near-miss.
  nearMissGrid: [
    ["crown", "zeus", "gemRed", "gemBlue", "ring"],
    ["gemGreen", "hourglass", "chalice", "gemPurple", "crown"],
    ["gemBlue", "gemRed", "zeus", "ring", "gemGreen"],
    ["chalice", "gemPurple", "gemBlue", "hourglass", "gemRed"],
    ["ring", "gemGreen", "zeus", "gemBlue", "crown"],
    ["gemRed", "chalice", "gemPurple", "ring", "hourglass"],
  ],
  // 4 zeus scatters (reels 0, 2, 4, 5) — the win.
  winGrid: [
    ["crown", "zeus", "gemRed", "gemBlue", "ring"],
    ["gemGreen", "hourglass", "chalice", "gemPurple", "crown"],
    ["gemBlue", "gemRed", "zeus", "ring", "gemGreen"],
    ["chalice", "gemPurple", "gemBlue", "hourglass", "gemRed"],
    ["ring", "gemGreen", "zeus", "gemBlue", "crown"],
    ["gemRed", "zeus", "gemPurple", "ring", "hourglass"],
  ],
  durationMs: 2800,
  cabinet: { frame: "#241a52", glass: "#120c2e", glow: "#4a39a0", accent: "#FFD56A" },
};

export const gatesSound: SoundConfig = {
  tick: { freqs: [1040], ms: 42, gain: 0.16 },
  win: { freqs: [587, 740, 880], ms: 950, gain: 0.32 },
};

export const gatesCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Summon the Gates of Olympus",
  subtitle: "Land 4 Zeus orbs to call the storm",
  ctaLabel: "INVOKE ZEUS",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "Three orbs charged — one more!",
  winTitle: "Zeus answers — You won",
  winPrize: "×500!",
  winEmoji: "⚡",
};

export const gatesOverlayVars: OverlayVars = {
  gold: "#FFD56A", accent: "#C9B6FF", surface: "#1a1140",
  text: "#ECE6FF", bannerBg: "#4a39a0", bannerBorder: "#FFD56A",
};

export const gatesConversion = withConversionDefaults({
  prize: "Gates Bonus — 500 Free Spins + ×500",
  claimLabel: "Claim the storm bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register?src=gates-of-olympus",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Elena", amount: "×250", minutesAgo: 1 },
      { name: "Dimitri", amount: "€800", minutesAgo: 4 },
      { name: "Aisha", amount: "×500", minutesAgo: 7 },
    ],
    todayCount: 4106,
  },
});
```

- [ ] **Step 3b: Create `OlympusBackdrop.tsx`**

```tsx
// components/r3f/slots/gates-of-olympus/OlympusBackdrop.tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SlotStatus } from "../../kit/slotController";

export function OlympusBackdrop({ status, reduced }: { status: SlotStatus; reduced: boolean }) {
  const bolt = useRef<THREE.PointLight>(null!);

  useFrame((s) => {
    if (reduced) return;
    const t = s.clock.elapsedTime;
    const strike = Math.sin(t * 0.7) > 0.985 ? 1 : 0; // occasional flash
    const base = status === "won" ? 50 : 10;
    if (bolt.current) bolt.current.intensity = base + strike * 120;
  });

  return (
    <group position={[0, 0, -4]}>
      <pointLight ref={bolt} position={[0, 4, 2]} color="#C9B6FF" intensity={10} distance={30} />
      <pointLight position={[-6, -2, 2]} color="#5b6bff" intensity={20} distance={22} />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[44, 26]} />
        <meshStandardMaterial color="#1a1140" roughness={1} />
      </mesh>
      <mesh position={[0, 4.5, -1]}>
        <planeGeometry args={[34, 9]} />
        <meshStandardMaterial color="#2a1f5c" transparent opacity={0.5} />
      </mesh>
      <mesh position={[2, -4.5, -1]}>
        <planeGeometry args={[34, 9]} />
        <meshStandardMaterial color="#160f3a" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 3c: Create `GatesScene.tsx`**

```tsx
// components/r3f/slots/gates-of-olympus/GatesScene.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { SlotReels } from "../../kit/SlotReels";
import { SpinOverlay } from "../../kit/SpinOverlay";
import { Effects } from "../../kit/Effects";
import { CoinStorm } from "../../kit/CoinStorm";
import { createSound } from "../../kit/sound";
import { useReducedMotion } from "../../kit/useReducedMotion";
import { useSlotScene } from "../../kit/useSlotScene";
import { isWebGLAvailable } from "../../kit/webgl";
import { OlympusBackdrop } from "./OlympusBackdrop";
import { gatesTheme, gatesSound, gatesCopy, gatesOverlayVars, gatesConversion } from "./theme";

export function GatesScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(gatesSound), []);
  const scene = useSlotScene({ reduced, sound, theme: gatesTheme, conversion: gatesConversion });
  const { status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } = scene;

  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(isWebGLAvailable()); }, []);
  useEffect(() => {
    const onVis = () => sound.setMuted(document.hidden ? true : muted);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sound, muted]);

  const overlay = (
    <SpinOverlay
      copy={gatesCopy} vars={gatesOverlayVars} config={gatesConversion}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={gatesTheme} controller={controller} status={status} onStatus={onStatus} />;

  if (!webgl) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #2a1f5c 0%, #120c2e 70%)" }}>
        {reels}
        {overlay}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#120c2e" }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 44 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#120c2e"]} />
        <fog attach="fog" args={["#120c2e", 8, 32]} />
        <ambientLight intensity={0.45} />
        <OlympusBackdrop status={status} reduced={reduced} />
        {status === "won" && <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 55 : 90)} color="#FFD56A" />}
        {!reduced && <Sparkles count={60} scale={[14, 9, 4]} size={3} speed={0.3} color="#C9B6FF" />}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>
      {reels}
      {overlay}
    </div>
  );
}
```

- [ ] **Step 3d: Create `app/prototypes/3d/gates-of-olympus/page.tsx`**

```tsx
"use client";
import dynamic from "next/dynamic";

const GatesScene = dynamic(
  () => import("@/components/r3f/slots/gates-of-olympus/GatesScene").then((m) => m.GatesScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#120c2e", color: "#FFD56A", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        SUMMONING OLYMPUS…
      </div>
    ),
  }
);

export default function Page() {
  return <GatesScene />;
}
```

- [ ] **Step 4: Run the e2e + typecheck**

Run: `npx tsc --noEmit && npx playwright test tests/e2e/gatesOfOlympus.spec.ts`
Expected: `tsc` clean; both e2e tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/r3f/slots/gates-of-olympus app/prototypes/3d/gates-of-olympus tests/e2e/gatesOfOlympus.spec.ts
git commit -m "feat: Gates of Olympus slot landing (storm backdrop + scripted near-miss/win)"
```

---

## Task 8: Gallery links + full regression

**Files:**
- Modify: `public/prototypes/index.html:25-29`

**Interfaces:** none (static HTML + verification only).

- [ ] **Step 1: Update the gallery copy + add two cards**

Replace the `<p>` (line 25) and the `.cards` block (lines 26-29) with:

```html
    <p>Brand-new animated mockups — spin-the-wheel and slots. Design only — not wired into the app.</p>
    <div class="cards">
      <a class="card" href="/prototypes/3d/alchemy-lab">The Alchemy Lab<span>Real-time 3D · cauldron · physics · sound</span></a>
      <a class="card" href="/prototypes/3d/jackpot-vault">Jackpot Boom Vault<span>Real-time 3D · physics · sound</span></a>
      <a class="card" href="/prototypes/3d/book-of-ra">Book of Riches<span>Slots · Book of Ra style · near-miss → win</span></a>
      <a class="card" href="/prototypes/3d/gates-of-olympus">Gates of Olympus<span>Slots · Olympus storm · near-miss → win</span></a>
    </div>
```

- [ ] **Step 2: Verify the gallery still loads + links resolve**

Run: `npx playwright test tests/e2e/prototypes.spec.ts`
Expected: PASS (the gallery smoke still green).

- [ ] **Step 3: Full unit + typecheck + e2e regression**

Run:
```bash
npx tsc --noEmit
npm test
npx playwright test tests/e2e/bookOfRa.spec.ts tests/e2e/gatesOfOlympus.spec.ts tests/e2e/jackpotVault3d.spec.ts tests/e2e/alchemyLab3d.spec.ts tests/e2e/prototypes.spec.ts
```
Expected: `tsc` clean; all unit tests pass (existing 173 + the new slotMath/slotController/SpinOverlay/SlotReels/useSlotScene suites); all listed e2e pass (the two new slots + the two wheel landings + gallery, proving no regression).

- [ ] **Step 4: Commit**

```bash
git add public/prototypes/index.html
git commit -m "feat: link Book of Ra + Gates of Olympus slot landings in the gallery"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** Two landings (Tasks 6, 7) · reused funnel + same `WinSheet` (Tasks 3, 6, 7 use `SpinOverlay`/`WinSheet` unchanged) · near-miss→win-on-2nd-spin (Tasks 2, 5) · hybrid 2D-reels-over-3D-backdrop with `CoinStorm`+`Effects` (Tasks 4, 6, 7) · `slotMath`/`slotController` pure+tested (Tasks 1, 2) · per-game themes/backdrops/copy (Tasks 6, 7) · reduced-motion (Task 5 `durationMs:350`) · WebGL fallback (Tasks 6, 7 `if (!webgl)`) · sound muted + tab-hide (Tasks 6, 7) · routes under `/prototypes/3d/` (Tasks 6, 7) · gallery cards (Task 8) · test matrix (every task). All spec sections map to a task.

**Placeholder scan:** No TBD/TODO; every code step shows complete code; prize/copy strings are concrete; the e2e prize assertions use substrings (`"200 Free Spins"`, `"500 Free Spins"`) that appear inside the concrete `prize` values.

**Type consistency:** `SlotStatus` (`idle|spinning|nearmiss|won`) is produced in Task 2 and consumed by Tasks 4/5/6/7; `OverlayStatus` (Task 3) is the superset `SpinOverlay` accepts and `SlotStatus`/`SpinStatus` both satisfy it. `SlotTheme` fields (`reels,rows,symbols,winSymbolId,winCount,winOnSpin,nearMissGrid,winGrid,durationMs,cabinet`) match across the type (Task 3), the controller args (Task 2 via `useSlotScene` mapping in Task 5), `SlotReels` (Task 4), and the themes (Tasks 6/7). `createSlotController` arg names and the controller's exposed members (`strips`, `offsets`, `stopped`, `reels`, `rows`, `spinRows`, `status`, `spinCount`, `winning`, `start/update/reset`) are used identically in `useSlotDriver`/`SlotReels`/`useSlotScene`. `useSlotScene` return shape matches the destructuring in both scenes.
