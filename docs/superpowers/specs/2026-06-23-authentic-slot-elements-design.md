# Authentic Slot Elements + Real Winning Combinations

**Date:** 2026-06-23
**Branch:** `feat/igaming-visual-polish`
**Status:** Design approved (purple-gem cluster for Gates, Explorer line for Book of Ra). Enhancement of the existing slot landings.

## Goal

Make the two slot landings use each game's **authentic symbol set** and land an **actual winning combination** on the win spin (not random scattered elements), with the winning cells **highlighted**.

## Decisions

- **Win presentation:** authentic per game + highlight.
  - **Book of Ra** (5×3, payline game): win = a real **5-of-a-kind payline** — 5 **Explorers** across the centre row; the winning line is lit + a gold **payline** drawn through it; other tiles dimmed. Near-miss = **4 Explorers + 1 off** (one short).
  - **Gates of Olympus** (6×5, pay-anywhere): win = a real **8-of-a-kind cluster** of the **purple gem** scattered across the grid, lit, **plus 2 Zeus multiplier orbs (×100, ×500 → ×500 total)**; other tiles dimmed. Near-miss = **7 purple gems** (one under the 8 threshold), no orbs.
- **Symbol art:** authentic set + names with styled glyphs (per-symbol colour + value tier). No trademarked sprites ("inspired-by").
- The win stays **scripted** (win on spin 2 via `winOnSpin`); only the *result grid* is now a genuine paying combination.

## Authentic symbol sets

**Book of Ra:** `book` (Book of Ra — wild/scatter), `explorer` (Explorer, top payer), `pharaoh` (Eye of Horus), `anubis` (Anubis), `scarab` (Scarab), royals `A K Q J T(10)`.

**Gates of Olympus:** `zeus` (Zeus orb — scatter), `crown`, `hourglass`, `ring`, `chalice`, gems `gemRed gemBlue gemGreen gemPurple`, and multiplier orbs `orb100` (×100), `orb500` (×500).

## Data model (additive)

- `SlotSymbol` gains optional `tier?: number` (value tier → styling) and `isOrb?: boolean` (multiplier-orb rendering: glowing sphere showing the ×value as its glyph).
- `SlotTheme` gains:
  - `winningCells: Array<[reel: number, row: number]>` — the visible result cells that form the win; lit when `status === "won"`, every other visible cell dimmed.
  - `winLineRow?: number` — optional payline row index (Book of Ra draws a line across it on win; Gates omits it — cluster, no line).

## Win grids (the real combinations)

**Book of Ra `winGrid`** (5 reels × 3 rows): centre row (index 1) is all `explorer`; `winningCells` = `[[0,1],[1,1],[2,1],[3,1],[4,1]]`; `winLineRow = 1`.
**Book of Ra `nearMissGrid`**: centre row = 4 `explorer` + reel 4 centre is `pharaoh` (one short).

**Gates `winGrid`** (6×5): exactly **8** `gemPurple` cells + `orb100` + `orb500`; `winningCells` = those 8 gem cells + the 2 orb cells (10 lit). `winSymbolId = "gemPurple"`, `winCount = 8`.
**Gates `nearMissGrid`**: **7** `gemPurple`, no orbs (one short).

## Rendering (`SlotReels`)

For each visible result tile (strip index ≥ `spinRows`, visible row = index − `spinRows`):
- On `status === "won"`: tile is `.win` (scale + glow in symbol colour) if `[reel,row] ∈ winningCells`, else `.dim` (faded/desaturated). Add `data-win="true"` to winning visible tiles (test hook).
- `isOrb` symbols always render as `.orb` (glowing sphere, ×value text).
- If `winLineRow != null` and `status === "won"`: render a `.payline` overlay across that row.
- Reduced-motion: same lit/dim end-state, no animation.
- Near-miss / idle / spinning: no highlight.

## Tests

- **Theme data-validation** (`components/r3f/slots/themes.test.ts`): Book of Ra winGrid centre row all `explorer`, `winningCells` length 5 each mapping to `explorer`, `winLineRow === 1`, nearMiss centre row exactly 4 `explorer`. Gates winGrid `gemPurple` count === `winCount` (8), every `winningCell` is `gemPurple` or an `isOrb` symbol, orbs present only in winGrid, nearMiss `gemPurple` count === 7. This keeps the highlight in sync with the grid forever ("the win is a real combination").
- **SlotReels highlight** (`SlotReels.test.tsx`): on `status === "won"`, `[data-win="true"]` count === `winningCells.length` and non-winning visible cells carry the dim class.
- **Regression:** existing unit + e2e stay green (prize/WinSheet unchanged); tsc clean.

## Files touched

`kit/types.ts`, `kit/SlotReels.tsx`, `kit/slotReels.module.css`, `slots/book-of-ra/theme.ts`, `slots/gates-of-olympus/theme.ts`, plus the two test files.
