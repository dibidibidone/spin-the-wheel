# Slot-Machine Landings — Book of Ra style + Gates of Olympus style

**Date:** 2026-06-22
**Branch base:** `feat/mobile-igaming-landings` (current 3D-landing family lives here)
**Status:** Design approved, ready for implementation plan.

## Summary

Two brand-new, fully-styled standalone landing mockups that replace the spinning
**wheel** with a spinning **slot machine**, while reusing the *exact* conversion
funnel and win popup of the existing "spin the wheel new 2" landings
(`/prototypes/3d/jackpot-vault` + `/prototypes/3d/alchemy-lab`).

1. **Book of Ra style** — Egyptian temple, 5×3 reel grid, "Book" scatter win.
2. **Gates of Olympus style** — Mount Olympus storm, 6×5 reel grid, Zeus/lightning scatter win.

Both are design-only review prototypes living under `app/prototypes/3d/*` and
`components/r3f/*`, isolated from the production `LandingScene`/`globals.css`,
consistent with the existing prototype landings.

## Goals

- Same **logic & funnel** as the wheel landings: scripted, deterministic,
  replayable; the **same `WinSheet` popup** (`reveal → form → submit → redirect`)
  and the same accelerants (Countdown / SocialProof / TrustBar / haptics / sound).
- A **near-miss → win-on-2nd-spin** script: spin once → tantalizing near-miss →
  "So close — try again!" → spin again → full win → `WinSheet`.
- **Hybrid rendering:** authentic 2D reel cabinet (DOM/CSS) over an R3F
  atmospheric 3D backdrop, reusing `CoinStorm` + bloom `Effects` for the win shower.
- Mobile-first and conversion-driving, matching the polish of the current 3D family.
- Reduced-motion safe, WebGL-fallback safe, sound muted by default.

## Non-goals

- No real slot RNG / paylines / RTP. The result is **scripted** (near-miss grid,
  then win grid), the same way the wheel is a "guaranteed win on the Nth spin".
- No backend lead capture — `onClaim` stays a stub, redirect is the static
  `config.redirectUrl` (same as the existing landings; real backend out of scope).
- No wiring into the production `Landing` model / template system (deferred,
  same as the other prototypes).
- No exact trademarked logos/assets. Symbol art is **original, "inspired-by"**;
  the popup/header stays Boomzino-branded.

## Decisions (from brainstorming)

| Decision | Choice |
| --- | --- |
| Rendering | **Hybrid** — 2D reel cabinet (DOM/CSS) over an R3F 3D backdrop; `CoinStorm` + `Effects` reused for the win shower. |
| Spin-to-win script | **Near-miss, win on the 2nd spin** (scripted, replayable, theme-tunable via `winOnSpin`, default 2). |
| Win popup | The existing `WinSheet`, reused unchanged. |
| Routes | `/prototypes/3d/book-of-ra`, `/prototypes/3d/gates-of-olympus`. |
| Branding | "Inspired-by" original art; Boomzino-branded overlay/popup. |
| Lead field | `email` for both (matches jackpot); per-game tunable. |

## Architecture

### Reused unchanged (the funnel)

- `kit/SpinOverlay.tsx` + `spinOverlay.module.css` (one additive change, below)
- `kit/WinSheet.tsx` + `winSheet.module.css` — **the same popup**
- `kit/claimMachine.ts` — `hidden → reveal → form → submitting → redirect`
- `kit/Countdown.tsx`, `SocialProof.tsx`, `TrustBar.tsx`, `haptics.ts`
- `kit/sound.ts`, `conversion.ts` (`ConversionConfig` + `withConversionDefaults`)
- `kit/useReducedMotion.ts`, `Effects.tsx`, `CoinStorm.tsx`, `SceneFallback.tsx`, `webgl.ts`

### New modules (mirror the wheel's `spinMath` / `spinController` / `Wheel3D` split)

| File | Purpose | Tested by |
| --- | --- | --- |
| `kit/slotMath.ts` | Pure: build the looping reel-strip order; eased reel offset over time; visible symbols from an offset; staggered per-reel stop timings. | `kit/slotMath.test.ts` (unit, TDD) |
| `kit/slotController.ts` | Pure state machine: `idle → spinning → nearmiss → (idle) → spinning → won`; tracks `spinCount`; picks the scripted result grid (near-miss vs win) from the theme; stops reels left→right. | `kit/slotController.test.ts` (unit, TDD) |
| `kit/SlotReels.tsx` | The 2D cabinet — `ReelColumn × reelCount` of scrolling symbol strips that snap to the scripted row with a bounce. Theme-driven. | component test (snap + result) |
| `kit/useSlotDriver.ts` | Small `requestAnimationFrame` hook that advances `slotController` each frame and writes reel offsets (reels are DOM over the Canvas, so no `useFrame`). | covered via controller unit tests |
| `kit/useSlotScene.ts` | Parallels `useSpinScene`: wires `slotController` + `claimMachine` + `sound` + `haptics` + `navigate`, exposes the new `nearmiss` status and the retry handler. | exercised by e2e |
| `slots/book-of-ra/theme.ts` | `SlotTheme` + sound + copy + overlay vars + conversion (data only). | — |
| `slots/book-of-ra/TempleBackdrop.tsx` | R3F backdrop: sandstone pillars, torch glow, dust motes. | — |
| `slots/book-of-ra/BookOfRaScene.tsx` | Composes `<Canvas>` + backdrop + `Effects` + `CoinStorm` (on win) + `SlotReels` + `SpinOverlay`. | `tests/e2e/bookOfRa.spec.ts` |
| `slots/gates-of-olympus/theme.ts` | `SlotTheme` + sound + copy + overlay vars + conversion. | — |
| `slots/gates-of-olympus/OlympusBackdrop.tsx` | R3F backdrop: storm clouds, lightning flashes, godrays. | — |
| `slots/gates-of-olympus/GatesScene.tsx` | Composes `<Canvas>` + backdrop + `Effects` + `CoinStorm` + `SlotReels` + `SpinOverlay`. | `tests/e2e/gatesOfOlympus.spec.ts` |
| `app/prototypes/3d/book-of-ra/page.tsx` | `next/dynamic` `ssr:false` wrapper (like jackpot's page). | — |
| `app/prototypes/3d/gates-of-olympus/page.tsx` | Same. | — |

> New slot components live under `components/r3f/slots/<game>/` (parallel to
> `components/r3f/jackpot/` and `components/r3f/alchemy/`). The shared additions
> (`slotMath`, `slotController`, `SlotReels`, `useSlotDriver`, `useSlotScene`) live
> in `components/r3f/kit/`.

### Additive change to shared code (non-breaking for wheel landings)

- `types.ts`:
  - Add `SlotTheme` (see below).
  - Extend `OverlayCopy` with **optional** `retryLabel?: string` and
    `nearMissLine?: string`. Wheel landings omit these → behaviour unchanged.
- `SpinOverlay.tsx`: when `status === "nearmiss"`, render `copy.retryLabel`
  on the CTA (and `copy.nearMissLine` as a brief sub-line). `nearmiss` is a new
  `SpinStatus` value that the wheel controller never produces, so the wheel
  overlay path is untouched.

### `SlotTheme` (new type)

```ts
export type SlotSymbol = {
  id: string;          // "book", "explorer", "zeus", "A", ...
  label: string;       // accessible label
  glyph: string;       // emoji/text fallback OR sprite key
  color: string;       // tile tint
  isWin?: boolean;     // the scatter/win symbol
};

export type SlotTheme = {
  reels: number;                 // 5 (Book of Ra) | 6 (Gates)
  rows: number;                  // 3 (Book of Ra) | 5 (Gates)
  symbols: SlotSymbol[];         // the symbol set
  winSymbolId: string;           // "book" | "zeus"
  winCount: number;              // 3 (Book of Ra) | 4 (Gates) scatters needed
  winOnSpin: number;             // spin index that wins (default 2 = near-miss first)
  // Scripted result grids: arrays of symbol ids per reel (length === rows).
  nearMissGrid: string[][];      // winCount-1 scatters + 1 teasing just off
  winGrid: string[][];           // winCount+ scatters arranged for the celebration
  durationMs: number;            // full spin length (reduced-motion shortens)
  cabinet: {                     // cabinet frame styling tokens
    frame: string; glass: string; glow: string; accent: string;
  };
};
```

`slotController` consumes `nearMissGrid` on spins `< winOnSpin` and `winGrid` on
spin `winOnSpin`, so the script is fully **data-driven and deterministic**.

## State machine & user flow

```
idle ──(SPIN)──▶ spinning ──(reels stop, spin 1)──▶ nearmiss
nearmiss ──(retry / SPIN)──▶ spinning ──(reels stop, spin 2)──▶ won
won ──(1.1s)──▶ WinSheet: reveal ──▶ form ──▶ submitting ──▶ redirect
```

- CTA label by status: `idle`→`ctaLabel` ("SPIN") · `spinning`→`spinningLabel`
  ("SPINNING…") · `nearmiss`→`retryLabel` ("So close — try again!") .
- Reels stop **left → right, staggered** for tension; the last reel carries the
  near-miss tease / the winning symbol.
- `won` triggers `sound.win()` + `haptics.win()` + `CoinStorm`, then (after the
  same 1.1s as the wheel) the `claimMachine` opens the `WinSheet`.
- Replayable: dismissing the sheet resets to `idle`.

## Per-game detail

### Book of Ra style — `/prototypes/3d/book-of-ra`

- **Grid:** 5×3. **Win symbol:** Book (scatter), `winCount: 3`.
- **Symbols:** Book (win), Explorer, Pharaoh, Scarab, A, K, Q, J, 10.
- **Near-miss:** 2 Books land + a 3rd teases just above the middle reel.
- **Win:** 3 Books → Book "expands" with a golden temple-glow flourish + coin storm.
- **Backdrop:** sandstone pillars, flickering torch glow, drifting dust motes.
- **Palette:** warm gold / amber / sand on deep brown.
- **Copy:** heading e.g. "Unseal the Book of Riches"; prize "Book of Riches — 200 Free Spins".

### Gates of Olympus style — `/prototypes/3d/gates-of-olympus`

- **Grid:** 6×5. **Win symbol:** Zeus/lightning orb (scatter), `winCount: 4`.
- **Symbols:** Zeus orb (win), crown, hourglass, ring, chalice, + colored gems,
  plus a glowing multiplier orb.
- **Near-miss:** 3 scatters land + a 4th drops just below view.
- **Win:** 4+ scatters → Zeus lightning flash + big ×multiplier reveal + coin storm.
- **Backdrop:** storm-cloud sky, periodic lightning flashes, godrays.
- **Palette:** deep purple / blue + gold.
- **Copy:** heading e.g. "Summon the Gates of Olympus"; prize "Gates Bonus — 500 Free Spins + ×500".

## Reduced-motion, fallback & accessibility

- **Reduced motion:** short reel durations / instant snap, no parallax, the
  near-miss still occurs but fast, claim opens immediately (mirrors the wheel's
  reduced-motion path).
- **No WebGL:** skip the `<Canvas>` backdrop, render a CSS-gradient backdrop
  instead; the **reels + funnel keep working fully** because they're DOM. Reuse
  the `SceneFallback` styling approach for the backdrop region only.
- **Sound:** muted by default, toggle in overlay, pauses on tab-hide.
- **A11y:** reels expose accessible labels; CTA is a real `<button>` with
  status-driven label; `WinSheet` keeps its existing focus/dismiss behaviour.

## Testing

- **Unit (TDD):** `slotMath.test.ts` (strip order, eased offset, visible-symbols,
  stagger timings) and `slotController.test.ts` (near-miss on spin 1, win on spin
  `winOnSpin`, `spinCount`, reset/replay, status transitions incl. `nearmiss`).
- **Component:** `SlotReels` snaps to the scripted grid; `SpinOverlay` shows
  `retryLabel` when `status === "nearmiss"` and is unaffected when copy omits it.
- **E2E (Playwright):** one spec per route mirroring `jackpotVault3d.spec.ts`:
  load → SPIN → assert near-miss + "try again" CTA → SPIN → assert win → WinSheet
  visible → claim-open → fill field → submit → redirect. Force-click + generous
  timeouts to survive SwiftShader rAF starvation (same hardening as the wheel e2e).
- **Gallery:** add two cards to `public/prototypes/index.html`.
- **Regression guard:** full unit + `tsc` clean + existing e2e stay green (the
  wheel landings must be untouched by the additive `types.ts`/`SpinOverlay` change).

## Routing gotcha (carry-over)

`/prototypes/*` app routes only resolve because `middleware.ts`'s matcher
negative-lookahead already excludes `prototypes/`. The two new routes sit under
the same prefix, so no middleware change is needed.

## Open follow-ups (non-blocking, deferred)

- Sprite art: ship with emoji/text glyph fallbacks first; swap in real
  inspired-by symbol sprites later (kept behind the `glyph`/sprite-key field).
- Optional: generalize `useSpinScene` + `useSlotScene` to share the
  claim/sound/haptics plumbing once both are stable (avoid destabilizing the
  wheel landings during this work).
- Per-theme countdown `storageKey` (the existing landings share one key across a
  session — same known issue, carry the per-theme fix here too).
