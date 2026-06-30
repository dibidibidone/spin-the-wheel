# Path to Production — Go Public + CI/CD + Per-landing Domains — Design Spec

**Date:** 2026-06-30
**Status:** Draft for review
**Repo:** `github.com/dibidibidone/spin-the-wheel` (private)

## 1. Goal

Take the spin-the-wheel platform from "private repo, no automation, no live domains" to a production-ready posture, in three sequenced phases:

- **A — CI/CD:** a GitHub Actions quality gate + Vercel deploy.
- **B — Go public:** a secret/history audit, LICENSE + README, security review, then flip the existing repo to public (history preserved).
- **C — Per-landing domains:** programmatic domain acquisition per landing, by **executing the existing Phase-0 plan** (not re-designed here).

Phases A and B are new and fully specced here. Phase C already has a complete design and a 1,659-line implementation plan; this roadmap only **sequences and integrates** it.

## 2. Current state

- Repo on GitHub (**private**), 5 branches, default `master`; this session's work lives on `feat/landing-conversion-redesign` (unmerged).
- **No** CI workflows, **no** `LICENSE`/`README`, **no** `vercel.json`.
- 294 unit tests (Vitest), `tsc --noEmit` clean. Playwright e2e exists; the 3D specs are flaky in large batches under software WebGL (SwiftShader) → run in ≤3-spec batches.
- **Deploy:** none. Dev runs against a local Docker Postgres on `:5433`.
- **Domains:** attach-only today (`lib/vercel.ts`/`lib/domains.ts`, `DomainsPanel`). Full per-landing acquisition is designed (`2026-06-24-per-landing-domain-acquisition-and-hosting-design.md`) and planned (`2026-06-24-per-landing-domain-acquisition-phase-0.md`) but not implemented.
- **Secrets:** `.env` is gitignored; only `.env.example` placeholders and the `${STITCH_API_KEY}` placeholder in `.mcp.json` are tracked. The current tree is verified secret-free.

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Deploy target | **Vercel** (native GitHub app: PR preview deploys + production on `master`) |
| Going public | **Audit full history → LICENSE/README → security review → flip the existing repo** (history preserved) |
| CI gate | **Fast:** `tsc` + Vitest + `next build` on every PR; e2e nightly/manual |
| Domains | **Execute the existing Phase-0 plan as-is** |
| LICENSE | **Proprietary "All rights reserved"** (public-but-not-reusable) — default |
| Production Postgres | Operator's choice (Neon recommended for Vercel) — **out of scope** to pick here |

## 4. Phase A — CI/CD

### 4.1 CI — `.github/workflows/ci.yml`
- **Triggers:** `pull_request` (base `master`) + `push` (`master`). Concurrency group per ref, cancel-in-progress.
- **Job `check`:** `ubuntu-latest`, Node 20, npm cache.
- **Steps:** checkout → setup-node → `npm ci` → `npx prisma generate` → `npx tsc --noEmit` → `npm test` → `npm run build`.
- **Build env (job-level placeholders so `next build` needs no live services):** `DATABASE_URL=postgresql://u:p@localhost:5432/db`, `AUTH_SECRET=ci-dummy`, `AUTH_TRUST_HOST=true`, `ADMIN_HOST=admin.localhost`, `BLOB_READ_WRITE_TOKEN=` (empty — image upload has a filesystem fallback).
- **Rationale:** the Prisma client is gitignored, so it must be generated before `tsc`/build. The build step catches SSR/route errors the unit tests miss.

### 4.2 E2E — `.github/workflows/e2e.yml`
- **Triggers:** `schedule` (nightly, e.g. 03:00 UTC) + `workflow_dispatch`. **Non-blocking** (does not gate merges).
- Postgres 16 **service container**; `DATABASE_URL` → service; `npx prisma db push` + `npm run db:seed`; `npx playwright install --with-deps chromium`.
- Run specs in **≤3-spec batches** (separate steps) to avoid WebGL context exhaustion.

### 4.3 CD — Vercel
- Connect the GitHub repo to a Vercel project via the **Vercel GitHub app**. Production branch = `master` (production deploys); PRs → **preview deployments** with unique URLs.
- `package.json`: add `"postinstall": "prisma generate"` so Vercel generates the client on install; keep `build` = `next build`.
- **Env vars** in Vercel (Production + Preview): `DATABASE_URL` (prod Postgres), `AUTH_SECRET`, `AUTH_TRUST_HOST`, `ADMIN_HOST`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, and (Phase C) the domain-provider secrets.
- **Host routing:** production landings are keyed by the full `Host` header — seed/admin must use production hostnames (no `:port` in prod).

### 4.4 Branch protection
- Once CI is green on a PR, enable branch protection on `master`: require the `check` job + require a PR (no direct pushes). Documented in the README.

### 4.5 Prerequisites (ops — flagged, not solved here)
- Provision a managed production Postgres; set `DATABASE_URL` in Vercel.
- A real `AUTH_SECRET`; production admin credentials (not the dev `ChangeMe!Dev123`).
- A real `BLOB_READ_WRITE_TOKEN` if image uploads are used in prod (else the filesystem fallback applies).

## 5. Phase B — Going public

### 5.1 Secret-history audit (gate)
- Run **gitleaks** (or equivalent) over the **full history of all branches** — a secret could have been committed then removed. (`gitleaks detect` on the repo, plus a `git log --all -p` pattern grep as a cross-check.)
- **If any real secret is found:** purge with `git-filter-repo`/BFG, force-push all branches, and **rotate the exposed secret** at its provider; re-scan to confirm clean.
- Verify `.gitignore` covers `.env*`, `.claude/settings.local.json`, `node_modules`, `.next`, and build artifacts.

### 5.2 LICENSE + README
- **LICENSE:** proprietary "All rights reserved" notice (`Copyright (c) <owner>; all rights reserved; no license granted`) — keeps the repo public-but-not-reusable. (Swap to MIT/Apache only if reuse is wanted.)
- **README.md:** overview, stack, dev-runtime setup (Docker Postgres `:5433`, seed, admin host), a scripts table, testing notes, and a pointer to `docs/superpowers` for specs/plans. **No real production secrets/credentials** in the README.

### 5.3 Security review + dependencies
- Run the repo's **security review** over the surface (auth/middleware/admin API/open-redirect guards).
- `npm audit` + apply the carried follow-up: bump `next` within 15.x (CVE-2025-66478 middleware advisory) and `@vercel/blob`/undici.

### 5.4 Pre-public content review (informed consent)
- Going public exposes: the **domain-rotation design** (registering fresh domains and rotating them when flagged by Safe Browsing / ad-network / registrar AUP for gambling promos) under `docs/superpowers`; **dev admin creds** in docs (`admin@boomzino.local` / `ChangeMe!Dev123` — dev-only, low risk, but visible); internal operational notes.
- **Action:** confirm the owner accepts this exposure; optionally redact dev creds / sensitive ops notes from docs. **Default:** leave docs as-is (no production secrets are present).

### 5.5 Flip
- `gh repo edit dibidibidone/spin-the-wheel --visibility public --accept-visibility-change-consequences`.

## 6. Phase C — Per-landing domains (execute the existing Phase-0 plan)

- **Implementation = `docs/superpowers/plans/2026-06-24-per-landing-domain-acquisition-phase-0.md`** (11+ TDD tasks: status vocabulary, pure lifecycle `nextStep`, provider adapters Namecheap/Cloudflare/Vercel, domain service, reconciler, admin UI). **No re-design.**
- **Integration this roadmap adds:**
  - Secrets (`NAMECHEAP_*`, `CLOUDFLARE_*`, `VERCEL_*`, `REGISTRANT_*` PII, `CRON_SECRET`, `ORIGIN_DNS_TARGET`) → Vercel env (prod/preview) + GitHub Actions **repo secrets** (only for the gated sandbox job). Never committed — the public repo stays secret-free.
  - Reconciler `app/api/cron/reconcile/route.ts` → **Vercel Cron** via `vercel.json` `crons` (e.g. every 5 min), guarded by a `CRON_SECRET` header.
  - **Sandbox integration tests** (Namecheap sandbox / Cloudflare test zone / Vercel preview attach) → gated behind an env flag, run **only in the nightly e2e workflow** (the plan's Task 11). Never in the PR unit gate.
  - **Depends on Phase A:** the Vercel project must be live and `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` set — the Phase-0 attach step targets that project.
- **Caveats (restated from the existing design):** Phase-0 keeps Vercel as the origin (Cloudflare records **DNS-only**), so the origin is exposed and under Vercel's AUP; **Phase 1 (VPS origin)** is the resilient target and a separate later plan.

## 7. Ordering & dependencies

**A (CI/CD) → B (public) → C (domains).**
- **A first:** establishes the quality gate + deploy; C's attach step needs A's Vercel project.
- **B after A:** a green CI + clean build is a good precondition for public; the history audit gates the flip.
- **C last:** the large feature, executed via its existing plan once A+B are in place.
- The CD connection (A.3) and the history audit (B.1) can overlap; the **flip to public happens only after the audit passes**.

## 8. Testing strategy

- **A:** the workflows are the artifact — verify by opening a PR and confirming the `check` job runs `tsc` + Vitest + `next build` green and a Vercel preview deploys; verify the e2e workflow via `workflow_dispatch`.
- **B:** the gitleaks scan (clean) is the evidence; plus the security-review report and a triaged `npm audit`.
- **C:** per the Phase-0 plan — pure lifecycle unit tests, adapter contract tests (mocked `fetch` + recorded fixtures), gated sandbox integration. The PR gate keeps running the full unit suite.

## 9. Deliverables

- This spec.
- An **implementation plan for Phases A + B** (produced next via the writing-plans skill).
- **Phase C = the existing Phase-0 plan**, executed after A+B (not re-written here).

## 10. Out of scope

- **Phase 1 VPS origin** + origin-hiding + automated rotation triggers (separate later plan, per the domain design).
- Picking the production Postgres provider / infrastructure-as-code.
- Merging `feat/landing-conversion-redesign` → `master` (a separate decision; CI applies to it via PR).
- Open-sourcing for reuse (license is proprietary by default).
- Compliance / licensing / geo-restriction / age-gating of the promoted gambling offers (operator responsibility).
