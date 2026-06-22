# Mobile i-Gaming Optimization — Jackpot Vault & Alchemy Lab 3D Landings

**Date:** 2026-06-22
**Status:** Approved (brainstorm) — ready for implementation plan
**Scope:** Mobile (portrait-first) optimization of the two 3D landing routes
(`app/prototypes/3d/jackpot-vault`, `app/prototypes/3d/alchemy-lab`) for a
modern, immersive i-gaming feel that converts.

## Goal

Turn the two 3D spin landings into mobile-first, conversion-driving experiences:
cinematic immersive idle → spin → win → **Claim → register/deposit** funnel, with
the i-gaming accelerants (urgency, social proof, trust, haptics) that lift claim
rates. Desktop behaviour must remain unchanged.

## Why now (the gap)

The existing specs only treat mobile as a *performance* concern (coin count,
chromatic aberration, screenshot checkpoints). There is no mobile **layout/UX**
design. Concrete consequences in the current build:

- **Wheel clips on portrait.** Camera is `position:[0,*,7] fov:42` (vertical FOV)
  and the wheel radius is `2.1`. On a 390×844 phone the visible horizontal
  half-width is ~`1.24` units, so the wheel's left/right edges are cut off.
- The shared `SpinOverlay` uses fixed pixel offsets (`hero top:60px`,
  `cta bottom:42px`), **no `@media`, no `env(safe-area-inset-*)`** — hero/CTA can
  crowd the wheel and the CTA can sit under the iOS home indicator.
- The `deviceorientation` parallax listener is added unconditionally but
  **silently no-ops on iOS 13+** (needs `requestPermission()` after a gesture).
- The win modal's `Claim` is a no-op (`onClaim={() => {}}`) — no conversion funnel.

## Decisions (from brainstorm)

| Question | Decision |
| --- | --- |
| Conversion goal | **Claim → register/deposit** (win is the hook, CTA is the conversion) |
| Mobile layout | **Hybrid**: full-bleed immersive 3D idle → frosted **bottom sheet** on win |
| Claim action | **Inline mini-register** (one smart field, email/phone) → redirect; lead captured before redirect |
| Accelerants | **All four**: urgency countdown, live social proof, trust & compliance, haptics & micro-feel |

## Architecture — evolve the shared kit, don't fork the pages

Both routes already render through one `SpinOverlay` + `useSpinScene` kit themed
via `theme.ts`. Keep that single shared system and make it **responsive**; the two
page files stay one-liners. Per-page difference is **data only**.

New / changed kit units (each small, single-purpose, independently testable):

- `SpinOverlay.tsx` → responsive overlay: idle hero + sticky CTA + idle accelerant
  lines. Hosts `<WinSheet>`.
- `WinSheet.tsx` — the bottom sheet + claim state machine UI.
- `Countdown.tsx` — urgency timer + draining bar.
- `SocialProof.tsx` — rotating winner ticker.
- `TrustBar.tsx` — 18+/secure/responsible line.
- `haptics.ts` — `navigator.vibrate` wrapper, reduced-motion gated.
- `useResponsiveCamera.ts` — fits the wheel to the narrow axis per aspect.
- New themed type **`ConversionConfig`** carries everything copy lacks today:
  concrete prize string, register field type (`email | tel`), CTA labels, urgency
  duration, redirect URL + tracking params, seeded social-proof data, trust/legal
  text. `jackpotCopy` / `alchemyCopy` extended; sensible shared defaults.

## Mobile layout & camera framing

**Responsive camera** (`useResponsiveCamera`): derive camera distance from viewport
aspect so the wheel's full diameter fits the **narrower** axis plus margin; bias
slightly upward on portrait so the bottom ~30% stays clear for the CTA/sheet.
Recompute on resize / orientation change. Fixes the portrait clipping.

**Idle (portrait):**
- Top bar (logo + sound) below the notch via `env(safe-area-inset-top)`.
- Hero `h1`/subtitle pinned top; keep existing `clamp()`, add safe-area + tighter
  line-height on small screens.
- 3D wheel auto-framed, full-bleed, gentle float (unchanged).
- **Sticky CTA** bottom-pinned with `max(env(safe-area-inset-bottom), 16px)`,
  ≥56px tap height; subtle pre-spin urgency micro-line above it.

**Win:** the 3D scene dims/blurs slightly (celebration still visible behind) and
`WinSheet` slides up — frosted, rounded top, drag-to-dismiss affordance, content
sized to fit a 667px-tall screen without scrolling.

All `@media (max-width / orientation)` + safe-area driven. Desktop unchanged.
Landscape phone: sheet degrades to a centered card.

## Conversion flow: win → sheet → inline register → redirect

A `claimStep` added to `useSpinScene`, layered on existing
`status (idle → spinning → won)`:

1. **reveal** (auto, ~1.1s after stop — reuses existing `modalOpen` timer): emoji +
   `winTitle` + concrete **prize** (from `ConversionConfig`, not the generic
   `"JACKPOT!"`), live countdown, primary CTA **"Claim my bonus →"**, trust line
   pinned at sheet bottom.
2. **form**: Claim expands the sheet to one smart field — `type` email/tel per
   theme with correct `inputmode`/`autocomplete`/`enterkeyhint="go"`; auto-focus;
   sheet lifts above the keyboard (visual-viewport / `env(keyboard-inset-height)`)
   so the CTA never hides. Inline validation, no layout shift.
3. **submitting**: button spinner + haptic confirm.
4. **redirect**: payload (captured value + prize) POSTed to a **stubbed**
   `onClaim(payload)` first (prototypes — network wired later), so the **lead is
   captured before** `window.location.assign(redirectUrl + tracking)`.

Empty field is **not a hard gate** — empty just skips capture and redirects (never
kill conversion). Reduced-motion: sheet appears without slide animation.

## Accelerants (all read from per-theme `ConversionConfig`)

- **Urgency countdown** (`Countdown.tsx`): `mm:ss` + thin draining bar; duration
  from config; seeded from `Date.now()` and persisted in `sessionStorage` (reload
  doesn't reset to a suspiciously round number). At zero, swap to "Last chance!" —
  never disable the CTA. Subtle pre-spin line; prominent in the sheet.
- **Live social proof** (`SocialProof.tsx`): one-line rotating ticker
  ("🔥 Aisha won €200 · 2m ago") + "2,481 players won today". Seeded plausible
  generator in config now, swappable for a real feed later. Pauses offscreen;
  reduced-motion → single static line, no auto-rotate.
- **Trust & compliance** (`TrustBar.tsx`): low-key line
  `🔞 18+ · 🔒 Secure · Play responsibly · T&Cs apply`. On idle (above CTA) and in
  the sheet. Text from config for per-brand/jurisdiction wording.
- **Haptics & micro-feel** (`haptics.ts`): `navigator.vibrate` — light on spin
  start, faint ticks during spin, strong pattern on win, confirm tap on claim.
  No-ops where unsupported (iOS Safari); **fully gated by reduced-motion**. Paired
  with CSS `:active` press states on every button.

## Performance & motion

Baseline already good (`AdaptiveDpr`, `PerformanceMonitor`, `dpr [1,2]`, AA off,
chromatic + reduced coin count on small screens). Add:

- **Fix parallax**: on touch devices drop tilt parallax (avoid the iOS permission
  prompt mid-funnel) and use a subtle touch-drag nudge; keep pointer parallax on
  desktop. Removes the dead/jarring code path.
- **WebGL fallback**: if the canvas fails / WebGL unavailable, render a static
  themed hero + CTA so the page still converts (no blank screen).
- **Battery/visibility**: pause sound and throttle the render loop on
  `document.hidden`.
- **Touch hardening**: `touch-action`/`overscroll-behavior` so the canvas doesn't
  hijack scroll; no double-tap zoom on buttons; all targets ≥44px.
- Keep `Sparkles`/`Float` off under reduced-motion; trim `Sparkles` count on mobile.

## Per-theme differences (data, not code)

Shared kit code throughout. Jackpot vs Alchemy differ only via `ConversionConfig`
+ existing `OverlayVars`: copy/prize wording, urgency duration, redirect URL,
register field type, social-proof flavor, trust/legal line. Colors already flow
through `OverlayVars` (gold/red vault vs green lab), so sheet, countdown bar and
CTA theme themselves. A future third themed page = one more config.

## Testing & verification

- **Unit (Vitest)**, alongside existing `spinMath`/`spinController` tests:
  countdown format + `sessionStorage` persistence + zero-state; seeded
  social-proof generator (deterministic); `claimStep` machine
  (`reveal→form→submitting→redirect`); `useResponsiveCamera` math (wheel fits the
  narrow axis with margin for given aspect/radius).
- **E2E (Playwright, `tests/e2e`)** with `iPhone 12` / `Pixel 5` descriptors,
  portrait **and** landscape: wheel not clipped + CTA visible above safe area; spin
  → sheet slides up; Claim → field focuses with correct `inputmode`; claim payload
  hits the stub before redirect; reduced-motion renders without animation; tap
  targets ≥44px.
- **Screenshot checkpoints** (already mandated): idle + post-win at mobile
  portrait, landscape, desktop, both routes.
- Final pass with the `verify`/`run` skill: drive the real app at a mobile
  viewport through the full funnel.

## Out of scope

- Real registration backend / operator integration (claim handler is stubbed;
  payload contract defined so it can be wired later).
- New 3D assets or scene geometry beyond framing/perf changes.
- Admin/CMS wiring of these conversion fields (config lives in `theme.ts` for now).
- A third themed landing (architecture supports it; not built here).
