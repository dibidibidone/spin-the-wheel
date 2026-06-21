# Boomzino Spin-the-Wheel Landing Mockups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce two brand-new, fully-animated Boomzino-style spin-the-wheel landing **mockups** as standalone static files under `public/prototypes/`, generated with the Stitch MCP and hand-finished — sharing nothing with the current production landing template.

**Architecture:** Each mockup is a single self-contained HTML file that links a shared `boomzino.css` (design tokens + keyframes) and `boomzino.js` (a demo-only spin + celebration controller). Stitch MCP generates the visual layout/markup per landing; we adapt its output into the standalone file, enforcing a small contract (required `data-testid` hooks + animation behaviour) verified by a Playwright smoke test. No DB, no React, no real prize logic, no admin wiring.

**Tech Stack:** Static HTML/CSS/vanilla-JS served from Next's `public/` dir (visible at `/prototypes/...` via `next dev`/`next start` and openable as `file://`); Stitch MCP for design generation; Playwright (already in repo) for smoke verification + screenshots.

## Global Constraints

- Mockups MUST NOT import or depend on `app/globals.css`, `components/landing/LandingScene.tsx`, or any `/_next/*` asset — they are standalone. (Enforced by a test asserting zero `link[href*="globals"], link[href^="/_next"]`.)
- No changes to `prisma/schema.prisma`, the `Landing` model, `lib/`, the admin, or the existing `boomzino-demo` seed/template. This is design-only.
- Deliverable files live under `public/prototypes/`; raw Stitch downloads live under `docs/superpowers/stitch-assets/boomzino/` (kept out of the web root).
- Palette tokens (use these exact hex values via CSS vars):
  `--bg:#0C1F1C` `--bg-glow:#16403A` `--surface:#15564A` `--surface-deep:#0F3B33` `--gold:#F5C24B` `--gold-bright:#FFD56A` `--lab-green:#5BE36A` `--lab-green-hot:#8BFF5A` `--red:#E2483D` `--cream:#F4F1E8` `--text:#EAF6EE` `--muted:#8FB9AD`
- Body font: **Outfit** with `system-ui, sans-serif` fallback (already used by the app; load via Google Fonts `<link>` in each mockup so the file is self-contained).
- Each mockup MUST include these test hooks: `data-testid="spin-button"`, `data-testid="wheel-rotor"`, `data-testid="win-burst"` (the win overlay, `hidden` until a spin completes).
- Each mockup MUST honor `prefers-reduced-motion: reduce` (animations collapse to static).
- Illustrative wheel segments (both): `€5`, `50 FS`, `€10`, `100 FS`, `€20`, `200 FS`, `50% Bonus`, `JACKPOT`; the demo spin lands on `JACKPOT` (index 7).
- Mascot/character art is placeholder only (styled silhouettes/blocks) — do not attempt to reproduce Boomzino's licensed illustrations.
- Source of truth is the spec: `docs/superpowers/specs/2026-06-22-boomzino-spin-wheel-landings-design.md`.

---

## File Structure

- `public/prototypes/boomzino.css` — shared design tokens + keyframes + reduced-motion fallback.
- `public/prototypes/boomzino.js` — shared demo `spinWheel()` + `celebrate()` controllers.
- `public/prototypes/index.html` — gallery linking both mockups.
- `public/prototypes/boomzino-alchemy-lab.html` — Landing A.
- `public/prototypes/boomzino-jackpot-vault.html` — Landing B.
- `docs/superpowers/design-systems/boomzino.design.md` — design brief fed to Stitch.
- `docs/superpowers/stitch-assets/boomzino/` — raw Stitch screen downloads (reference).
- `docs/superpowers/boomzino-stitch.md` — recorded Stitch design-system / project / screen IDs.
- `tests/e2e/prototypes.spec.ts` — Playwright smoke for the gallery + both mockups.

---

### Task 1: Shared foundation (tokens, controllers, gallery, test harness)

**Files:**
- Create: `public/prototypes/boomzino.css`
- Create: `public/prototypes/boomzino.js`
- Create: `public/prototypes/index.html`
- Test: `tests/e2e/prototypes.spec.ts`

**Interfaces:**
- Produces:
  - CSS custom properties on `:root` (palette tokens listed in Global Constraints) plus keyframes `coin-float`, `bubble-rise`, `glow-pulse`, `ray-rotate`, `wheel-glow`, `confetti-fall`, and helper class `.confetti-bit`.
  - `window.Boomzino.spinWheel({ rotor, button, segmentCount, winningIndex, onWin })` — attaches a click handler to `button` (a CSS selector string) that rotates `rotor` (selector string) ~6 turns to land pointer-up on `winningIndex`, then calls `onWin()` once. Completion fires on `transitionend` **or** a timeout fallback, so it still resolves under `prefers-reduced-motion` (where the transition is suppressed and `transitionend` never fires).
  - `window.Boomzino.celebrate({ burst, confettiLayer, count })` — reveals the `burst` element (sets `hidden=false`) and appends `count` `.confetti-bit` spans to `confettiLayer` (defaults to `burst`).
  - `window.Boomzino.labelWheel({ rotor, labels, radius })` — appends one `.seg-label` span per label, centered on each segment (`i*seg + seg/2` clockwise from top) at `radius` px from the hub, so labels spin with the rotor. Pairs with a `conic-gradient(from 0deg, …)` rotor (segment 0 spans 0–45°) so the spin math lands the winning segment under the top pointer.

- [ ] **Step 1: Write the failing gallery test**

Append to `tests/e2e/prototypes.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("prototype gallery lists both Boomzino mockups", async ({ page }) => {
  const resp = await page.goto("/prototypes/index.html");
  expect(resp?.status()).toBe(200);
  await expect(page.getByRole("link", { name: /Alchemy Lab/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Jackpot Boom Vault/i })).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/prototypes.spec.ts -g "gallery" --reporter=line`
Expected: FAIL — `index.html` returns 404 (file does not exist yet).

- [ ] **Step 3: Write `public/prototypes/boomzino.css`**

```css
/* boomzino.css — shared design tokens + motion for the Boomzino prototype mockups. */
:root {
  --bg: #0C1F1C; --bg-glow: #16403A; --surface: #15564A; --surface-deep: #0F3B33;
  --gold: #F5C24B; --gold-bright: #FFD56A; --lab-green: #5BE36A; --lab-green-hot: #8BFF5A;
  --red: #E2483D; --cream: #F4F1E8; --text: #EAF6EE; --muted: #8FB9AD;
  --font: "Outfit", system-ui, sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font);
  color: var(--text);
  background: radial-gradient(120% 80% at 50% 0%, var(--bg-glow) 0%, var(--bg) 60%), var(--bg);
  min-height: 100dvh;
}
.stage { position: relative; max-width: 430px; margin: 0 auto; min-height: 100dvh; overflow: hidden; }

@keyframes coin-float { 0% { transform: translateY(0) rotate(0); opacity: .9; }
  100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; } }
@keyframes bubble-rise { 0% { transform: translateY(0) scale(.7); opacity: 0; }
  30% { opacity: .9; } 100% { transform: translateY(-46px) scale(1); opacity: 0; } }
@keyframes glow-pulse { 0%,100% { filter: drop-shadow(0 0 6px var(--lab-green)); }
  50% { filter: drop-shadow(0 0 22px var(--lab-green-hot)); } }
@keyframes ray-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes wheel-glow { 0%,100% { filter: drop-shadow(0 0 18px color-mix(in srgb, var(--gold) 55%, transparent)); }
  50% { filter: drop-shadow(0 0 34px color-mix(in srgb, var(--lab-green) 55%, transparent)); } }
@keyframes confetti-fall { to { transform: translateY(115vh) rotate(720deg); opacity: 0; } }

.confetti-bit {
  position: absolute; top: -16px; width: 9px; height: 15px; border-radius: 2px;
  animation: confetti-fall 2s linear forwards; pointer-events: none;
}
.seg-label {
  position: absolute; left: 50%; top: 50%; width: 58px; text-align: center;
  font-size: 11px; font-weight: 800; letter-spacing: .2px; line-height: 1;
  color: var(--cream); text-shadow: 0 1px 3px rgba(0,0,0,.75); pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 4: Write `public/prototypes/boomzino.js`**

```js
/* boomzino.js — shared DEMO controllers for the Boomzino prototype mockups.
   No real prize logic; drives only the visual spin + win celebration. */
(function (global) {
  function spinWheel(opts) {
    var rotor = document.querySelector(opts.rotor);
    var button = document.querySelector(opts.button);
    if (!rotor || !button) return;
    var segmentCount = opts.segmentCount || 8;
    var winningIndex = opts.winningIndex != null ? opts.winningIndex : 7;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var durationMs = reduce ? 0 : 4500;
    var spinning = false;
    button.addEventListener("click", function () {
      if (spinning) return;
      spinning = true;
      button.setAttribute("disabled", "true");
      var seg = 360 / segmentCount;
      var target = 360 * (reduce ? 0 : 6) + (360 - (winningIndex * seg + seg / 2));
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        if (typeof opts.onWin === "function") opts.onWin();
      }
      rotor.style.transition = reduce ? "none" : "transform " + durationMs + "ms cubic-bezier(0.16,1,0.3,1)";
      rotor.style.transform = "rotate(" + target + "deg)";
      rotor.addEventListener("transitionend", finish, { once: true });
      // Fallback: with reduced motion (or any browser that skips the transition)
      // `transitionend` never fires, so guarantee completion via a timer.
      setTimeout(finish, durationMs + 300);
    });
  }

  function celebrate(opts) {
    var burst = document.querySelector(opts.burst);
    if (burst) burst.hidden = false;
    var layer = document.querySelector(opts.confettiLayer || opts.burst);
    if (!layer) return;
    var colors = ["#F5C24B", "#FFD56A", "#5BE36A", "#8BFF5A", "#E2483D", "#F4F1E8"];
    var count = opts.count || 80;
    for (var i = 0; i < count; i++) {
      var bit = document.createElement("span");
      bit.className = "confetti-bit";
      bit.style.left = (Math.random() * 100) + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.6) + "s";
      bit.style.animationDuration = (1.6 + Math.random() * 1.4) + "s";
      layer.appendChild(bit);
    }
  }

  function labelWheel(opts) {
    var rotor = document.querySelector(opts.rotor);
    if (!rotor) return;
    var labels = opts.labels || [];
    var radius = opts.radius || 80;
    var n = labels.length, seg = 360 / n;
    for (var i = 0; i < n; i++) {
      var angle = i * seg + seg / 2; // segment centre, clockwise from top
      var el = document.createElement("span");
      el.className = "seg-label";
      el.textContent = labels[i];
      el.style.transform = "translate(-50%,-50%) rotate(" + angle + "deg) translateY(-" + radius + "px)";
      rotor.appendChild(el);
    }
  }

  global.Boomzino = { spinWheel: spinWheel, celebrate: celebrate, labelWheel: labelWheel };
})(window);
```

- [ ] **Step 5: Write `public/prototypes/index.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Boomzino — Prototype Landings</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="./boomzino.css" />
<style>
  .gallery { max-width: 720px; margin: 0 auto; padding: 40px 20px; }
  h1 { color: var(--gold); font-weight: 800; font-size: 32px; }
  p { color: var(--muted); }
  .cards { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; margin-top: 24px; }
  a.card { display: block; padding: 24px; border-radius: 16px; text-decoration: none;
    background: var(--surface); border: 1px solid color-mix(in srgb, var(--gold) 30%, transparent);
    color: var(--text); font-weight: 600; }
  a.card span { display: block; color: var(--muted); font-weight: 400; margin-top: 6px; font-size: 14px; }
  @media (max-width: 560px) { .cards { grid-template-columns: 1fr; } }
</style>
</head>
<body>
  <main class="gallery">
    <h1>Boomzino — Prototype Landings</h1>
    <p>Two brand-new, animated spin-the-wheel mockups. Design only — not wired into the app.</p>
    <div class="cards">
      <a class="card" href="./boomzino-alchemy-lab.html">The Alchemy Lab<span>Mascot-flanked emerald wheel</span></a>
      <a class="card" href="./boomzino-jackpot-vault.html">Jackpot Boom Vault<span>Gold treasure wheel + coin shower</span></a>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/prototypes.spec.ts -g "gallery" --reporter=line`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/prototypes/boomzino.css public/prototypes/boomzino.js public/prototypes/index.html tests/e2e/prototypes.spec.ts
git commit -m "feat: Boomzino prototype foundation (tokens, controllers, gallery)"
```

---

### Task 2: Generate both landing designs with Stitch

**Files:**
- Create: `docs/superpowers/design-systems/boomzino.design.md`
- Create: `docs/superpowers/stitch-assets/boomzino/` (downloaded screen assets)
- Create: `docs/superpowers/boomzino-stitch.md` (recorded IDs)

**Interfaces:**
- Produces: raw Stitch output for two screens ("Alchemy Lab", "Jackpot Boom Vault") on disk under `docs/superpowers/stitch-assets/boomzino/`, plus a record of the design-system / project / screen IDs in `docs/superpowers/boomzino-stitch.md`, consumed as visual reference by Tasks 3 and 4.

- [ ] **Step 1: Write the Stitch design brief**

Create `docs/superpowers/design-systems/boomzino.design.md`:

```markdown
# Boomzino — Alchemy Casino Design System

Mood: mad-science alchemy casino. Explosive chemistry ("Boom"), glowing green
potions, gold treasure, coins erupting. Premium but playful, high energy, dark.

Colors:
- Background deep teal-charcoal #0C1F1C with a central emerald glow #16403A
- Surfaces emerald-jade #15564A / inset #0F3B33
- Gold #F5C24B, gold highlight #FFD56A (logo, trim, primary CTA, coins)
- Toxic lab-green glow #5BE36A → #8BFF5A (potions, energy)
- Red pop #E2483D (777 / alerts), cream #F4F1E8 (highlights)
- Text #EAF6EE, muted #8FB9AD

Typography: chunky rounded gold display for logo/headline; clean geometric sans
(Outfit) for body.

Motifs: bubbling potion flasks with rising smoke, gold coin + dollar-bill showers,
chemistry bubbles, slot 777, green "boom" energy bursts, sparkles, a glowing
segmented spin wheel with a gold light-bulb rim and gold pointer.

Components: spin wheel (8 segments, gold bulb rim, gold pointer), big gold SPIN
CTA (pill, glossy), back chip, win overlay ("You won {prize}!") with Claim CTA.

Target: mobile-first ~430px column, centered on desktop with ambient glow.
```

- [ ] **Step 2: Load the Stitch MCP tool schemas**

Run a tool search to make the Stitch tools callable:
`ToolSearch` query: `select:mcp__stitch__create_design_system_from_design_md,mcp__stitch__create_design_system,mcp__stitch__create_project,mcp__stitch__generate_screen_from_text,mcp__stitch__get_screen,mcp__stitch__list_screens,mcp__stitch__download_assets`
Expected: the `<functions>` block returns schemas for those tools.

- [ ] **Step 3: Create the design system + project in Stitch**

- Call `mcp__stitch__create_design_system_from_design_md` with the contents of `docs/superpowers/design-systems/boomzino.design.md` (or `create_design_system` with the palette/type fields if the `_from_design_md` variant is unavailable).
- Call `mcp__stitch__create_project` (name: `Boomzino Prototype Landings`), applying the design system.
- Record the returned design-system id, project id in `docs/superpowers/boomzino-stitch.md`.

- [ ] **Step 4: Generate the "Alchemy Lab" screen**

Call `mcp__stitch__generate_screen_from_text` (project + design system applied) with this prompt:

```
A mobile casino landing page, "The Alchemy Lab". Dark teal-charcoal background
with a central emerald glow. Top: a gold "BOOMZINO" logo and a small back chip.
Headline "Spin the Wheel", subtitle "and win bonuses". Center stage: a glowing
emerald spin wheel with 8 segments (labels: €5, 50 FS, €10, 100 FS, €20, 200 FS,
50% Bonus, JACKPOT), a gold light-bulb rim and a gold pointer at top. Flanking the
wheel left and right: two alchemist/scientist mascots in lab coats each holding a
bubbling green potion flask with rising green smoke. Gold coins erupting from the
wheel hub. Faint lab shelves and beakers in the background. A large glossy gold
"SPIN" pill button below the wheel. Energetic, premium, animated casino feel.
```

Then `mcp__stitch__download_assets` for the generated screen into `docs/superpowers/stitch-assets/boomzino/alchemy-lab/`. Record the screen id in `docs/superpowers/boomzino-stitch.md`.

- [ ] **Step 5: Generate the "Jackpot Boom Vault" screen**

Call `mcp__stitch__generate_screen_from_text` with this prompt:

```
A mobile casino landing page, "Jackpot Boom Vault". Dark teal-charcoal background.
Top: gold "BOOMZINO" logo and a back chip. Headline "BOOM your luck" with a
red-and-gold slot-machine "777" banner. Center: a golden treasure spin wheel with
8 segments (€5, 50 FS, €10, 100 FS, €20, 200 FS, 50% Bonus, JACKPOT), gold
light-bulb rim and gold pointer, with rotating gold light-rays radiating behind it
and a green "BOOM" energy burst. Gold coins raining down the screen and stacked
along the bottom edge. A large glossy gold "SPIN TO WIN" pill button. No characters.
Treasure/jackpot, gold-forward, animated, premium casino feel.
```

Then `mcp__stitch__download_assets` into `docs/superpowers/stitch-assets/boomzino/jackpot-vault/`. Record the screen id.

- [ ] **Step 6: Verify assets + IDs are on disk**

Run: `ls -R docs/superpowers/stitch-assets/boomzino && echo '---' && cat docs/superpowers/boomzino-stitch.md`
Expected: both `alchemy-lab/` and `jackpot-vault/` contain Stitch output files, and `boomzino-stitch.md` lists the design-system, project, and two screen IDs.

> If Stitch is unavailable or a screen is unusable, record that in `boomzino-stitch.md` and proceed — Tasks 3 and 4 build the standalone files directly from this plan's contract and the spec layouts; Stitch output is reference, not a hard dependency.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/design-systems/boomzino.design.md docs/superpowers/stitch-assets/boomzino docs/superpowers/boomzino-stitch.md
git commit -m "feat: Stitch-generated Boomzino landing designs (raw assets)"
```

---

### Task 3: Landing A — "The Alchemy Lab"

**Files:**
- Create: `public/prototypes/boomzino-alchemy-lab.html`
- Modify: `tests/e2e/prototypes.spec.ts` (add Landing A smoke + reduced-motion test)

**Interfaces:**
- Consumes: `boomzino.css`, `boomzino.js` from Task 1; visual reference from `docs/superpowers/stitch-assets/boomzino/alchemy-lab/` (Task 2).
- Produces: `/prototypes/boomzino-alchemy-lab.html` with hooks `data-testid="spin-button"`, `data-testid="wheel-rotor"`, `data-testid="win-burst"`.

- [ ] **Step 1: Write the failing smoke test**

Append to `tests/e2e/prototypes.spec.ts`:

```ts
test("Alchemy Lab loads standalone, has no console errors, spins to a win", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  const resp = await page.goto("/prototypes/boomzino-alchemy-lab.html");
  expect(resp?.status()).toBe(200);

  // standalone: must not pull in the app's stylesheet or Next bundles
  expect(await page.locator('link[href*="globals"], link[href^="/_next"], script[src^="/_next"]').count()).toBe(0);

  await expect(page.getByTestId("wheel-rotor")).toBeVisible();
  const spin = page.getByTestId("spin-button");
  await expect(spin).toBeVisible();
  await spin.click();
  await expect(page.getByTestId("win-burst")).toBeVisible({ timeout: 10_000 });

  expect(errors).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("Alchemy Lab still reaches the win state with reduced motion", async ({ page }) => {
    await page.goto("/prototypes/boomzino-alchemy-lab.html");
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-burst")).toBeVisible({ timeout: 10_000 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/prototypes.spec.ts -g "Alchemy" --reporter=line`
Expected: FAIL — page returns 404.

- [ ] **Step 3: Build `public/prototypes/boomzino-alchemy-lab.html`**

Adapt the Stitch "alchemy-lab" output into the standalone file below, keeping the
exact ids/testids and the `<script>` wiring. Replace the placeholder mascots and
wheel art with richer Stitch-derived markup/SVG where available, but the structure,
hooks, and JS calls MUST remain. (Reduced-motion is inherited from `boomzino.css`.)

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Boomzino — The Alchemy Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="./boomzino.css" />
<style>
  .top { display: flex; align-items: center; justify-content: space-between; padding: 16px; }
  .back { background: var(--surface); color: var(--text); border: 1px solid rgba(255,255,255,.08);
    border-radius: 999px; padding: 8px 14px; font-size: 14px; }
  .logo { color: var(--gold); font-weight: 800; letter-spacing: .5px; font-size: 20px; }
  .hero { text-align: center; padding: 4px 16px 0; }
  .hero h1 { margin: 6px 0 2px; font-size: 38px; font-weight: 800;
    text-shadow: 0 0 22px color-mix(in srgb, var(--lab-green) 55%, transparent); }
  .hero p { margin: 0; color: var(--muted); }
  .lab { position: relative; height: 360px; margin-top: 8px; }
  .mascot { position: absolute; bottom: 70px; width: 96px; height: 150px; border-radius: 18px;
    background: linear-gradient(180deg, var(--cream), #cfd8cf); opacity: .9; }
  .mascot.left { left: 6px; } .mascot.right { right: 6px; }
  .flask { position: absolute; bottom: 150px; width: 26px; height: 40px; border-radius: 0 0 12px 12px;
    background: var(--lab-green); animation: glow-pulse 2.4s ease-in-out infinite; }
  .flask.left { left: 70px; } .flask.right { right: 70px; }
  .bubble { position: absolute; width: 8px; height: 8px; border-radius: 50%;
    background: var(--lab-green-hot); animation: bubble-rise 1.8s ease-in infinite; }
  .wheel-wrap { position: absolute; left: 50%; bottom: 30px; transform: translateX(-50%);
    width: 240px; height: 240px; }
  .rotor { position: relative; width: 240px; height: 240px; border-radius: 50%; animation: wheel-glow 3.2s ease-in-out infinite;
    background:
      conic-gradient(from 0deg,
        #1E7A3A 0 45deg, #2BA552 45deg 90deg, #1E7A3A 90deg 135deg, #2BA552 135deg 180deg,
        #1E7A3A 180deg 225deg, #2BA552 225deg 270deg, #1E7A3A 270deg 315deg, var(--gold) 315deg 360deg);
    border: 8px solid var(--gold); box-shadow: 0 0 0 4px var(--surface-deep) inset; }
  .pointer { position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
    border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 20px solid var(--gold); z-index: 3; }
  .spin { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 4;
    width: 86px; height: 86px; border-radius: 50%; border: 4px solid var(--bg);
    background: radial-gradient(circle at 50% 35%, var(--gold-bright), var(--gold));
    color: #2a1e00; font-weight: 800; font-size: 16px; cursor: pointer;
    box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 80%, transparent); }
  .spin:disabled { opacity: .8; cursor: default; }
  .coin-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .coin { position: absolute; bottom: 40px; width: 18px; height: 18px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--gold-bright), #b8860b);
    animation: coin-float 3.4s ease-in infinite; }
  .win { position: fixed; inset: 0; display: grid; place-items: center; z-index: 50;
    background: rgba(2,10,6,.72); backdrop-filter: blur(4px); }
  .win .card { width: min(330px, 86vw); text-align: center; padding: 26px; border-radius: 20px;
    background: var(--surface); border: 1px solid color-mix(in srgb, var(--gold) 45%, transparent);
    box-shadow: 0 0 40px color-mix(in srgb, var(--lab-green) 35%, transparent); }
  .win h2 { margin: 6px 0; } .win .prize { color: var(--gold); font-size: 28px; font-weight: 800; }
  .win .claim { width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px;
    background: var(--gold); color: #2a1e00; font-weight: 800; font-size: 16px; cursor: pointer; }
</style>
</head>
<body>
  <main class="stage">
    <header class="top"><button class="back">‹ Back</button><div class="logo">BOOMZINO</div></header>
    <section class="hero"><h1>Spin the Wheel</h1><p>and win bonuses</p></section>

    <section class="lab">
      <div class="mascot left"></div><div class="mascot right"></div>
      <div class="flask left"></div><div class="flask right"></div>
      <span class="bubble" style="left:78px;bottom:188px;animation-delay:.2s"></span>
      <span class="bubble" style="right:78px;bottom:188px;animation-delay:.7s"></span>

      <div class="coin-layer" id="coins"></div>

      <div class="wheel-wrap">
        <div class="pointer"></div>
        <div class="rotor" data-testid="wheel-rotor" id="rotor"></div>
        <button class="spin" data-testid="spin-button" id="spin">SPIN</button>
      </div>
    </section>

    <div class="win" data-testid="win-burst" id="win" hidden>
      <div class="card">
        <div style="font-size:42px">👑</div>
        <h2>You won</h2>
        <div class="prize">JACKPOT!</div>
        <button class="claim">Claim bonus</button>
      </div>
    </div>
  </main>

  <script src="./boomzino.js"></script>
  <script>
    Boomzino.labelWheel({
      rotor: "#rotor", radius: 88,
      labels: ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"]
    });
    Boomzino.spinWheel({
      rotor: "#rotor", button: "#spin", segmentCount: 8, winningIndex: 7,
      onWin: function () {
        var coins = document.getElementById("coins");
        for (var i = 0; i < 14; i++) {
          var c = document.createElement("span");
          c.className = "coin";
          c.style.left = (10 + Math.random() * 80) + "%";
          c.style.animationDelay = (Math.random() * 0.5) + "s";
          coins.appendChild(c);
        }
        Boomzino.celebrate({ burst: "#win", confettiLayer: "#win", count: 90 });
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 4: Run the smoke + reduced-motion tests to verify they pass**

Run: `npx playwright test tests/e2e/prototypes.spec.ts -g "Alchemy" --reporter=line`
Expected: PASS (both tests).

- [ ] **Step 5: Capture review screenshots**

Run: `npx playwright screenshot --viewport-size=430,900 "http://localhost:3000/prototypes/boomzino-alchemy-lab.html" docs/superpowers/stitch-assets/boomzino/alchemy-lab-preview.png`
Expected: a PNG is written (idle state). Start the server first with `npm run build && npm run start` in another shell if not already running.

- [ ] **Step 6: Commit**

```bash
git add public/prototypes/boomzino-alchemy-lab.html tests/e2e/prototypes.spec.ts docs/superpowers/stitch-assets/boomzino/alchemy-lab-preview.png
git commit -m "feat: Boomzino 'Alchemy Lab' landing mockup"
```

---

### Task 4: Landing B — "Jackpot Boom Vault"

**Files:**
- Create: `public/prototypes/boomzino-jackpot-vault.html`
- Modify: `tests/e2e/prototypes.spec.ts` (add Landing B smoke test)

**Interfaces:**
- Consumes: `boomzino.css`, `boomzino.js` from Task 1; visual reference from `docs/superpowers/stitch-assets/boomzino/jackpot-vault/` (Task 2).
- Produces: `/prototypes/boomzino-jackpot-vault.html` with hooks `data-testid="spin-button"`, `data-testid="wheel-rotor"`, `data-testid="win-burst"`.

- [ ] **Step 1: Write the failing smoke test**

Append to `tests/e2e/prototypes.spec.ts`:

```ts
test("Jackpot Boom Vault loads standalone, has no console errors, spins to a win", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));

  const resp = await page.goto("/prototypes/boomzino-jackpot-vault.html");
  expect(resp?.status()).toBe(200);
  expect(await page.locator('link[href*="globals"], link[href^="/_next"], script[src^="/_next"]').count()).toBe(0);

  await expect(page.getByTestId("wheel-rotor")).toBeVisible();
  const spin = page.getByTestId("spin-button");
  await expect(spin).toBeVisible();
  await spin.click();
  await expect(page.getByTestId("win-burst")).toBeVisible({ timeout: 10_000 });

  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/prototypes.spec.ts -g "Jackpot" --reporter=line`
Expected: FAIL — page returns 404.

- [ ] **Step 3: Build `public/prototypes/boomzino-jackpot-vault.html`**

Adapt the Stitch "jackpot-vault" output into the standalone file below, keeping the
exact ids/testids and `<script>` wiring; enrich the visuals from Stitch where useful.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Boomzino — Jackpot Boom Vault</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="./boomzino.css" />
<style>
  .top { display: flex; align-items: center; justify-content: space-between; padding: 16px; }
  .back { background: var(--surface); color: var(--text); border: 1px solid rgba(255,255,255,.08);
    border-radius: 999px; padding: 8px 14px; font-size: 14px; }
  .logo { color: var(--gold); font-weight: 800; letter-spacing: .5px; font-size: 20px; }
  .hero { text-align: center; padding: 4px 16px 0; }
  .hero h1 { margin: 6px 0; font-size: 34px; font-weight: 800; color: var(--gold-bright);
    text-shadow: 0 0 22px color-mix(in srgb, var(--gold) 60%, transparent); }
  .banner { display: inline-block; margin-top: 4px; padding: 6px 14px; border-radius: 10px;
    background: var(--red); color: var(--cream); font-weight: 800; letter-spacing: 4px;
    border: 2px solid var(--gold); }
  .vault { position: relative; height: 380px; margin-top: 10px; }
  .rays { position: absolute; left: 50%; top: 150px; transform: translate(-50%,-50%);
    width: 360px; height: 360px; animation: ray-rotate 14s linear infinite;
    background: repeating-conic-gradient(from 0deg,
      color-mix(in srgb, var(--gold) 38%, transparent) 0 9deg, transparent 9deg 18deg);
    -webkit-mask: radial-gradient(circle, transparent 96px, #000 98px);
            mask: radial-gradient(circle, transparent 96px, #000 98px); }
  .boom { position: absolute; left: 50%; top: 150px; transform: translate(-50%,-50%);
    width: 300px; height: 300px; border-radius: 50%; animation: glow-pulse 2.6s ease-in-out infinite;
    background: radial-gradient(circle, color-mix(in srgb, var(--lab-green) 30%, transparent) 0%, transparent 60%); }
  .wheel-wrap { position: absolute; left: 50%; top: 150px; transform: translate(-50%,-50%);
    width: 220px; height: 220px; }
  .rotor { position: relative; width: 220px; height: 220px; border-radius: 50%; animation: wheel-glow 3s ease-in-out infinite;
    background:
      conic-gradient(from 0deg,
        var(--gold) 0 45deg, #1E7A3A 45deg 90deg, var(--gold) 90deg 135deg, #1E7A3A 135deg 180deg,
        var(--gold) 180deg 225deg, #1E7A3A 225deg 270deg, var(--gold) 270deg 315deg, var(--red) 315deg 360deg);
    border: 8px solid var(--gold-bright); box-shadow: 0 0 0 4px var(--surface-deep) inset; }
  .pointer { position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
    border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 20px solid var(--gold-bright); z-index: 3; }
  .spin { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); z-index: 4;
    width: 84px; height: 84px; border-radius: 50%; border: 4px solid var(--bg);
    background: radial-gradient(circle at 50% 35%, var(--gold-bright), var(--gold));
    color: #2a1e00; font-weight: 800; font-size: 13px; cursor: pointer;
    box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 80%, transparent); }
  .spin:disabled { opacity: .8; cursor: default; }
  .coin-rain { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .coin { position: absolute; top: -20px; width: 18px; height: 18px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--gold-bright), #b8860b);
    animation: confetti-fall 3s linear infinite; }
  .cta { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%);
    padding: 14px 30px; border-radius: 999px; border: none; background: var(--gold);
    color: #2a1e00; font-weight: 800; font-size: 16px; cursor: pointer;
    box-shadow: 0 0 24px color-mix(in srgb, var(--gold) 70%, transparent); }
  .win { position: fixed; inset: 0; display: grid; place-items: center; z-index: 50;
    background: rgba(2,10,6,.72); backdrop-filter: blur(4px); }
  .win .card { width: min(330px, 86vw); text-align: center; padding: 26px; border-radius: 20px;
    background: var(--surface); border: 1px solid color-mix(in srgb, var(--gold) 45%, transparent);
    box-shadow: 0 0 44px color-mix(in srgb, var(--gold) 40%, transparent); }
  .win h2 { margin: 6px 0; } .win .prize { color: var(--gold); font-size: 30px; font-weight: 800; }
  .win .claim { width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px;
    background: var(--gold); color: #2a1e00; font-weight: 800; font-size: 16px; cursor: pointer; }
</style>
</head>
<body>
  <main class="stage">
    <header class="top"><button class="back">‹ Back</button><div class="logo">BOOMZINO</div></header>
    <section class="hero"><h1>BOOM your luck</h1><div class="banner">7 7 7</div></section>

    <section class="vault">
      <div class="coin-rain" id="coins"></div>
      <div class="rays"></div>
      <div class="boom"></div>
      <div class="wheel-wrap">
        <div class="pointer"></div>
        <div class="rotor" data-testid="wheel-rotor" id="rotor"></div>
        <button class="spin" data-testid="spin-button" id="spin">SPIN<br>TO WIN</button>
      </div>
      <button class="cta" id="cta">SPIN TO WIN</button>
    </section>

    <div class="win" data-testid="win-burst" id="win" hidden>
      <div class="card">
        <div style="font-size:42px">💰</div>
        <h2>JACKPOT — You won</h2>
        <div class="prize">JACKPOT!</div>
        <button class="claim">Claim bonus</button>
      </div>
    </div>
  </main>

  <script src="./boomzino.js"></script>
  <script>
    // continuous idle coin rain
    var rain = document.getElementById("coins");
    for (var i = 0; i < 10; i++) {
      var c = document.createElement("span");
      c.className = "coin";
      c.style.left = (Math.random() * 100) + "%";
      c.style.animationDelay = (Math.random() * 3) + "s";
      c.style.animationDuration = (2.4 + Math.random() * 1.6) + "s";
      rain.appendChild(c);
    }
    Boomzino.labelWheel({
      rotor: "#rotor", radius: 80,
      labels: ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"]
    });
    function startSpin() {
      Boomzino.spinWheel({
        rotor: "#rotor", button: "#spin", segmentCount: 8, winningIndex: 7,
        onWin: function () { Boomzino.celebrate({ burst: "#win", confettiLayer: "#win", count: 120 }); }
      });
    }
    startSpin();
    // mirror the big CTA onto the wheel button
    document.getElementById("cta").addEventListener("click", function () {
      document.getElementById("spin").click();
    });
  </script>
</body>
</html>
```

- [ ] **Step 4: Run the smoke test to verify it passes**

Run: `npx playwright test tests/e2e/prototypes.spec.ts -g "Jackpot" --reporter=line`
Expected: PASS.

- [ ] **Step 5: Run the full prototype suite + capture screenshot**

Run: `npx playwright test tests/e2e/prototypes.spec.ts --reporter=line`
Expected: all prototype tests PASS.
Run: `npx playwright screenshot --viewport-size=430,900 "http://localhost:3000/prototypes/boomzino-jackpot-vault.html" docs/superpowers/stitch-assets/boomzino/jackpot-vault-preview.png`
Expected: a PNG is written.

- [ ] **Step 6: Commit**

```bash
git add public/prototypes/boomzino-jackpot-vault.html tests/e2e/prototypes.spec.ts docs/superpowers/stitch-assets/boomzino/jackpot-vault-preview.png
git commit -m "feat: Boomzino 'Jackpot Boom Vault' landing mockup"
```

---

## Notes for the executor

- The `cta` button on Landing B forwards its click to the wheel's `#spin` button; `spinWheel` guards against double-spins, so the duplicate trigger is safe.
- `npx playwright screenshot` needs the server running (`npm run build && npm run start`); the test runner starts its own server via `webServer`, but the standalone `screenshot` command does not.
- Scope `playwright test` to `tests/e2e/prototypes.spec.ts` so the existing DB-backed `landing.spec.ts` / `admin.spec.ts` (which need a seeded DB) are not required to pass for this design-only work.
- Stitch output quality is variable; if a generated screen is unusable, the standalone HTML in Tasks 3/4 stands on its own and satisfies the tests. Enrich from Stitch where it improves the look, but never break the test hooks or the `boomzino.css`/`boomzino.js` wiring.
```
