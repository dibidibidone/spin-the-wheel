# Per-landing Facebook Pixels + Lead on PWA open — Design Spec

**Date:** 2026-07-01
**Status:** Draft for review
**Repo:** `github.com/dibidibidone/spin-the-wheel`

## 1. Goal

Give every landing its own set of Facebook (Meta) Pixels, configured in the admin, that load on the landing and fire a `Lead` conversion at the exact moment the user has **downloaded the PWA and opened it** (the admin-configured link loads). Each landing can connect **several** pixels (a list); all initialize and receive the events. The conversion is measurable on **both iOS and Android**.

## 2. Current state

- Multi-tenant, host-routed landings (`getLandingByHost` → `toLandingView` → scene). 5 templates (classic-2d + jackpot / alchemy / book-of-ra / gates).
- PWA per landing: manifest at `app/[domain]/manifest/route.ts` (`start_url: "/go"`, `display: "standalone"`); install-on-spin (`usePwaInstall`); the "take the prize" claim → `app/[domain]/go/route.ts` (server **302** → `redirectUrl`, the admin-configured link).
- Per-landing config pattern: scalar/array fields on `Landing` → `toLandingView` (`LandingView`) → scene/overlay; admin tabs edit them. `Domain.nameservers String[]` establishes the Postgres-array pattern.
- No analytics / pixel today.

## 3. Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Pixels per landing | **A list** (several); all `init` + receive events |
| Events | **Lean:** `PageView` (auto on landing load) + `Lead` (on PWA open) only |
| `Lead` definition | The installed PWA is **opened** (launches `start_url` in standalone) and forwards to the admin link |
| `/go` vs new route | Keep `/go` instant 302 (in-page claim); add **`/launch`** client interstitial as the PWA `start_url` |
| Consent | Pixel loads **unconditionally**; consent/GDPR = operator responsibility |
| Conversions API (server-side) | **Out of scope** (future enhancement) |

## 4. Data model + read path

- `Landing.fbPixelIds String[] @default([])` (Postgres array; mirrors `Domain.nameservers String[]`).
- `lib/types.ts` `LandingView`: add `fbPixelIds: string[]`.
- `lib/tenant.ts` `LandingRow` + `toLandingView`: map it through.
- Pixel IDs are numeric strings (Meta IDs ~15–16 digits), stored verbatim.

## 5. Pixel load + PageView — `MetaPixel`

- **Shared helper `lib/fbq.ts`** (pure-ish browser module, no React): `ensureBaseSnippet()` (injects the `fbevents.js` loader + `window.fbq` queue exactly once, idempotent), `initPixels(ids: string[])` (`fbq('init', id)` for each, tracked so an id inits only once), `track(event, params?)` (`fbq('track', event, params)`). Both `MetaPixel` (PageView) and `LaunchRedirect` (Lead) use it — no duplicated snippet.
- New client component `components/analytics/MetaPixel.tsx`: `MetaPixel({ pixelIds }: { pixelIds: string[] })`.
- Renders **nothing** when `pixelIds` is empty.
- Otherwise injects the Meta base snippet (standard `fbevents.js` loader) **once**, then `fbq('init', id)` for **each** id, then `fbq('track','PageView')` (one PageView covers all initialized pixels). Loader via `next/script` (`afterInteractive`). Also renders a `<noscript>` pixel `<img>` per id (`https://www.facebook.com/tr?id=<id>&ev=PageView&noscript=1`).
- Rendered from the shared landing entry `app/[domain]/page.tsx` so all 5 templates inherit it: `<MetaPixel pixelIds={view.fbPixelIds} />` alongside the scene.
- `window.fbq` is a shared queue: with multiple pixels initialized, `track` fires to **all** of them (matches "all pixels get the events").

## 6. `Lead` on PWA open — `/launch` interstitial

- New `app/[domain]/launch/page.tsx`: a server component fetches the landing (`getLandingByHost`) for `fbPixelIds` + `redirectUrl`, and renders a minimal client `<LaunchRedirect pixelIds redirectUrl />` plus a small "Opening…" UI.
- `LaunchRedirect` (client), on mount:
  - **If standalone** (`window.matchMedia('(display-mode: standalone)').matches` or iOS `navigator.standalone === true`) → init the landing's pixels via `lib/fbq.ts` (`ensureBaseSnippet` + `initPixels`), `track('Lead')`, then after **~500 ms** `window.location.replace(redirectUrl)`.
  - **Else** (not standalone — a stray browser visit) → `window.location.replace(redirectUrl)` immediately, **no `Lead`**.
- Manifest `start_url` changes from `/go` to `/launch` (`app/[domain]/manifest/route.ts`).
- `/go` (`app/[domain]/go/route.ts`) is **unchanged** — the in-page "take the prize" claim still server-302s to `redirectUrl` (instant, no `Lead`, no flash).
- Result: `Lead` fires once per real PWA open, attributed to the landing's pixel(s), on iOS + Android. The external offer page is third-party (no pixel there; the `Lead` already fired on `/launch`).
- The ~500 ms delay ensures the pixel beacon sends before navigation (Meta's `track` uses image/`sendBeacon`; the delay is belt-and-suspenders).

## 7. Admin

- Settings tab (`components/admin/SettingsTab.tsx`): a **"Facebook Pixels"** textarea (one ID per line / comma-separated) bound to the editable landing; on save, split/trim/filter → array. Helper text explaining multiple-per-line + that it powers PageView + the PWA-open `Lead`.
- Validation (`lib/admin/validation.ts` `patchSchema`): `fbPixelIds` = array of strings each matching `^\d{6,20}$`; empty → `[]`. (The textarea parsing lives in the component; the schema validates the resulting array.)
- Plumb through `lib/admin/types.ts` (`EditableLanding.fbPixelIds`), `lib/admin/landingService.ts` (select + return + save payload).

## 8. Testing

- `lib/fbq.test.ts`: `ensureBaseSnippet` injects the loader once (idempotent), `initPixels` calls `fbq('init', id)` per id (and not twice for the same id), `track` calls `fbq('track', …)` — against a mocked `window.fbq`.
- `lib/tenant.test.ts`: `toLandingView` threads `fbPixelIds`.
- `MetaPixel` component test: 2 ids → `fbq('init', …)` for each + one `PageView` + 2 `<noscript>` imgs; empty list → renders null / no script.
- `LaunchRedirect` test: matchMedia standalone=`true` → `fbq('track','Lead')` called **and** redirect to `redirectUrl`; standalone=`false` → redirect, `Lead` **not** called. (Mock `window.matchMedia`, `window.fbq`, `window.location.replace`.)
- Admin: `validation.test` accepts numeric IDs, rejects non-numeric; `SettingsTab.test` edits + saves the field (array round-trip).
- Manifest: assert `start_url` is `/launch` (extend an existing manifest test or add one).

## 9. Out of scope

- Server-side **Conversions API** (CAPI), event dedup / `event_id`, the intermediate funnel events (Spin / install-prompt / Android-install), a consent/GDPR gate, and per-pixel event targeting (`trackSingle` — all pixels get all events).

## 10. Risks / notes

- Ad-blockers / iOS ITP can block the browser pixel → undercount (the reason CAPI exists; out of scope here).
- `fbevents.js` loads from `connect.facebook.net`; if a Content-Security-Policy is added later it must allowlist that origin + `facebook.com/tr`.
- The `Lead`-beacon-before-redirect timing relies on the ~500 ms delay; on a very fast redirect a slow pixel could still drop the event — acceptable for this funnel.
- Going public (the repo is public): pixel IDs are not secrets — they ship in client HTML by design.
