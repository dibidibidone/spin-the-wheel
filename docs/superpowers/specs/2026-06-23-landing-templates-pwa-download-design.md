# Design: Admin-configurable 3D landings + PWA-download conversion flow

- **Date:** 2026-06-23
- **Status:** Approved (brainstorming) — pending implementation plan
- **Branch context:** `feat/igaming-visual-polish`

## 1. Summary

Today the four "flagship" landings (Jackpot Vault, Alchemy Lab, Book of Ra, Gates of
Olympus) exist only as **hardcoded prototypes** under `app/prototypes/3d/*`. Their text,
prize, winning spin, and offer link are baked into per-scene `theme.ts` files, and the
winning spin is hardcoded (`winningIndex: 7` in `useSpinScene`; win-on-2nd-spin in the slot
controller). Meanwhile the production CMS (`Landing` model + 5-tab admin editor) drives a
*separate*, older 2D wheel at `app/[domain]`.

This project does two things:

1. **Make the four 3D landings real, admin-configurable landings** by adding a `template`
   picker to the existing `Landing` model and rendering the chosen scene from DB data
   (reusing all existing infra: auth, domains, prizes, draft preview).
2. **Replace the plain post-win redirect with a "PWA download" conversion flow**: clicking
   **SPIN** triggers the install/"download" of a separate PWA app (its own icon/logo and its
   own web link, both set in admin); clicking **take the prize** opens that app.

The landing page itself is **not** the product app — it is a *launcher* that installs a
small per-landing PWA pointing at the configured icon + link.

## 2. Goals

- Each `Landing` selects one of five templates: `classic-2d` (existing, default),
  `jackpot-vault`, `alchemy-lab`, `book-of-ra`, `gates-of-olympus`.
- The four 3D scenes render from DB data — prize **text**, **which spin wins**, winning
  segment, claim/win copy, and links all come from the `Landing`, not from `theme.ts`.
- A per-landing installable PWA whose **name + icon + opened web link** are configured in
  admin settings.
- **SPIN** → trigger the PWA install ("download"). **Take the prize** → open the app/link.
- Additive and backward-compatible: existing 2D landings keep working unchanged;
  `classic-2d` is the default for all existing rows.

## 3. Non-goals

- No native/app-store app; "PWA app" = an installable web app (manifest + service worker).
- No real lead-capture/analytics backend — `onClaim` stays best-effort (current behavior).
- No automatic icon resizing — the single uploaded icon is reused at the required sizes.
- No change to the visual look of the 2D `classic-2d` landing or its flow.
- We do **not** make the install prompt work where the browser forbids it (see §8 limits).

## 4. Key decisions (resolved in brainstorming)

- **Template picker, keep 2D.** Add a `template` field; the 2D wheel remains a selectable
  option. Most reuse, lowest risk.
- **Launcher model, not a self-PWA.** The landing serves a per-landing manifest describing a
  *separate* app (configured name/icon/link). The visible wheel/slot is the launcher.
- **Install fires on the first SPIN click.** `beforeinstallprompt` is realistically usable
  once; subsequent spins just spin. Install is re-attempted at "take the prize" if not yet
  installed.

## 5. Data model (`prisma/schema.prisma`)

Add four fields to `Landing`; everything else is reused.

| New field     | Type              | Purpose                                                        |
|---------------|-------------------|---------------------------------------------------------------|
| `template`    | `String @default("classic-2d")` | Which look renders (5 values above)                |
| `pwaName`     | `String @default("")`           | App name shown under the home-screen icon          |
| `pwaIconUrl`  | `String?`                       | The PWA app's icon/logo (image upload → Blob URL)  |
| `pwaUrl`      | `String @default("")`           | The web link the installed app opens (the offer)   |

**Reused as-is (no schema change):**

- `prizes[].label` → wheel/slot text. `winningPrizeId` (winner radio) + `spinsBeforeWin` →
  "from which spin you win". `winTitle`, `claimLabel`, `almostText`, `heading`, `subtitle`,
  `theme`, `logoUrl`, `redirectUrl`, `domains`, draft preview.
- `pwaUrl` falls back to `redirectUrl` when blank, so the offer URL need not be entered twice.

Migration is additive (new nullable/defaulted columns). `prisma/seed.ts` may set a sample
`template` + PWA fields on the seeded landing for local testing.

## 6. Admin editor

`components/admin/` — minimal additions, following existing tab patterns.

- **Settings tab** (`SettingsTab.tsx`, saved via `patchLanding` → `PATCH /api/admin/landings/[id]`):
  - Add a **Template** `<select>` (5 options) bound to `template`.
  - Add an **App / PWA** group: **App name** (`pwaName`, text), **App icon** (image upload
    reusing the existing Blob upload route, like `BrandingTab`), **App link** (`pwaUrl`, url).
- **Wheel tab** (`WheelTab.tsx`): **no new controls** — it already has prize rows (text),
  the winner radio, and "Spins before win (N)". These now drive the 3D templates too. (For
  slot templates the prize rows mainly provide the prize *label*, since slot grids are
  cosmetic; documented inline in the tab.)
- `lib/admin/types.ts` (`EditableLanding`), the landings PATCH zod schema, and
  `lib/adminClient.ts` extend to carry `template`, `pwaName`, `pwaIconUrl`, `pwaUrl`.

## 7. Public rendering — DB-driven scenes

- `lib/tenant.ts` `LandingView` + `toLandingView` extend to carry `template`, `pwaName`,
  `pwaIconUrl`, `pwaUrl` (and the existing `winningIndex`/`spinsBeforeWin` already present in
  `view.spin`).
- `app/[domain]/page.tsx` switches on `view.template`:
  - `classic-2d` → existing `LandingScene` (unchanged).
  - `jackpot-vault` / `alchemy-lab` → `JackpotVaultScene` / `AlchemyLabScene`.
  - `book-of-ra` / `gates-of-olympus` → `BookOfRaScene` / `GatesScene`.
  - 3D scenes load via `next/dynamic` with `ssr:false` (as the prototype pages do).
- **Config prop, not hardcoded theme.** Each 3D scene gains an optional `config` prop built
  from the `LandingView`. When omitted (prototype routes), it falls back to the current
  `theme.ts` values — so `app/prototypes/3d/*` keep working as dev showcases. Visual theme
  (colors/materials) stays in `theme.ts`; only **data** comes from the DB:
  - prize/win text → `ConversionConfig.prize` (from `winningPrizeLabel`/`winTitle`),
    `claimLabel`, win/almost copy.
  - **wheel segment labels** → from `prizes[].label` (threaded into `Wheel3D`).
  - offer link → the redirector (`/go`, see §8), not the raw `redirectUrl`.
- **Thread the winning spin through.** `useSpinScene` / `useSlotScene` accept
  `winningIndex` + `spinsBeforeWin` instead of hardcoding `winningIndex: 7`. This also closes
  the pre-existing "thread winningIndex" fast-follow.
  - **Slot caveat (real work):** slot templates are currently scripted to exactly one
    near-miss → win on the 2nd spin. Honoring an arbitrary `spinsBeforeWin = N` for slots
    requires a small `slotController` change to loop the near-miss `N-1` times. Included in
    scope; the wheel templates already support arbitrary N trivially.

## 8. PWA download / open flow (the core new piece)

Per-landing, host-relative endpoints (no middleware matcher change — the host-rewrite
prepends the host as the `[domain]` segment for non-dotted paths):

1. **Manifest** — `app/[domain]/manifest/route.ts` (GET, `application/manifest+json`).
   Looks up the landing by host and returns: `name`/`short_name` = `pwaName`, `icons` =
   `pwaIconUrl` declared at 192 + 512 (`purpose: "any maskable"`), `start_url: "/go"`,
   `scope: "/"`, `display: "standalone"`, theme/background from `theme`.
   Linked via Next metadata: `buildMetadata` adds `manifest: "/manifest"`,
   `appleWebApp: { capable: true, title: pwaName }`, and `icons.apple: pwaIconUrl` so iOS
   "Add to Home Screen" uses the right name + icon.
2. **Redirector** — `app/[domain]/go/route.ts` (GET → 302 to `pwaUrl`, falling back to
   `redirectUrl`). The installed icon's `start_url` is `/go`, so opening the app →
   redirector → the offer. (Manifest `start_url` must be same-origin; this is the bridge.)
3. **Service worker** — static `public/sw.js`, no-op `fetch` handler, scope `/`. Required for
   Android to treat the page as installable. Registered client-side on scene mount.
4. **Install controller** — `usePwaInstall()` hook in the r3f kit:
   - registers `/sw.js`; captures + `preventDefault()`s `beforeinstallprompt`, stashing it.
   - detects platform (iOS via UA / `navigator.standalone`) and `installed` (via
     `appinstalled` and `display-mode: standalone`).
   - `promptInstall()`: Android → `evt.prompt()`; iOS → show an "Add to Home Screen"
     instructions overlay (iOS has no programmatic install); unsupported → no-op.
   - `openApp()`: navigate to `/go`.
5. **Triggers (wired through `useSpinScene` / `useSlotScene`):**
   - **First SPIN click** → `promptInstall()` (guarded by a ref so it fires once). The
     wheel/slot still runs its scripted near-miss → win.
   - **Take the prize** (claim submit) → `openApp()` (navigate to `/go`) instead of the
     current `window.location.assign(redirectUrl)`. If not installed, prompt first, then
     redirect to the offer regardless so conversion is never blocked.

### Platform limits (explicit, unavoidable)

- **iOS Safari**: no programmatic install and no auto-open — only the manual "Add to Home
  Screen" overlay; once added, the icon opens `/go`.
- **Android/Chromium**: native install prompt; a browser tab still cannot *force-open* an
  installed PWA, so "take the prize" navigates to `/go` (opens standalone when installed).
- **HTTPS required** for real installability (Vercel prod is fine; `localhost` works in dev).
- `beforeinstallprompt` is Chromium-only; other browsers fall back to a plain `/go` redirect.

## 9. Testing

- **Unit:**
  - manifest generator: correct `name`/`icons`/`start_url`/`scope` from a `Landing`;
    `pwaUrl` → `redirectUrl` fallback.
  - `usePwaInstall` state machine: idle → prompt → installed; iOS-vs-Android UA branch;
    fires-once guard.
  - slot arbitrary-N near-miss loop in `slotController` (e.g. N=3 → two near-misses then win).
  - scene `config` threading: `winningIndex`/`spinsBeforeWin` reach the controller; wheel
    labels come from prizes.
- **E2E (Playwright, run in ≤3-spec batches per the SwiftShader/WebGL gotcha):**
  - one boot + spin + win smoke per template (DB-driven config), asserting no page errors.
  - `/manifest` returns valid JSON with the configured name/icon; `/go` 302-redirects to the
    offer; "take the prize" navigates to `/go`.
  - Real install prompts can't run headless, so the install *trigger* is unit-tested and the
    *redirect path* is e2e-tested.

## 10. Rollout, risks, follow-ups

- **Rollout:** fully additive; `classic-2d` default means existing landings are untouched.
- **Risks:** iOS install is instructions-only; single uploaded icon reused at 192/512
  (ideal: generate resized maskable icons — out of scope); install prompt not e2e-testable.
- **Deferred follow-ups (non-blocking):** proper multi-size/maskable icon generation;
  per-landing `theme_color`; analytics on install accepted/dismissed; `getInstalledRelatedApps`
  to skip the prompt when already installed; lead-capture backend for `onClaim`.

## 11. File touch-list (orientation, not exhaustive)

- `prisma/schema.prisma` (+ migration), `prisma/seed.ts`
- `lib/tenant.ts`, `lib/types.ts`, `lib/admin/types.ts`, `lib/adminClient.ts`
- `app/api/admin/landings/[id]/route.ts` (zod schema)
- `components/admin/SettingsTab.tsx` (template + PWA group)
- `app/[domain]/page.tsx`, `app/[domain]/buildMetadata.ts`
- `app/[domain]/manifest/route.ts`, `app/[domain]/go/route.ts`, `public/sw.js`
- `components/r3f/kit/`: `usePwaInstall.ts`, `spinScene.tsx` (`useSpinScene`),
  `useSlotScene.ts`, `slotController.ts`, `Wheel3D.tsx`, `conversion.ts`/`types.ts`
- `components/r3f/{jackpot,alchemy,slots/book-of-ra,slots/gates-of-olympus}/*Scene.tsx`
  (accept `config` prop)
