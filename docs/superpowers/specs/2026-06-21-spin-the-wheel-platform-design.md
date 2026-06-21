# Spin-the-Wheel Landing Platform — Design Spec

**Date:** 2026-06-21
**Status:** Approved (brainstorming complete, ready for implementation planning)

## 1. Summary

A multi-tenant platform where a single **CMS** manages many **spin-the-wheel
landing pages**. Each landing is served on its own custom domain, and every
detail — texts, logo/images, theme colors, and the wheel's prizes & spin
mechanics — is editable centrally from the CMS. Edits go live instantly on all
domains.

The public landing is a mobile-first "Spin the Wheel" promo styled after the
**Boomzino casino** brand: an extremely dark-green background with slightly
brighter green accent buttons, minimalist and clean, with pops of casino gold
for prizes. Layout mirrors the supplied reference: a `‹ Back` row, a glowing
**"Spin the Wheel"** heading + subtitle, a side coin, and a large wheel anchored
to the bottom of the screen (top three-quarters visible, cut off at the bottom)
with a gold downward pointer and a glowing green center spin button.

The wheel is **scripted**: the visitor is guaranteed to win on the **Nth spin**
(N editable per landing); earlier spins land on a **near-miss** wedge beside the
winning wedge. Winning shows a popup that **redirects** to a per-landing URL.

## 2. Confirmed decisions

| Decision | Choice |
| --- | --- |
| Scope | Multi-tenant platform (CMS + many landings, each its own domain) |
| Domain serving | Dynamic, host-based routing; edits live instantly (no rebuild) |
| Stack | Next.js (App Router) full-stack, single codebase |
| Hosting / TLS | Vercel managed; custom domains attached via Vercel Domains API (auto TLS) |
| Database | Postgres (Vercel Postgres / Neon) via Prisma |
| Auth | Single seeded admin account; Auth.js credentials provider (session cookie) |
| Claim action | Redirect to a per-landing URL (optionally pass won prize as a param) |
| Editable per landing | Texts; logo/favicon/images; theme colors; wheel prizes & weights |
| Spin mechanic | Scripted: guaranteed win on the Nth spin (N editable per landing) |
| Pre-win spins | Near-miss — stop on the wedge beside the winning wedge ("Almost!") |
| Return visit | Replayable — journey resets on reload (in-memory counter, no cookies) |
| Media storage | Vercel Blob |
| Styling | Plain CSS + CSS custom variables (no Tailwind), Outfit display font |

## 3. Architecture & tenant resolution

One Next.js app presents two faces, decided by hostname in `middleware.ts`:

- **Admin host** (`ADMIN_HOST` env): serves `/admin` (dashboard + editors) and
  `/api/admin/*`.
- **Any other host**: treated as a **landing domain**. Middleware rewrites the
  request to `app/[domain]/page.tsx`, which SSR-renders the landing for that
  host from the database. An unknown or unpublished host renders 404.

Because the landing is server-rendered per request from the DB, CMS edits are
immediately reflected on every domain with no publish/rebuild step.

**Custom domains:** In the CMS, adding a domain to a landing calls the **Vercel
Domains API** (`POST /v{n}/projects/{projectId}/domains`) to attach the domain
to the project (Vercel auto-provisions TLS). The CMS then displays the DNS
record the operator must set and polls verification status.

## 4. Data model (Prisma / Postgres)

- **Landing**
  - `id`, `slug`, `name`, `status` (`draft` | `published`), `createdAt`, `updatedAt`
  - **texts**: `heading`, `subtitle`, `backLabel`, `winTitle`, `claimLabel`, `almostText`
  - **theme** (JSON): `bg`, `surface`, `accent` (green), `gold`, `text`, `muted`
  - **assets**: `logoUrl`, `faviconUrl`, `coinImageUrl`, `bgImageUrl` (nullable)
  - **spin config**: `spinsBeforeWin` (int N), `winningPrizeId` (FK → Prize),
    `preWinBehavior` (`near-miss`), `redirectUrl`, `redirectPrizeParam` (optional template)
  - **SEO**: `metaTitle`, `metaDescription` (default-derived from `heading`)
  - relation: `prizes` (Prize[]), `domains` (Domain[])
- **Prize** (wheel segment)
  - `id`, `landingId`, `order`, `label`, `icon`, `color`, `weight`
  - The winning segment is referenced by `Landing.winningPrizeId`.
- **Domain**
  - `id`, `landingId`, `hostname` (unique), `verified` (bool), `vercelStatus`, `createdAt`
  - Drives the host → landing lookup.
- **Admin**
  - `id`, `email`, `passwordHash` (bcrypt). Single seeded account.

No `Lead` model — claim is redirect-only, no data capture.

## 5. Public landing renderer

- `app/[domain]/page.tsx` (server component):
  - Fetch the landing by host (via `lib/tenant.ts`); 404 if missing or unpublished.
  - Inject the landing's `theme` as **inline CSS custom variables** on a root
    wrapper (`style={{ '--bg': ..., '--accent': ..., ... }}`).
  - Render the Boomzino-styled layout: `‹ Back` row, glowing **"Spin the Wheel"**
    heading + subtitle, side coin image, large **SVG wheel** anchored to the
    bottom and cut off (top ~¾ visible), **gold downward pointer**, glowing green
    center spin button.
  - `generateMetadata` sets title/description and favicon from the landing config.
- `Wheel.client.tsx` (client component): renders the interactive wheel and owns
  the spin engine state.
- **Styling:** a global stylesheet plus CSS custom variables for per-landing
  theming; geometric display font (Outfit) loaded via `next/font`.

### Wheel rendering

SVG: each wedge is a `<path>`; labels and small icons are placed along each
segment; the whole wheel rotates via a single CSS `transform: rotate(...)` with
an ease-out cubic-bezier transition (~4.5s). Crisp on mobile, precise landing.

## 6. Spin engine — `lib/spin.ts` (pure, unit-tested)

Config delivered to the client per landing: ordered segments with their center
angles, `spinsBeforeWin` (N), the winning segment's index, and `preWinBehavior`.

On each spin tap, increment an in-memory counter:

- **counter < N** → target = **near-miss** wedge (adjacent to the winning wedge);
  animate with extra full turns (~4.5s ease-out); show **"Almost! Spin again"**;
  re-arm the button.
- **counter === N** → target = **winning wedge**; animate; show the **win popup**
  with the prize; **Claim → redirect** to `redirectUrl` (optionally with the won
  prize as a query param).

**Replayable:** the counter lives in memory only, so a reload restarts at spin #1
— no cookies or persistence.

**Angle math:** with K segments each spanning `360/K`°, rotate so the target
wedge's center sits under the top pointer; accumulate rotation forward across
successive spins so the wheel always turns in one direction. The pure functions
(`nextTargetIndex(counter, N, winningIndex, behavior)` and
`rotationForIndex(index, K, accumulatedRotation)`) are unit-tested.

## 7. CMS / admin (`/admin`, single login)

- **Auth:** Auth.js credentials provider; one seeded admin (email + bcrypt). All
  `/admin/*` pages and `/api/admin/*` routes are guarded.
- **Dashboard** (`/admin`): list landings (name, domains, status); create new.
- **Landing editor** (`/admin/landings/[id]`), tabbed:
  - **Content** — texts.
  - **Branding** — image uploads (logo/favicon/coin/bg → Vercel Blob), theme
    color pickers, live preview.
  - **Wheel** — segment list editor (add/remove/reorder; per segment label,
    icon, color, weight); pick the winning segment; set `spinsBeforeWin`; set
    `redirectUrl` (+ optional prize param).
  - **Domains** — add a domain (calls Vercel API), show DNS instructions and
    verification status.
  - **Settings** — slug; publish/unpublish.
- **Preview:** `/admin/landings/[id]/preview` renders the landing using current
  DB values.
- **API:** `/api/admin/*` for landing/prize/domain CRUD, domain attach, and
  uploads — all auth-guarded.

## 8. Error handling

- Unknown or unpublished domain → 404 page.
- Vercel domain-attach failure → surfaced in the CMS with retry and DNS help.
- Image upload → type/size validation with clear errors.
- Auth guard on every admin route and admin API.
- DB/render failures caught by error boundaries.

## 9. Testing strategy

- **Unit:** spin target sequence (`nextTargetIndex`, `rotationForIndex` across N,
  winning index, near-miss); theme → CSS-variable mapping.
- **Integration:** host → landing resolution; landing renders the correct config;
  admin CRUD; domain attach against a mocked Vercel API.
- **E2E (Playwright):** on a landing host, spin N times → near-miss then win
  popup → Claim redirect; admin login → edit a text → see it reflected on the
  landing.

## 10. Project structure

```
app/
  middleware.ts                 # host → rewrite to /[domain] or allow /admin
  [domain]/
    page.tsx                    # SSR landing by host
    not-found.tsx
    Wheel.client.tsx            # interactive wheel + spin engine
  admin/
    layout.tsx                  # auth guard
    page.tsx                    # dashboard
    login/page.tsx
    landings/[id]/page.tsx      # editor
    landings/[id]/preview/page.tsx
  api/
    admin/landings/route.ts     # CRUD
    admin/domains/route.ts      # attach via Vercel API
    admin/upload/route.ts       # Vercel Blob
    auth/[...nextauth]/route.ts
prisma/schema.prisma
lib/
  tenant.ts                     # host → landing lookup
  spin.ts                       # pure spin-target engine (tested)
  theme.ts                      # theme → CSS variables
  vercel.ts                     # Vercel Domains API client
  db.ts                         # Prisma client
  auth.ts
components/
  wheel/WheelSvg.tsx
  wheel/Pointer.tsx
  wheel/WinModal.tsx
styles/
tests/
```

## 11. Out of scope (YAGNI)

- Lead/data capture (claim is redirect-only).
- Multi-user accounts / roles (single admin).
- Static publish/CDN export (dynamic SSR chosen).
- Weighted-random outcomes (outcome is scripted; `weight` retained on Prize for
  cosmetic/future use only).
- Persistent spin limits / one-time claim (journey is replayable).
```
