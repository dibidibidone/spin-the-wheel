# Admin Statistics — funnel tracking + Statistics tab — Design Spec

**Date:** 2026-07-01
**Status:** Draft for review
**Repo:** `github.com/dibidibidone/spin-the-wheel`

## 1. Goal

Give the admin a **Statistics** view of each landing's conversion funnel — **visits ("clicks") → downloads (PWA install) → opens (PWA open)** — counted **unique per device**, filterable by landing and by time range. Because the app has no analytics today, this also builds the **in-house event pipeline** that feeds those numbers (the Facebook pixels report to Meta, not to us). The admin gets two top-level tabs: **Landings** (existing management) and **Statistics** (a per-landing dashboard + a precise conversion table).

## 2. Current state

- Multi-tenant, host-routed landings (`getLandingByHost(host)` → `LandingView`). Each landing can have its own domain; all domains are served by the same Next app, so any new route (`/api/track`) is available on every landing host automatically.
- Admin: `app/admin/(panel)/page.tsx` is the **landings list**; `app/admin/(panel)/landings/[id]/page.tsx` hosts the per-landing editor (`LandingEditor` with Content/Branding/Wheel/Settings/Domains tabs). Admin API routes live under `app/api/admin/*` and are session-guarded (NextAuth). There is **no** top-level tab nav yet.
- Funnel-relevant routes today: `app/[domain]/go/route.ts` (in-page "take the prize" claim → 302), `app/[domain]/launch/` (PWA `start_url`; fires the `Lead` pixel when standalone), `app/[domain]/manifest/route.ts`. PWA install uses `usePwaInstall` (install-on-spin).
- Data models: `Landing`, `Prize`, `Domain`, `Admin`. **No event/analytics model.**
- The Facebook pixels (`lib/fbq.ts`, `MetaPixel`, `LaunchRedirect`) fire client-side to Meta and are **not** a usable data source for us.

## 3. Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Data source | **Our own event pipeline** (server-side capture to our DB). Not the Facebook Graph API. |
| Funnel stages | **visit ("click") → install ("download") → open** |
| What a "click" is | A **landing page visit** (arrival), captured on page mount |
| Counting | **Unique per device** — `COUNT(DISTINCT visitorId)` per (landing, type, range). Repeat opens by the same device count once. |
| Time filtering | **Presets (Today / 7d / 30d / All-time) + a custom from–to date picker** |
| Admin shape | **Top-level tabs: Landings | Statistics.** Statistics = filters + per-landing dashboard cards + a conversion table |
| iOS install gap | **Documented, not faked** (see §9). Downloads undercount on iOS; opens are cross-platform |
| Aggregation | Raw event rows + **query-time `DISTINCT`** aggregation (rollups are a future optimization) |

## 4. Data model

New table + enum in `prisma/schema.prisma` (additive; `prisma db push`, no migrations dir — matches the existing pattern):

```prisma
enum EventType {
  VISIT
  INSTALL
  OPEN
}

model Event {
  id        String    @id @default(cuid())
  landingId String
  landing   Landing   @relation(fields: [landingId], references: [id], onDelete: Cascade)
  visitorId String
  type      EventType
  createdAt DateTime  @default(now())

  @@index([landingId, type, createdAt])
  @@index([landingId, type, visitorId])
}
```

- `Landing` gains `events Event[]`.
- `visitorId` is a first-party id (see §5). Unique-per-device counting is `COUNT(DISTINCT visitorId)`.
- `onDelete: Cascade` so deleting a landing removes its events.
- The second index supports the `DISTINCT visitorId` aggregation per (landing, type).

## 5. Capture — the in-house funnel instrumentation

### 5.1 The visitor id

A first-party `visitorId` cookie scoped to the **landing's own domain** (so "unique per device" is per-landing, which is what we want). The **`/api/track` endpoint mints it on first event**: if the request has no `visitorId` cookie, generate one (`crypto.randomUUID()`), use it for the insert, and `Set-Cookie` it on the response: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=63072000` (2 years). The browser sends it automatically on later beacons; the server reads it — the client never touches it.

### 5.2 The beacon endpoint

**`POST /api/track`** (runs on every landing host):
- Body: `{ type: "visit" | "install" | "open" }` (lowercase wire form → `EventType`).
- Derives the landing from the request **host** via `getLandingByHost(host)`. Unknown host → `404` (no event). (Host-deriving, not a client-sent `landingId`, so it can't be spoofed to another landing.)
- Reads/mints `visitorId` (§5.1), inserts one `Event` row, returns `204` (with `Set-Cookie` when minted).
- Invalid/missing `type` → `400`.

### 5.3 The three client beacons

A small browser helper `beaconEvent(type)` does `fetch("/api/track", { method: "POST", body: JSON.stringify({ type }), headers: {...}, keepalive: true, credentials: "same-origin" })` (keepalive so it survives navigation/unload; same-origin so the cookie rides along and `Set-Cookie` is honored).

| Stage | Trigger | Location |
|---|---|---|
| **VISIT** | landing page mount (once) | its **own** client component rendered from `app/[domain]/page.tsx`, alongside `MetaPixel` |
| **INSTALL** | `window` `appinstalled` event | hook in/near the existing `usePwaInstall` flow |
| **OPEN** | standalone open detected | in `LaunchRedirect` (`app/[domain]/launch/`), in the same `standalone` branch where `Lead` fires |

**Our funnel beacons fire independently of Facebook-pixel configuration** — a landing with no `fbPixelIds` still counts visits/installs/opens. Concretely: the VISIT beacon is its own always-mounted component (not part of `MetaPixel`, which renders null when there are no pixels); and the OPEN beacon fires on **every** standalone open, **not** gated behind the `pixelKey`/`pixelIds.length > 0` check that guards the `Lead` pixel. Beacons are **fire-and-forget** (never block the UI or the `/launch` redirect). The OPEN beacon fires inside the existing ~500 ms pre-redirect window.

## 6. Aggregation API

**`GET /api/admin/stats?landingId=<id|all>&from=<ISO>&to=<ISO>`** (session-guarded, mirroring the other `app/api/admin/*` routes):
- Returns per-landing aggregates: `{ landingId, name, visits, downloads, opens, visitToDownloadPct, downloadToOpenPct, visitToOpenPct }[]`.
- Counts via **raw SQL** (`prisma.$queryRaw`) — `SELECT "landingId", type, COUNT(DISTINCT "visitorId") ... WHERE "createdAt" >= from AND "createdAt" < to GROUP BY "landingId", type` — because Prisma's typed `groupBy` can't express `COUNT(DISTINCT field)`.
- `from`/`to` optional (absent = all-time) and are **absolute ISO-8601 instants (UTC)**. The client resolves preset ranges and the custom from–to picker to instants using the admin's local day boundaries before sending; the server does no timezone math (`createdAt >= from AND createdAt < to`). `landingId=all` (or omitted) = every landing.
- Conversion rates computed in the handler; **divide-by-zero → `0`** (rendered as `—`/`0%`). Rounded to one decimal.

## 7. Admin UI

### 7.1 Top-level tabs

Refactor `app/admin/(panel)/page.tsx` to a two-tab shell: **Landings** and **Statistics**.
- **Landings** tab = the current landings-list + create flow (move existing content in; behavior unchanged).
- **Statistics** tab = §7.2. Tab state via the existing client-tab pattern (same as `LandingEditor`).

### 7.2 Statistics tab

- **Filters bar**: a landing selector (`All` + one per landing) and a time-range control — preset buttons (Today / 7d / 30d / All-time) **plus** a custom from–to date picker. Filters drive both the dashboard and the table via one `/api/admin/stats` call.
- **Dashboard**: one **card per landing** (respecting the landing filter — all cards, or just the selected one), each showing Visits / Downloads / Opens and the two headline conversion rates. The "statistics by every landing" at-a-glance view.
- **Table**: precise rows — columns **Landing · Visits · Downloads · Opens · Visit→Download % · Download→Open % · Visit→Open %** — filtered by the selectors. When `All` landings is selected, one row per landing; the table is the exact-numbers complement to the visual dashboard.

## 8. Testing

- **`/api/track`** (`route.test.ts`): mints + `Set-Cookie`s a `visitorId` when absent and inserts an `Event` of the right type; reuses an existing cookie's id; derives the landing from host; unknown host → 404; bad `type` → 400.
- **Beacon helper + the 3 callers**: `beaconEvent` posts the right body; the VISIT component beacons once on mount; the INSTALL hook beacons on `appinstalled`; `LaunchRedirect` beacons `open` only when standalone (and not in a browser tab). Mock `fetch`.
- **Aggregation** (`stats` route test): seeded events → correct **unique** counts (duplicate `visitorId` counted once) and conversion math; `from`/`to` range filtering; `landingId` filter; divide-by-zero → 0.
- **Admin UI**: the two-tab shell renders and switches; the Statistics filters update the request and the rendered table/dashboard; conversion percentages display correctly; empty state (a landing with no events) shows zeros.

## 9. Risks / limitations

- **iOS cannot report installs.** Safari fires no `appinstalled` event and has no install prompt, so the **DOWNLOAD stage undercounts on iOS** (Android/desktop accurate). **OPEN works on both** (standalone detected at `/launch`). Documented, not approximated — inferring iOS installs from first open would pin iOS download-rate near 100 % and distort the funnel.
- **Ad-blockers / privacy tooling** can block the same-origin `/api/track` beacon (less than a third-party pixel, but non-zero) → undercount. Acceptable for an internal dashboard.
- **Bots / prefetch** can inflate VISIT. The client-only beacon + visitor cookie filters most; headless crawlers that run JS could still register. No bot-filtering in v1.
- **Event volume** grows with traffic. The `(landingId, type, createdAt)` and `(landingId, type, visitorId)` indexes keep aggregation fast at expected scale; a daily-rollup table is the future optimization if needed.
- **Funnel monotonicity within a narrow date window** can bend slightly (a device that visited before the window but opened inside it). Over all-time it is monotonic. Standard funnel behavior; noted, not corrected.

## 10. Out of scope (v1)

Daily rollup tables; real-time streaming; bot filtering beyond the visitor cookie; geo/device/UTM breakdowns; CSV export; the Facebook Graph API data source; per-landing-domain cookie consolidation across landings (each landing counts its own uniques).
