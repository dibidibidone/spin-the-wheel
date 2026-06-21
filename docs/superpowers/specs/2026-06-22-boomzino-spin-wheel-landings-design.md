# Boomzino Spin-the-Wheel Landings — Design Spec

**Date:** 2026-06-22
**Status:** Approved (design), pending spec review

## Goal

Produce **two brand-new, fully-animated spin-the-wheel landing page mockups** in the
authentic **Boomzino alchemy-casino** visual style. These are design mockups generated
**from scratch** — they deliberately share **nothing** with the current production
landing template (`components/landing/LandingScene.tsx` + `app/globals.css`).

The deliverable is **static HTML/CSS (+ JS for animation) mockups for review**, generated
via the **Stitch MCP** server. No database, no real spin/redirect logic, and no admin
wiring at this stage. Integration into the live app is an explicit follow-up.

## Scope

### In scope
- A shared **Boomzino design system** (palette, type, motion language) defined for Stitch.
- **Landing A — "The Alchemy Lab"**: mascot-flanked emerald wheel, lab/potion theme.
- **Landing B — "Jackpot Boom Vault"**: gold-forward treasure wheel, coin shower, no characters.
- Both delivered as standalone files under `public/prototypes/` so they are viewable at
  `/prototypes/<name>.html` via `next dev` **and** openable directly as files.
- Animation baked into each mockup (CSS/JS): floating coins, bubbling potion, glow pulse,
  light-ray sweep behind the wheel, a demo wheel-spin, and a confetti/coin burst on "win".

### Out of scope (explicit follow-up work)
- Adding a `template` field to the `Landing` model or any DB/Prisma change.
- Wiring the designs into `getLandingByHost` / `LandingScene` / the admin template picker.
- Real spin controller (`useSpinController`), weighted prize logic, or redirect handling.
- Replacing the existing `boomzino-demo` seed or touching today's template.
- Producing final licensed mascot/character artwork.

## Design language (shared) — "Boomzino alchemy casino"

Derived from the official Boomzino brand reference (mad-science lab: glowing green potions,
gold treasure, alchemist mascots, coins erupting from a slot machine).

**Palette**
| Token        | Hex        | Use |
|--------------|------------|-----|
| `bg`         | `#0C1F1C`  | deep teal-charcoal page background |
| `bg-glow`    | `#16403A`  | radial emerald glow behind the hero |
| `surface`    | `#15564A`  | machine / card surfaces (jade) |
| `surface-deep`| `#0F3B33` | inset panels |
| `gold`       | `#F5C24B`  | logo, trim, primary CTA |
| `gold-bright`| `#FFD56A`  | coin highlights, hover |
| `lab-green`  | `#5BE36A`  | potion/energy glow (toxic green) |
| `lab-green-hot`| `#8BFF5A`| brightest energy / win flash |
| `red`        | `#E2483D`  | 777 / alert pops |
| `cream`      | `#F4F1E8`  | lab coats, light highlights |
| `text`       | `#EAF6EE`  | primary text |
| `muted`      | `#8FB9AD`  | secondary text |

**Typography**
- Display / logo / headline: chunky rounded gold display (e.g. a bold rounded grotesque),
  gold fill with a subtle outer glow.
- Body / labels: clean geometric sans (the app already loads **Outfit** — reuse for body).

**Motifs:** potion flasks with bubbling liquid + rising smoke, gold coin + dollar-bill
showers, chemistry bubbles, slot `777`, green "boom" energy bursts, sparkles.

**Motion language (applies to both pages)**
- Idle: floating gold coins drifting upward with parallax; potion liquid bubbling; soft
  glow pulse on green energy elements; slow light-ray rotation behind the wheel.
- Interaction: pressing **SPIN** triggers a 4–5s eased wheel rotation
  (`cubic-bezier(0.16, 1, 0.3, 1)`), a light-ray sweep, then a **confetti + coin burst**
  and a "You won …" celebration state. This is a self-contained demo (no real prize logic).
- Honor `prefers-reduced-motion`: animations degrade to static/opacity-only.

**Responsive target:** mobile-first, ~390–430px primary column (matches today's
`max-width: 430px` landing), gracefully centered on desktop with the ambient glow filling
the viewport.

**Wheel content (both, illustrative):** reuse the existing `boomzino-demo` seed's 8-segment
prize set so the mockups feel real — `€5`, `50 FS`, `€10`, `100 FS`, `€20`, `200 FS`,
`50% Bonus`, `JACKPOT` (the demo "win" lands on `JACKPOT`). These labels are placeholders
for the mockup, not wired prize logic.

**Art constraint (honest):** Stitch evokes the Boomzino world with CSS/SVG + placeholder
art. It will **not** reproduce Boomzino's exact licensed mascot illustrations — character
slots use styled placeholders/silhouettes that real art can drop into later.

## Landing A — "The Alchemy Lab"

The hero composition from the reference: two alchemist mascots flanking a glowing wheel.

**Layout (top → bottom)**
1. Top bar: small `‹ Back` chip (visual only) + **BOOMZINO** gold logo.
2. Hero copy: headline "Spin the Wheel" + subtitle "and win bonuses".
3. Stage:
   - Left + right **alchemist mascot** placeholders, each holding a bubbling green potion
     (rising-bubble animation, green glow).
   - Center **emerald spin wheel** (segmented, gold rim with light-bulbs, gold pointer),
     gold coins erupting from the hub on spin.
   - Background: faint lab shelves / beakers + drifting chemistry bubbles.
4. Big **gold SPIN** CTA below the wheel.
5. Win state: centered modal/overlay "You won {prize}!" + Claim CTA, confetti + coin burst.

**Distinctive animation:** mascot potions bubble; on SPIN, green energy surges from the
flasks into the wheel hub and coins erupt outward.

## Landing B — "Jackpot Boom Vault"

A gold-forward sibling: treasure wheel in a vault, character-free.

**Layout (top → bottom)**
1. Top bar: `‹ Back` chip + **BOOMZINO** gold logo.
2. Hero: "BOOM your luck" headline + a red/gold **777** slot banner.
3. Stage:
   - Radiating **gold light-rays** rotating behind the wheel.
   - Center **golden treasure wheel** (gold + emerald segments, bulb rim, gold pointer).
   - A "BOOM" energy burst behind the wheel; **coin shower** raining down the column.
   - Stacked gold coins along the base.
4. **SPIN TO WIN** gold CTA.
5. Win state: "JACKPOT — You won {prize}!" celebration, heavier coin explosion + confetti.

**Distinctive animation:** continuous coin rain + rotating light-rays; on SPIN the "BOOM"
burst flashes lab-green and the coin shower intensifies into a jackpot explosion.

## Approach / tooling

Generation uses the **Stitch MCP** server (configured in `.mcp.json`):
1. Define the shared **Boomzino design system** in Stitch (palette + type + motion notes)
   via a design-system create call (or `create_design_system_from_design_md`).
2. Create a Stitch **project**, then **generate one screen per landing** from a detailed
   text prompt (the per-landing layouts above), applying the design system.
3. Pull the generated markup/assets down and place them as standalone files in
   `public/prototypes/`:
   - `public/prototypes/boomzino-alchemy-lab.html`
   - `public/prototypes/boomzino-jackpot-vault.html`
   - plus any shared CSS/JS/asset files Stitch emits (kept self-contained, not importing
     `app/globals.css`).
4. Hand-finish only as needed so the animation list above actually runs in a browser
   (Stitch output is the starting point; light CSS/JS polish is acceptable).

## Verification (how we know it's done)

These are static mockups, so verification is **visual**, not unit-tested:
- Each file opens standalone in a browser with **no console errors** and no dependency on
  the Next app or `app/globals.css`.
- Served via `next dev` at `/prototypes/boomzino-alchemy-lab.html` and
  `/prototypes/boomzino-jackpot-vault.html`.
- Visual review against this spec: palette, motifs, both layouts, and the required idle +
  spin + win animations present and running.
- `prefers-reduced-motion` collapses animation to a static view.
- Screenshots captured for the user to review.

## Success criteria

1. Two visually distinct Boomzino-style spin-wheel landing mockups exist under
   `public/prototypes/`.
2. Both are fresh designs that reuse none of today's landing template/CSS.
3. Both are animated per the motion language and read as the Boomzino alchemy-casino brand.
4. The work is self-contained and clearly marked as a mockup/prototype, ready for a later
   integration task.
