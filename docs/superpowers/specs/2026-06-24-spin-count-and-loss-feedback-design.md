# Design: Spin-count fused to the button + red loss-burst

- **Date:** 2026-06-24
- **Status:** Approved (brainstorming) — pending implementation plan
- **Branch context:** `feat/igaming-visual-polish`
- **Builds on:** the spins-left counter (commit `7478893`) and the win `WinBurst` (gold flash + confetti + coin rain).

## 1. Summary

Two UX upgrades to the spin flow, on all 5 landings (2D wheel, 2 3D wheels, 2 slots):

1. **Spin count fused to the button.** The "N spins left to win" indicator stops being a small
   floating pill and becomes a **bold gold bar welded to the top of the SPIN button**, so the
   count and the button read as one stacked control and the number is unmissable.
2. **Loss burst.** Every non-winning (near-miss) spin fires a **red screen flash + a brief
   whole-scene shake + a popping "Almost!" text** — the red mirror of the gold win celebration.

## 2. Decisions (resolved in brainstorming)

- Count placement: **big gold bar fused above the button** (not a corner badge or in-button second line).
- Loss effect: **red flash + whole-scene shake + the Almost text** (~0.6s), not a sustained red wash.
- The loss text **reuses each landing's existing "Almost text"** (the `almostText` field edited in the
  Content tab) so it stays editable per landing.
- The shake moves the **whole scene** (the WebGL canvas + the UI), not just the overlay.
- No reward particles on a loss — coins/confetti are the win's alone; the contrast (gold+coins = win,
  red+shake = miss) is intentional.

## 3. Spin count fused to the button

`components/r3f/kit/SpinOverlay.tsx` + `spinOverlay.module.css` (the 3D wheels + slots share this):

- Restyle the existing `.spinsLeft` element into a **full-width bar** matching the button's width,
  flush on top of the `.cta` (shared rounded top corners; the bar's bottom edge and the button's top
  edge meet with no gap). Bigger, bolder number/label than today.
- When the bar is shown, the `.cta`'s **top corners square off** so the two pieces look fused.
- Copy: `🎯 {n} {n === 1 ? "SPIN" : "SPINS"} LEFT`.
- Visibility unchanged: shown when `status` is `idle` or `nearmiss`; hidden while `spinning` and on `won`.

`app/[domain]/Wheel.client.tsx` + `app/globals.css` (the 2D wheel):

- The 2D spin button is a small round `⟳` icon. Apply the **same bold gold bar styling** to the
  existing `.spins-left` element, positioned snug directly above the `⟳` button (a true weld isn't
  meaningful on a round icon, so "fused" = flush above it).

## 4. Loss burst (red flash + shake)

New `components/r3f/kit/LossBurst.tsx` + `lossBurst.module.css`, mirroring `WinBurst`:

- A **red radial flash** (`mix-blend-mode` light burst in red, like the gold win flash) + a centered
  **"{almostText}"** line that pops (scale/opacity), as a one-shot ~0.6s animation.
- `position: fixed; inset: 0; pointer-events: none;` and **`@media (prefers-reduced-motion: reduce) { display: none }`** (same discipline as `WinBurst`).
- Props: `LossBurst({ text }: { text: string })` — `text` is the landing's `almostText` (overlay
  `copy.nearMissLine`/`almostText`, or the 2D `landing.texts.almostText`).
- No win sheet exists during a near-miss, so there is **no backdrop-filter scrim to fight** — a normal
  overlay-level z-index suffices (no need for the `z-index: 60` the win coins required).

**Whole-scene shake:** a shared `shake` keyframe (small translate/rotate jitter, ~0.5s, once) applied
to each scene's **root** element while `status === "nearmiss"` (the 2D uses `"almost"`):

- 3D wheels: add the shake class to the `shell.shell` root (`sceneShell.module.css` houses the keyframe,
  or a small shared `shake.module.css`).
- Slots: add the shake class to the slot scene's root `<div>`.
- 2D: add the shake class to the landing root (`<main className="landing">` or the wheel stage).
- The class is applied conditionally on the loss status, so the one-shot animation re-triggers each time
  the scene re-enters the near-miss state (spinning → nearmiss toggles the class off → on).

## 5. Where it renders (all 5)

- Add `almostText?: string` to `OverlayCopy`; `buildSceneConfig` sets it from `view.texts.almostText`.
  `SpinOverlay` renders `{status === "nearmiss" && <LossBurst text={copy.almostText ?? ""} />}`. This
  covers the **2 3D wheels + 2 slots**.
- `WheelClient` (2D) renders `<LossBurst text={landing.texts.almostText} />` when `status === "almost"`,
  and toggles the shake class on its root. `LossBurst` is pure DOM, importable into the 2D landing like
  `IosInstallHint`/`usePwaInstall` already are.

## 6. Non-goals

- No change to the win celebration (gold flash + confetti + coin rain stay as-is).
- No new admin fields — the loss text reuses the existing `almostText`.
- No sound change for the loss (the near-miss already plays a tick via `onStatus`).
- No haptics change beyond what near-miss already triggers.

## 7. Testing

- **Unit/component:**
  - `SpinOverlay` renders `LossBurst` (testid `loss-burst`) only when `status === "nearmiss"`, never on
    idle/spinning/won; and the fused count bar renders with the right text + singular/plural.
  - `LossBurst` renders the provided `almostText`.
  - `buildSceneConfig` maps `view.texts.almostText` into `copy.almostText`.
  - 2D `WheelClient` shows the loss burst on `"almost"` and not otherwise.
- **Manual/visual:** screenshot a near-miss on a 3D wheel + a slot to confirm the red flash + shake read
  (the gold count bar is also visible idle); confirm reduced-motion hides both bursts.

## 8. File touch-list (orientation)

- Create: `components/r3f/kit/LossBurst.tsx`, `components/r3f/kit/lossBurst.module.css`, a shared `shake`
  keyframe (`components/r3f/kit/shake.module.css` or folded into `sceneShell.module.css`).
- Modify: `components/r3f/kit/SpinOverlay.tsx` + `spinOverlay.module.css` (fused bar + LossBurst render),
  `components/r3f/kit/types.ts` (`OverlayCopy.almostText`), `lib/sceneConfig.ts` (map almostText),
  the 4 scenes (shake class on root), `app/[domain]/Wheel.client.tsx` + `app/globals.css` (2D bar + loss
  burst + shake).
- Tests alongside.
