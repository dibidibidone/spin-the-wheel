# Spin the Wheel

Multi-tenant "spin the wheel" / slot casino-promo landing platform. A single
Next.js app serves many landings, matched by `Host` header; each landing is a
scripted, replayable wheel or slot that guarantees a win on the Nth spin and
funnels into a lead-capture / app-download flow. Admin CMS for content,
branding, wheel/slot config, settings, and custom domains.

## Stack
Next.js 15 (App Router), React 19, TypeScript (strict), Prisma + Postgres,
NextAuth v5, React-Three-Fiber (3D landings), Vitest + Testing Library,
Playwright. Deploys on Vercel.

## Local development
1. Start Postgres (Docker): a Postgres on host port `5433`, db `spinwheel`,
   user/pass `postgres`/`postgres`.
2. Copy `.env.example` to `.env` and fill values (`DATABASE_URL` points at
   `:5433`; set `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_HOST`).
3. Install + set up the DB:
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   npm run dev
   ```
4. Public landing: `localhost:3000`. Admin: `admin.localhost:3000`
   (`*.localhost` is loopback in Chrome/Firefox). Seeded admin:
   `admin@boomzino.local` / `ChangeMe!Dev123` (dev only).

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | unit + component tests (Vitest) |
| `npm run e2e` | Playwright end-to-end |
| `npm run db:push` / `db:seed` / `db:generate` | Prisma schema push / seed / client |

## Testing & CI
- `npm test` (unit) and `npx tsc --noEmit` run on every PR via GitHub Actions.
- Playwright e2e runs nightly (3D specs are batched to avoid WebGL context
  exhaustion).

## Deployment
See [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Design docs
Specs and implementation plans live under `docs/superpowers/`.

## License
Proprietary — all rights reserved. See [`LICENSE`](LICENSE).
