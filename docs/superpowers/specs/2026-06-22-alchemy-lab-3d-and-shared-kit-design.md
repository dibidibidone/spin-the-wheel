# Alchemy Lab 3D + Shared R3F Kit — Design Spec

**Date:** 2026-06-22
**Status:** Approved (design), pending spec review
**Builds on:** the merged 3D Jackpot Vault flagship
(`docs/superpowers/specs/2026-06-22-jackpot-vault-3d-flagship-design.md`)
**Supersedes (for this landing):** the static `public/prototypes/boomzino-alchemy-lab.html`

## Goal

Rebuild the "Alchemy Lab" Boomzino landing as a real-time 3D React/WebGL experience
matching the Jackpot Vault's richness (lots of 3D, animation, physics, sound), with its
own alchemy identity. To avoid duplicating the wheel/scene/sound logic across two
landings, first **extract a small shared R3F kit** from the merged Jackpot Vault code,
then build both landings as thin themed scenes on top of it.

Still a design mockup (scripted demo spin landing on JACKPOT; no DB/admin wiring).

## Scope

### In scope
1. **Shared kit** under `components/r3f/kit/`: move the already-generic pieces
   (`spinMath`, `spinController`, `useReducedMotion`, `Effects`, `CoinStorm`) and make
   the wheel + sound + scene plumbing themeable:
   - `Wheel3D` parametrized by props (labels, segment colors, accent/gold indices,
     jackpot index, rim/label colors, radius).
   - `createSound(config)` so each landing supplies its own tick/win/ambient tones.
   - `CoinStorm` accepts coin color + count.
   - A `SpinScene` shell + hooks (`SpinDriver`, `Parallax`, and the status/`modalOpen`/
     sound wiring) shared by both scenes.
   - A themeable `SpinOverlay` (logo, headline, sub-banner slot, CTA label, win
     title/prize/claim) driven by props + CSS custom properties.
2. **Jackpot Vault** refactored onto the kit (`components/r3f/jackpot/`: theme config +
   `NeonSign`), route unchanged at `/prototypes/3d/jackpot-vault`. Its existing tests
   must stay green — they are the regression guard for the refactor.
3. **Alchemy Lab** (`components/r3f/alchemy/`): theme config + unique elements —
   `Cauldron` (boiling surface + rising bubble particles + green glow + steam),
   `PotionBottle` (×2 flanking; glowing liquid + rising bubbles + idle sway),
   `LabBackdrop` (floating beakers/glassware + green haze). New route
   `app/prototypes/3d/alchemy-lab/page.tsx` (client, `dynamic ssr:false`).
4. **Win = potion eruption + gold coins:** a green energy-ring + bubble burst from the
   cauldron, then the kit `CoinStorm` (gold) rains and piles; win modal fades in.
5. **Retire** `public/prototypes/boomzino-alchemy-lab.html` and its Playwright tests;
   point the gallery's Alchemy card to `/prototypes/3d/alchemy-lab`. Both landings are
   now 3D.

### Out of scope (explicit follow-ups)
- Any DB/`Landing`-model/admin/template wiring.
- Licensed mascot/character/3D models — everything is procedural primitives + shaders.
- New gameplay/prize logic — the wheel deterministically lands on JACKPOT (index 7).
- Audio asset files — sound stays runtime-generated WAV tones via Howler.

## Tech stack
Unchanged from the Jackpot build: React 19 / Next 15.1, `three@0.184`,
`@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`, `@react-three/postprocessing@3.0.4`,
`@react-three/rapier@2.2.0`, `howler@2.2.4`. Vitest + Playwright.

## Architecture

```
components/r3f/
  kit/
    spinMath.ts, spinController.ts            (moved as-is; tests move too)
    useReducedMotion.ts
    Effects.tsx                               (generic; chromatic prop)
    CoinStorm.tsx                             (props: count, color)
    Wheel3D.tsx                               (props: labels[], segmentColors[],
                                               goldIndices[], jackpotIndex, rimColor,
                                               labelColor, radius)
    sound.ts                                  (createSound(config) -> {tick,win,setMuted,muted})
    SpinScene.tsx                             (Canvas shell: lights/env slots, SpinDriver,
                                               Parallax, Effects, overlay mount, status +
                                               modalOpen + sound wiring via a useSpinScene hook)
    SpinOverlay.tsx + spinOverlay.module.css  (themeable via props + CSS vars)
    types.ts                                  (Theme/scene prop types)
  jackpot/
    theme.ts                                  (palette, labels, sound config, copy)
    NeonSign.tsx                              (jackpot-only)
    JackpotVaultScene.tsx                     (composes kit + NeonSign)
  alchemy/
    theme.ts                                  (palette, labels, sound config, copy)
    Cauldron.tsx, PotionBottle.tsx, LabBackdrop.tsx
    AlchemyLabScene.tsx                       (composes kit + alchemy elements)
app/prototypes/3d/jackpot-vault/page.tsx       (unchanged route; import path may update)
app/prototypes/3d/alchemy-lab/page.tsx         (NEW; dynamic ssr:false + loader)
```

### Data flow (shared)
`useSpinScene({ winningIndex, reduced, sound })` owns: `status` (idle|spinning|won),
`modalOpen` (delayed reveal), `muted`, a `rotationRef`, and `onSpin/onToggleSound`. The
in-Canvas `SpinDriver` advances `spinController` each frame, writes `rotationRef`, and
reports status transitions (triggering sound + the coin storm). The themed `Wheel3D`
reads `rotationRef`; the DOM `SpinOverlay` reads `status/modalOpen/muted`. Identical for
both landings — only the theme config and the surrounding 3D elements differ.

## Alchemy palette
bg `#0A1A14`, glow `#16403A`, emerald `#15564A` / inset `#0F3B33`, toxic-green
`#5BE36A`→`#8BFF5A`, gold `#F5C24B` / `#FFD24A`, red `#E2483D`, cream `#F4F1E8`,
text `#EAF6EE`, muted `#8FB9AD`.

## Wheel (Alchemy theme, illustrative)
Same 8 segments / labels as the brand: `€5, 50 FS, €10, 100 FS, €20, 200 FS, 50% Bonus,
JACKPOT` (lands JACKPOT = index 7). Segments alternate emerald `#15564A` / bright gold
`#FFD24A`, JACKPOT red; emerald-gold rim with glowing bulbs. The wheel sits above the
cauldron.

## Animation (Alchemy)
- **Cauldron:** boiling top surface (animated vertex displacement or scrolling
  normal/emissive), continuously rising **bubble particles** (instanced spheres that rise
  and fade/pop), additive green volumetric glow, slow drifting steam.
- **Potion bottles (×2):** emissive green liquid with rising interior bubbles; gentle
  idle sway/bob.
- **Lab backdrop:** beakers/flasks/glassware slowly bobbing + rotating in a hazy green
  depth; drifting green motes (Sparkles).
- **Wheel:** idle Float + the shared eased spin.
- **Win:** an expanding emissive green energy ring + bubble burst from the cauldron, then
  the gold `CoinStorm`; win modal fades in over the still-visible scene.
- Postprocessing bloom/vignette/chromatic-aberration; cursor + `deviceorientation`
  parallax; `prefers-reduced-motion` collapses idle motion and shortens the spin (win
  still resolves); adaptive DPR + reduced particle/coin counts on small screens.

## Sound (Alchemy theme)
Via `kit/createSound(config)`: spin **tick** = a short bubble "blip"; **win** = an
ascending magical shimmer/chime; optional soft boiling **ambient**. Runtime-generated WAV
data-URIs (offline-safe), **muted by default**, unmuted via the overlay toggle (autoplay
policy). Jackpot keeps its own tone config; only the config differs.

## Testing
- **Regression guard:** the existing Jackpot Vault Playwright smokes (boot + reduced-motion
  spin-to-win) and the `spinMath`/`spinController` unit tests must stay green after the kit
  refactor (paths update to `kit/`). This proves the refactor preserved behavior.
- **Alchemy Playwright smoke** (`tests/e2e/alchemyLab3d.spec.ts`): route 200, a `<canvas>`
  mounts, no `pageerror`; under `reducedMotion: "reduce"`, clicking `data-testid=spin-button`
  reveals `data-testid=win-modal`; `data-testid=sound-toggle` present. Shared test hooks
  come from `SpinOverlay`.
- **Screenshot checkpoints** for the alchemy scene (idle + win) — the visual gate, as in
  the Jackpot build.
- Any new pure helper (e.g., a bubble-spawn distribution function) gets a small vitest test;
  shader/particle visuals are judged from screenshots.
- Retiring the Alchemy static HTML removes its block from `tests/e2e/prototypes.spec.ts`
  (the gallery test remains).

## Success criteria
1. `/prototypes/3d/alchemy-lab` renders a live WebGL alchemy scene: emerald 3D wheel above
   a bubbling cauldron, flanking potion bottles, floating glassware, green glow + bloom,
   parallax.
2. SPIN spins the 3D wheel, lands JACKPOT, triggers the green potion eruption + gold coin
   storm, and shows the win modal; themed sound works once unmuted.
3. It reads unmistakably as the Boomzino alchemy-lab brand and looks premium — clearly a
   sibling of, but visually distinct from, the gold Jackpot Vault.
4. The shared kit is in place; Jackpot Vault still works with all its tests green; the
   Alchemy smoke + unit tests pass; `next build` succeeds.
5. The Alchemy static HTML is retired and the gallery points both cards to 3D routes.
