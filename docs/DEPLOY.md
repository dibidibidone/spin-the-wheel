# Deployment (Vercel)

Production is hosted on Vercel via the native GitHub integration.

## One-time setup
1. Provision a managed Postgres (e.g. Neon / Vercel Postgres / Supabase). Copy its connection string.
2. In Vercel: **Add New Project → Import** `dibidibidone/spin-the-wheel`. Framework: Next.js (auto-detected).
3. Set **Production Branch = `master`** (Settings → Git).
4. Set environment variables (Production + Preview):
   - `DATABASE_URL` — the managed Postgres URL
   - `AUTH_SECRET` — a fresh secret (`openssl rand -base64 32`)
   - `AUTH_TRUST_HOST=true`
   - `ADMIN_HOST` — the admin hostname (no port in prod)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — real admin credentials (NOT the dev defaults)
   - `BLOB_READ_WRITE_TOKEN` — only if image uploads are used in prod (else the filesystem fallback applies)
   - (Phase C) `NAMECHEAP_*`, `CLOUDFLARE_*`, `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID`, `REGISTRANT_*`, `CRON_SECRET`, `ORIGIN_DNS_TARGET`
5. After the first deploy, run the seed once against prod (`DATABASE_URL=<prod> npm run db:push && DATABASE_URL=<prod> npm run db:seed`) or apply migrations as preferred.

## Per-PR / per-merge
- PRs get a **preview deployment** automatically.
- Merges to `master` deploy to **production**.
- `prisma generate` runs on install via the `postinstall` script.
