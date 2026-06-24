# Design: Configurable wheels & slots + casino logo + unified PWA flow

- **Date:** 2026-06-24
- **Status:** Approved (brainstorming) — pending implementation plan
- **Branch context:** `feat/igaming-visual-polish`
- **Builds on:** `2026-06-23-landing-templates-pwa-download-design.md` (templates + PWA) and the
  template-at-creation / template-aware-editor work that followed it.

## 1. Summary

Make the admin editor and landings fully template-aware and PWA-driven:

1. The **2 3D wheels** (Jackpot Vault, Alchemy Lab) render the operator's **configured prizes** and
   land on the **selected winning slot** — like the 2D wheel already does. The wheel face stops being
   decorative.
2. The **casino logo** is editable in **Settings** for **every** template and renders on the page
   (the 3D scenes currently hard-code `/boomzino-logo.svg`).
3. The landing's offer URL collapses to **one link** (`redirectUrl`) — the link the installed **PWA
   opens** — and the **PWA download/open flow applies to all 3 wheels (2 3D + the 2D)** and both slots:
   **click spin → install the PWA; win → open it.**
4. The **2 slots** drop all wheel/prize config; their editor keeps only casino logo, PWA link, PWA
   logo, **win text**, and **spins before win**.

## 2. Decisions (resolved in brainstorming)

- **3D wheels are real, DB-driven wheels.** Segment count = prize count; each segment uses the prize's
  label + colour; the wheel lands on the prize marked winner. (Chosen over keeping the bespoke themed
  face.)
- **One PWA link.** A single URL field (`redirectUrl`) is the link the PWA opens. The separate `pwaUrl`
  column is removed; `redirectPrizeParam` is dropped from the UI.
- **Slots have no wheel config.** No Wheel tab, no prize rows; their prize text is a single "Win text"
  field and the win spin is "Spins before win", both in Settings.

## 3. Template kinds

A single classifier drives editor structure and rendering:

```
templateKind(template):
  "classic-2d"                      -> "wheel-2d"
  "jackpot-vault" | "alchemy-lab"   -> "wheel-3d"
  "book-of-ra" | "gates-of-olympus" -> "slot"
```

| Kind | Editor tabs |
|---|---|
| `wheel-2d` | Content · Branding · Wheel · Settings · Domains |
| `wheel-3d` | Content · Wheel · Settings · Domains |
| `slot` | Content · Settings · Domains |

(Branding already hidden for non-`classic-2d`. Slots additionally lose the Wheel tab.)

## 4. Editor: Settings tab

`components/admin/SettingsTab.tsx` (saved via `PATCH /api/admin/landings/[id]`):

- Existing: Name, Slug, Status, Template.
- **Casino logo** — `logoUrl`, image upload (reuses the Blob upload route). Shown for all kinds.
- **App link** — `redirectUrl`, url. Labelled to make clear it's the link the PWA opens. Shown for all.
- **PWA app name** — `pwaName`. **PWA logo** — `pwaIconUrl`, image upload. Shown for all.
- **Slots only:** **Win text** — `winText`, text. **Spins before win** — `spinsBeforeWin`, number.

The PWA group is no longer gated to non-classic templates — the 2D wheel is now a PWA wheel too.

## 5. Editor: Wheel tab (wheels only)

`components/admin/WheelTab.tsx` (saved via `PUT /api/admin/landings/[id]/wheel`):

- Keeps: prize rows (label / icon / colour / weight), the **winner radio**, **Spins before win**.
- **Removes** the **Redirect URL** and **Prize query param** inputs (the URL is the single App link in
  Settings now). `saveWheel` no longer writes `redirectUrl`/`redirectPrizeParam`.

## 6. 3D wheels become DB-driven

- `components/r3f/kit/Wheel3D.tsx` renders **segments from data**, not `theme.labels`. New prop
  `segments: { label: string; color: string }[]` + `winningIndex: number`; segment count = `segments.length`.
  The theme keeps its styling fields (rim/bulb/gold/label colours, radius, materials); the winner
  segment gets the gold/jackpot accent.
- `buildSceneConfig` (`lib/sceneConfig.ts`) passes the landing's prizes as `segments` (label + colour)
  and the `winningIndex`/`segmentCount` for wheel templates.
- `createSpinController` already accepts `segments` (count) and `winningIndex`; `useSpinScene` threads
  the real segment count so landing math is correct.
- **Backward-compat:** when a scene gets no `config` (the `/prototypes/3d/*` routes), `Wheel3D` falls
  back to building `segments` from the theme's existing `labels`/`segmentColors`, so prototypes look
  unchanged.

## 7. Casino logo everywhere

- `OverlayCopy`/scene config carry a **logo source**. `SpinOverlay` + `WinSheet` take a `logoSrc` prop
  (default `/boomzino-logo.svg`); production passes `view.assets.logoUrl` via `buildSceneConfig`.
- The 2D `LandingScene` already renders `logoUrl`. No change there beyond surfacing the field in Settings.

## 8. Unified PWA flow (all 3 wheels + both slots)

- **One link:** `/go` (`app/[domain]/go/route.ts`) redirects to `redirectUrl` (drop the `pwaUrl`
  fallback). Manifest (`app/[domain]/manifest/route.ts`) unchanged (name=`pwaName`, icon=`pwaIconUrl`,
  `start_url:"/go"`).
- **buildMetadata** links the manifest + appleWebApp for **all** templates (was non-`classic-2d` only).
- **2D wheel wiring (the new, higher-risk piece):** wire `usePwaInstall` into the 2D landing
  (`app/[domain]/Wheel.client.tsx` / `useSpinController` + `LandingScene`): first spin → `promptInstall()`;
  win/claim → open `/go` (instead of the old direct redirect); render `IosInstallHint`; the page links
  the manifest. The 3D scenes + slots already do this.

## 9. Data model (`prisma/schema.prisma`)

- **Add** `winText String @default("")` — the displayed win prize text. Precedence in
  `toLandingView`/`buildSceneConfig`: `winText` when non-empty, else the winning prize's label, else
  `winTitle`.
- **Remove** `pwaUrl` (collapsed into `redirectUrl`). Update `/go`, validation, `EditableLanding`,
  `LandingView`/`toLandingView`, `SettingsTab`, and `prisma/seed.ts`.
- `redirectPrizeParam` stays in the schema but is removed from the editor UI and from `saveWheel`'s
  required input (it simply isn't set anymore).
- Migration via `npm run db:push` + `npm run db:generate` (no `prisma/migrations/`).

## 10. Validation & service

- `lib/admin/validation.ts`: patch schema gains `winText: z.string()` and `redirectUrl: url` (so the
  App link saves via PATCH); drop `pwaUrl`. The wheel schema drops `redirectUrl` and
  `redirectPrizeParam` entirely and keeps prizes/winningIndex/spinsBeforeWin; `saveWheel` no longer
  writes those two columns (`redirectUrl` is set at creation and thereafter edited via the Settings
  PATCH; `redirectPrizeParam` is simply never set).
- `lib/admin/landingService.ts`: `updateLanding` already passes the patch through; `saveWheel` stops
  writing `redirectUrl`/`redirectPrizeParam`. Per-template `TEMPLATE_PRESETS` set `winText` for slots
  (their preset `winnerLabel` becomes the default `winText`).

## 11. Non-goals

- No new landing templates; no app-store/native packaging.
- No lead-capture/analytics backend (claim stays best-effort).
- No redesign of the 3D scenes' materials/backdrops — only the wheel *face content* becomes data-driven.
- No automatic icon resizing (single uploaded PWA icon reused, as before).

## 12. Risks

- **2D PWA wiring** touches the legacy 2D spin/claim flow — the highest-risk change; covered by an e2e
  smoke of the 2D install path.
- **Variable-segment 3D wheel:** prize counts other than the themed default change the wheel's look;
  the winner-highlight + colours come from prize data. Validated by a `Wheel3D` unit test and an e2e
  that asserts the configured prize labels render.
- Removing `pwaUrl` is a destructive column drop (dev data only; no prod data).

## 13. Testing

- **Unit:** `templateKind` mapping; `LandingEditor` tabs per kind (2D/3D/slot); `SettingsTab` field set
  per kind (slot shows Win text + Spins; wheels don't); `WheelTab` no longer renders the URL inputs;
  `buildSceneConfig` maps prizes→segments, `winText` precedence, and `logoUrl`; `Wheel3D` renders N
  segments + marks the winner; validation accepts `winText`/`redirectUrl` and rejects `pwaUrl`.
- **E2E (alt-port harness, ≤3-spec batches per the SwiftShader gotcha):** a seeded 3D-wheel landing
  shows its configured prize labels + casino logo, serves `/manifest`, and `/go` 302s to `redirectUrl`;
  a seeded slot landing shows win text and has no Wheel tab; the 2D wheel boots with the manifest linked
  and the install trigger present.

## 14. File touch-list (orientation)

- `prisma/schema.prisma` (+ push), `prisma/seed.ts`, `prisma/seedData.ts` (if it sets `pwaUrl`)
- `lib/admin/validation.ts`, `lib/admin/landingService.ts`, `lib/admin/types.ts`, `lib/adminClient.ts`
- `lib/types.ts`, `lib/tenant.ts`, `lib/sceneConfig.ts`, plus a new `lib/templateKind.ts`
- `app/[domain]/buildMetadata.ts`, `app/[domain]/go/route.ts`, `app/[domain]/Wheel.client.tsx`,
  `app/[domain]/useSpinController.ts`
- `components/admin/LandingEditor.tsx`, `SettingsTab.tsx`, `WheelTab.tsx`
- `components/landing/LandingScene.tsx` (PWA wiring + logo already present)
- `components/r3f/kit/Wheel3D.tsx`, `SpinOverlay.tsx`, `WinSheet.tsx`, `sceneConfig.ts`, `types.ts`,
  `spinScene.tsx`; `components/r3f/{jackpot,alchemy}/*` scenes + their `theme.ts`
- Tests alongside each.
