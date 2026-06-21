# Jackpot Boom Vault — 3D Flagship Landing Design Spec

**Date:** 2026-06-22
**Status:** Approved (design), pending spec review
**Supersedes (for this landing):** the static `public/prototypes/boomzino-jackpot-vault.html` mockup

## Goal

Rebuild the "Jackpot Boom Vault" Boomzino landing as a **mindblowing, real-time 3D
React experience** using the modern iGaming WebGL stack — not static HTML. One flagship
landing, fully polished. It stays a **design mockup** (scripted demo spin, no DB/prize
logic/admin wiring), but is now a real Next.js client route with a WebGL scene.

## Scope

### In scope
- New Next.js client route `app/prototypes/3d/jackpot-vault/page.tsx` rendering a
  React Three Fiber (R3F) scene via `next/dynamic(..., { ssr: false })`.
- A procedural 3D spin wheel, vault environment, neon "777"/sunburst, postprocessing
  bloom, a scripted spin that lands on JACKPOT, a Rapier physics coin-storm on win,
  Howler sound (muted by default + toggle), and cursor/gyro parallax.
- A DOM overlay (logo, "BOOM your luck", 777, SPIN CTA, win modal + Claim, sound toggle).
- Replace the **Jackpot** static HTML: delete `public/prototypes/boomzino-jackpot-vault.html`
  and its Playwright Jackpot test; update the gallery to feature the 3D route.
- Keep `public/prototypes/boomzino-alchemy-lab.html` (+ its tests) untouched — its 3D
  version is a separate round-2 effort.
- Add deps: `three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/postprocessing`, `@react-three/rapier`, `howler` (+ dev `@types/three`,
  `@types/howler`).

### Out of scope (explicit follow-ups)
- The Alchemy Lab 3D version (round 2).
- Any DB/`Landing`-model/admin/template-selection wiring.
- Licensed 3D character/coin models — geometry is procedural.
- Real prize logic — the wheel deterministically lands on JACKPOT (index 7).

## Tech stack & rationale

- **React 19 + Next 15.1** (already in repo) → **@react-three/fiber v9** (requires React 19).
- **@react-three/drei** — `Environment` + `Lightformer` (procedural studio lighting, **no
  external HDRI** so it works offline), `Float`, `Sparkles`, `Text`, `PerformanceMonitor`,
  `AdaptiveDpr`, `Html` if needed.
- **@react-three/postprocessing** — `EffectComposer` with `Bloom`, `Vignette`,
  `ChromaticAberration`, `SMAA` for the neon-casino glow.
- **@react-three/rapier** — rigid-body physics for the coin storm.
- **howler** — sound, muted by default behind a toggle (autoplay policy).
- Spin easing: a hand-written `useFrame` tween (no spring dep) for an exact JACKPOT landing.

## Architecture

R3F is client/WebGL only; it cannot server-render. The route page is a thin client
component that dynamically imports the scene with SSR disabled:

```
app/prototypes/3d/jackpot-vault/page.tsx   ("use client"; dynamic(..., {ssr:false}) + loader)
components/r3f/
  JackpotVaultScene.tsx   <Canvas> + lights + Environment(Lightformers) + scene + Effects
                          + the DOM overlay; owns spin state via useSpin
  Wheel3D.tsx             parametric beveled metal disc, 8 emissive segments + labels,
                          gold bulb rim + pointer; consumes a rotation value
  CoinStorm.tsx           Rapier <Physics>; on `won`, spawns ~120 instanced rigid-body coins
  NeonSign.tsx            "777" neon + rotating gold sunburst behind the wheel
  Effects.tsx            <EffectComposer> Bloom + Vignette + ChromaticAberration + SMAA
  Parallax.tsx           tilts a group/camera from pointer + deviceorientation
  useSpin.ts             state machine: idle | spinning | won; computes the target
                          rotation that lands `winningIndex` under the top pointer;
                          exposes { status, rotation, spin() }; triggers sound + coins
  sound.ts               Howler wrapper: tick / win / ambient; muted default; setMuted()
components/r3f/JackpotVaultOverlay.tsx  DOM UI over the canvas (logo, headline, 777,
                          SPIN CTA, win modal + Claim, sound toggle); Boomzino palette
                          via a CSS module
```

### Data flow
- `useSpin` holds `status` and a numeric `rotation` (degrees). `Wheel3D` reads `rotation`.
- `spin()` (from the SPIN CTA or wheel click): `idle → spinning`, starts a `useFrame`
  tween from current rotation to `targetRotation`, plays tick sound; on tween completion
  → `won`, plays win sound, mounts `CoinStorm`, reveals the DOM win modal.
- The landing math mirrors the existing demo: 8 segments, `winningIndex = 7` (JACKPOT)
  centered under the top pointer; conic/segment layout so segment 7 ends at the pointer.

### Wheel content (illustrative, matches prior mockups)
8 segments: `€5, 50 FS, €10, 100 FS, €20, 200 FS, 50% Bonus, JACKPOT` — demo lands on JACKPOT.

## Performance & accessibility
- Clamp `dpr={[1, 2]}`; drei `<PerformanceMonitor>` lowers quality (and `<AdaptiveDpr>`)
  if FPS drops; reduce coin count and disable chromatic aberration on small/mobile screens.
- `prefers-reduced-motion: reduce`: skip idle `Float`/sparkle motion and shorten the spin
  to a near-instant settle — the win state still resolves (parity with the static mockups).
- Lazy-load the scene (dynamic import) with a themed loading state so the route's initial
  paint isn't blocked on WebGL.
- Sound is **off by default**; first unmute is a user gesture (toggle), satisfying autoplay
  policy. No audio autoplays.

## Testing

- **Unit (vitest)** — `useSpin` is pure logic and fully tested: `spin()` transitions
  `idle → spinning → won`; the computed target rotation lands `winningIndex` (7) under the
  pointer (assert `((targetDeg + offset) mod 360)` resolves to segment 7's center); a second
  `spin()` while `spinning` is a no-op.
- **Playwright smoke** — route returns 200; a `<canvas>` element mounts (WebGL boots under
  headless Chromium/SwiftShader); the DOM overlay shows the heading and the SPIN button and
  the sound toggle; clicking SPIN reaches the `data-testid="win-modal"` within timeout; no
  console errors. Test hooks: `data-testid` on `spin-button`, `win-modal`, `sound-toggle`.
- **Screenshot checkpoints** — capture the route (idle + post-spin) at desktop and mobile
  viewports for visual review; WebGL visual quality is judged from these (the prior build's
  screenshot review caught real defects, so this is a required review gate, not optional).
- The existing unit + Alchemy-Lab prototype tests must remain green.

## Verification / success criteria
1. `/prototypes/3d/jackpot-vault` renders a live WebGL scene: 3D wheel, vault lighting,
   bloom glow, neon 777/sunburst, parallax.
2. Pressing SPIN spins the 3D wheel, lands JACKPOT, erupts a physics coin storm, and shows
   the win modal; sound works once unmuted.
3. It reads unmistakably as the Boomzino gold/emerald casino brand and looks premium.
4. `useSpin` unit tests + the Playwright smoke pass; existing tests stay green; `next build`
   succeeds.
5. The Jackpot static HTML is removed and the gallery points to the 3D route; Alchemy Lab
   HTML still works.
