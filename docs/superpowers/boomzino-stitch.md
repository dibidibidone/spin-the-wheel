# Boomzino Stitch IDs — Cross-Task Handoff

Generated: 2026-06-22

## Design System

| Field       | Value                          |
|-------------|-------------------------------|
| Name        | Boomzino Alchemy Casino        |
| Stitch ID   | `assets/2991161878867448858`   |
| Color mode  | DARK / VIBRANT                 |
| Primary     | #F5C24B (gold)                 |
| Secondary   | #5BE36A (toxic lab-green)      |
| Tertiary    | #E2483D (red pop)              |
| Neutral     | #0C1F1C (deep teal-charcoal)  |
| Headlines   | OUTFIT                         |
| Body        | OUTFIT                         |
| Roundness   | ROUND_FULL                     |

## Project

| Field       | Value                              |
|-------------|-----------------------------------|
| Name        | Boomzino Prototype Landings        |
| Stitch ID   | `5668128576155269948`              |
| Resource    | `projects/5668128576155269948`     |

## Screen 1 — The Alchemy Lab

| Field       | Value                                                                |
|-------------|---------------------------------------------------------------------|
| Title       | The Alchemy Lab - Landing Page                                       |
| Screen ID   | `026396d9825f43f88283c3889968c1ed`                                   |
| Resource    | `projects/5668128576155269948/screens/026396d9825f43f88283c3889968c1ed` |
| Type        | DESIGN (mobile, 780×1768)                                            |
| Agent       | PRO_AGENT / figaro_agent                                             |

### Supporting image screens (generated as sub-assets)

| Title / Role         | Screen ID                            | Resource                                                                 |
|----------------------|--------------------------------------|--------------------------------------------------------------------------|
| Boomzino Gold Logo   | `f4b47a580e2a4ab9a5513e0714265d49`   | `projects/5668128576155269948/screens/f4b47a580e2a4ab9a5513e0714265d49` |
| Spin Wheel (emerald) | `ce18b94be38640318b6e890871e050e6`   | `projects/5668128576155269948/screens/ce18b94be38640318b6e890871e050e6` |
| Alchemist Mascots    | `26ac7da65f0f4eebbd0856feb43644b9`   | `projects/5668128576155269948/screens/26ac7da65f0f4eebbd0856feb43644b9` |

### Local assets

```
docs/superpowers/stitch-assets/boomzino/alchemy-lab/
  alchemy-lab.html          — full HTML/CSS/JS landing page (10 KB)
  alchemy-lab-screenshot.jpg — composite design screenshot (122 KB, 780×1768 approx)
  spin-wheel.jpg             — emerald spin wheel with gold bulb rim, 8 segments, gold coins (114 KB)
  mascots.jpg                — two alchemist mascots in lab coats holding green potions (89 KB)
  boomzino-logo.jpg          — gold BOOMZINO logo on dark background (72 KB)
```

## Screen 2 — Jackpot Boom Vault

| Field       | Value                                                                |
|-------------|---------------------------------------------------------------------|
| Title       | Jackpot Boom Vault                                                   |
| Screen ID   | `3b7cc3c02ed0429fa8ea8c8eaa50e765`                                   |
| Resource    | `projects/5668128576155269948/screens/3b7cc3c02ed0429fa8ea8c8eaa50e765` |
| Type        | DESIGN (mobile, 100% width)                                          |
| Agent       | PRO_AGENT / figaro_agent                                             |

### Supporting image screens (generated as sub-assets)

| Title / Role         | Screen ID                            | Resource                                                                 |
|----------------------|--------------------------------------|--------------------------------------------------------------------------|
| WebGL shader (rays)  | `125b9468e2e4497fa73178ffd0e39ec7`   | `projects/5668128576155269948/screens/125b9468e2e4497fa73178ffd0e39ec7` |
| 777 slot banner      | `e82950b70f0f4f48ad7c4a789d7b543c`   | `projects/5668128576155269948/screens/e82950b70f0f4f48ad7c4a789d7b543c` |

### Local assets

```
docs/superpowers/stitch-assets/boomzino/jackpot-vault/
  jackpot-vault.html          — full HTML/CSS/JS landing page with WebGL shader + coin rain (19 KB)
  jackpot-vault-screenshot.jpg — 777 red-and-gold slot machine banner image (60 KB)
```

## Notes for Tasks 3 & 4

- The HTML files are fully self-contained single-file pages with inline CSS and JS.
- `alchemy-lab.html`: Features emerald wheel composite, alchemist mascots, floating animation, glossy gold SPIN button, top nav + bottom nav.
- `jackpot-vault.html`: Features WebGL shader for rotating gold light-rays + green energy burst, vanilla JS coin-rain particle system, 777 banner, golden wheel, glossy "SPIN TO WIN" button. No characters.
- Both use the Boomzino design system tokens (OUTFIT font, gold primary, teal-charcoal bg, vibrant dark mode).
- The `download_assets` MCP tool returned success but produced no files (project-level download appears to be a no-op for this project type); assets were instead obtained directly from the `htmlCode.downloadUrl` and `screenshot.downloadUrl` fields returned by `generate_screen_from_text`.
