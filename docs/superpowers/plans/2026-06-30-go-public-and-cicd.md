# Go Public + CI/CD (Phases A & B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a GitHub Actions CI gate + Vercel CD for the repo, then make the repository public after a secret-history audit, LICENSE, README, and security review.

**Architecture:** Two GitHub Actions workflows (a fast PR `check` gate + a nightly e2e), Vercel's native GitHub integration for deploys (with `prisma generate` on install), branch protection on `master`, then a gated go-public sequence (audit → license/readme → security review → visibility flip). These are config/ops tasks: the "test" for each is a concrete verification command and, where applicable, a live workflow/`gh` run — not a unit test.

**Tech Stack:** GitHub Actions, Vercel, Node 20, Next.js 15, Prisma/Postgres, Vitest, Playwright, gitleaks, `gh` CLI.

## Global Constraints

- Repo: `dibidibidone/spin-the-wheel` (currently **private**), default branch `master`. Work happens on branch `feat/path-to-production`.
- Never commit secrets or registrant PII. `.env` is gitignored; only `.env.example` placeholders + the `${STITCH_API_KEY}` placeholder in `.mcp.json` may be tracked.
- The Prisma client is gitignored — `npx prisma generate` must run before `tsc`/`build` in every environment.
- CI must not require live services: `next build` runs with placeholder env only.
- Unit suite is the gate (`npm test`, currently 294 green); `npx tsc --noEmit` must stay clean.
- Playwright 3D specs exhaust WebGL contexts when run together — run in **≤3-spec batches**.
- LICENSE is **proprietary "All rights reserved"** (public-but-not-reusable). Copyright holder: `dibidibidone`.
- The visibility flip to public happens **only after** the secret-history audit (Task B1) is clean.

## File Structure

**New:**
- `.github/workflows/ci.yml` — PR/master gate: prisma generate → tsc → vitest → next build.
- `.github/workflows/e2e.yml` — nightly + manual Playwright, Postgres service, batched specs.
- `docs/DEPLOY.md` — Vercel connection + env-var + prod-Postgres ops checklist.
- `LICENSE` — proprietary all-rights-reserved notice.
- `README.md` — overview, stack, dev setup, scripts, testing, docs/deploy pointers.

**Modified:**
- `package.json` — add `"postinstall": "prisma generate"`; bump `next` within 15.x (Task B4).

---

### Task A1: CI workflow — the PR gate

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a GitHub Actions job named `check` (the status-check context branch protection requires in Task A4).

- [ ] **Step 1: Reproduce the intended gate locally on current code**

Run (proves the gate definition passes against the real tree and surfaces any extra env `next build` needs):

```bash
DATABASE_URL=postgresql://u:p@localhost:5432/db AUTH_SECRET=ci-dummy AUTH_TRUST_HOST=true ADMIN_HOST=admin.localhost BLOB_READ_WRITE_TOKEN= \
  bash -c 'npx prisma generate && npx tsc --noEmit && npm test && npm run build'
```

Expected: prisma generates, tsc exits 0, Vitest reports all green, `next build` completes. **If `next build` errors on a missing env var, add that var (with a harmless placeholder) to the command and to the `env:` block in Step 2.**

- [ ] **Step 2: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  pull_request:
    branches: [master]
  push:
    branches: [master]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  check:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://u:p@localhost:5432/db
      AUTH_SECRET: ci-dummy-secret-not-real
      AUTH_TRUST_HOST: "true"
      ADMIN_HOST: admin.localhost
      BLOB_READ_WRITE_TOKEN: ""
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm test
      - run: npm run build
```

- [ ] **Step 3: Validate the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('yaml ok')"`
Expected: `yaml ok` (no exception).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI gate (prisma generate, tsc, vitest, next build)"
```

- [ ] **Step 5: Trigger and watch a live run**

Push the branch and open a PR into `master`, then watch the run:

```bash
git push -u origin feat/path-to-production
gh pr create --base master --head feat/path-to-production --title "CI/CD + go-public" --body "Phase A+B"
gh run watch "$(gh run list --branch feat/path-to-production --workflow CI --limit 1 --json databaseId -q '.[0].databaseId')"
```

Expected: the `check` job completes **green**. If red, read the failing step's log, fix (commonly a missing `env:` var for `next build`), commit, and re-watch.

---

### Task A2: Nightly e2e workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes: nothing from other tasks. Independent, non-blocking.

- [ ] **Step 1: Write the workflow**

The 9 specs are split into three ≤3-spec batches (heavy 3D specs separated): `[admin, landing, mobileFunnel]`, `[jackpotVault3d, alchemyLab3d, prototypes]`, `[bookOfRa, gatesOfOlympus, templatePwa]`. Each batch is its own `playwright test` invocation so each gets a fresh WebGL context (the existing `playwright.config.ts` starts/stops its own `webServer` per invocation since `reuseExistingServer` is false in CI).

`.github/workflows/e2e.yml`:

```yaml
name: E2E (nightly)
on:
  schedule:
    - cron: "0 3 * * *"
  workflow_dispatch:
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: spinwheel
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/spinwheel
      AUTH_SECRET: ci-dummy-secret-not-real
      AUTH_TRUST_HOST: "true"
      ADMIN_HOST: admin.localhost:3000
      ADMIN_EMAIL: admin@boomzino.local
      ADMIN_PASSWORD: ChangeMe!Dev123
      BLOB_READ_WRITE_TOKEN: ""
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma db push --skip-generate
      - run: npm run db:seed
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test tests/e2e/admin.spec.ts tests/e2e/landing.spec.ts tests/e2e/mobileFunnel.spec.ts
      - run: npx playwright test tests/e2e/jackpotVault3d.spec.ts tests/e2e/alchemyLab3d.spec.ts tests/e2e/prototypes.spec.ts
      - run: npx playwright test tests/e2e/bookOfRa.spec.ts tests/e2e/gatesOfOlympus.spec.ts tests/e2e/templatePwa.spec.ts
```

- [ ] **Step 2: Validate the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/e2e.yml')); print('yaml ok')"`
Expected: `yaml ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e.yml
git commit -m "ci: add nightly Playwright e2e (Postgres service, batched 3D specs)"
```

- [ ] **Step 4: Trigger manually and watch**

```bash
git push
gh workflow run "E2E (nightly)" --ref feat/path-to-production
sleep 5
gh run watch "$(gh run list --workflow 'E2E (nightly)' --limit 1 --json databaseId -q '.[0].databaseId')"
```

Expected: the job runs; all three batch steps pass. (Non-blocking — if a 3D batch flakes on the runner, note it; it does not gate merges.)

---

### Task A3: Vercel build prep + deploy checklist

**Files:**
- Modify: `package.json`
- Create: `docs/DEPLOY.md`

**Interfaces:**
- Produces: a `postinstall` that generates the Prisma client (Vercel runs it on install); `docs/DEPLOY.md` (referenced by the README in Task B3).

- [ ] **Step 1: Add the `postinstall` script**

In `package.json` `"scripts"`, add `"postinstall": "prisma generate"` (alongside the existing scripts). Final scripts block:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:generate": "prisma generate",
    "postinstall": "prisma generate"
  },
```

- [ ] **Step 2: Verify install regenerates the client**

Run: `rm -rf node_modules/.prisma/client && npm install && test -f node_modules/.prisma/client/index.js && echo "client regenerated"`
Expected: `client regenerated`.

- [ ] **Step 3: Write `docs/DEPLOY.md`**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add package.json docs/DEPLOY.md
git commit -m "build: prisma generate on install + Vercel deploy checklist"
```

- [ ] **Step 5: (Ops, manual) Connect Vercel**

Follow `docs/DEPLOY.md` one-time setup in the Vercel dashboard. Verify a preview deployment builds green on the open PR. (This step is dashboard-driven and not scriptable here; record the production URL in the PR.)

---

### Task A4: Branch protection on `master`

**Files:** none (GitHub settings via `gh api`).

**Interfaces:**
- Consumes: the `check` status context produced by Task A1 (must have run at least once so the context exists).

- [ ] **Step 1: Confirm the `check` context exists**

Run: `gh api repos/dibidibidone/spin-the-wheel/commits/master/check-runs -q '.check_runs[].name' 2>/dev/null | sort -u`
Expected: includes `check`. (If empty, the CI hasn't run on `master` yet — it will once the Task A1 PR merges; apply this task after that first run.)

- [ ] **Step 2: Apply protection (require CI, require PR, solo-friendly)**

```bash
gh api -X PUT repos/dibidibidone/spin-the-wheel/branches/master/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["check"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Expected: returns the protection JSON (HTTP 200). `required_pull_request_reviews: null` keeps it solo-friendly (a PR is required, but no second reviewer).

- [ ] **Step 3: Verify**

Run: `gh api repos/dibidibidone/spin-the-wheel/branches/master/protection -q '.required_status_checks.contexts'`
Expected: `["check"]`.

---

### Task B1: Secret-history audit (go-public gate)

**Files:** none (scan + optional remediation).

**Interfaces:**
- Produces: a verified-clean full history. **Blocks Task B5** (the flip) until clean.

- [ ] **Step 1: Scan the full history of all branches with gitleaks**

```bash
docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest detect --source=/repo --log-opts="--all" --no-banner --redact -v
```

Expected: `no leaks found`. (No Docker? Use the binary: `curl -sSL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_linux_x64.tar.gz | tar xz gitleaks && ./gitleaks detect --log-opts=--all --no-banner --redact -v`.)

- [ ] **Step 2: Cross-check with a pattern grep over all history**

```bash
git log --all -p | grep -nIE 'AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----' | head
```

Expected: no output (empty).

- [ ] **Step 3: Confirm .gitignore coverage**

Run: `grep -E '^\.env|\.env|node_modules|\.next|settings\.local' .gitignore`
Expected: matches for `.env*`, `node_modules`, `.next`. (Add any missing line and commit.)

- [ ] **Step 4: Record the result**

If Steps 1–2 are clean, this gate passes — proceed. **If a real secret is found:** purge it from history and rotate it:

```bash
# Example remediation (run only if a secret was found):
pipx run git-filter-repo --invert-paths --path <leaked/file>   # or --replace-text for inline secrets
git push origin --all --force
git push origin --tags --force
# then ROTATE the exposed credential at its provider, and re-run Steps 1-2 to confirm clean.
```

No commit unless `.gitignore` was edited or remediation ran.

---

### Task B2: LICENSE

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Write the proprietary license**

`LICENSE`:

```
Copyright (c) 2026 dibidibidone

All rights reserved.

This source code is made publicly visible for reference only. No license,
right, or permission is granted to any person to use, copy, modify, merge,
publish, distribute, sublicense, or sell copies of this software or any
portion of it, except with the prior written permission of the copyright
holder.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add proprietary LICENSE (all rights reserved)"
```

---

### Task B3: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

`README.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task B4: Security review + dependency hardening

**Files:**
- Modify: `package.json` (+ `package-lock.json`)

**Interfaces:**
- Consumes: the green unit suite (must stay green after the bump).

- [ ] **Step 1: Run the security review over the branch**

Use the repo's security review (`/security-review`) against the working surface (auth/middleware/admin API/open-redirect guards). Triage findings: fix anything blocking before going public; record non-blockers in the PR description.

- [ ] **Step 2: Audit dependencies**

Run: `npm audit --omit=dev` and `npm audit`
Expected: review output; note any high/critical advisories.

- [ ] **Step 3: Bump `next` within 15.x (carried CVE follow-up) + blob/undici**

```bash
npm i next@15
npm i @vercel/blob@latest
```

(`next@15` resolves to the latest 15.x, addressing the middleware advisory; `@vercel/blob` pulls a newer `undici`.)

- [ ] **Step 4: Re-verify the gate after the bump**

Run:
```bash
DATABASE_URL=postgresql://u:p@localhost:5432/db AUTH_SECRET=ci-dummy AUTH_TRUST_HOST=true ADMIN_HOST=admin.localhost BLOB_READ_WRITE_TOKEN= \
  bash -c 'npx prisma generate && npx tsc --noEmit && npm test && npm run build'
```
Expected: tsc clean, all unit tests green, build completes. If the bump broke anything, fix forward (or pin to the highest working 15.x).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): bump next within 15.x + @vercel/blob (security)"
```

---

### Task B5: Flip the repository to public

**Files:** none.

**Interfaces:**
- Consumes: a clean Task B1 audit; Tasks B2–B4 done. **Do not run until B1 is clean.**

- [ ] **Step 1: Final pre-flip check**

Confirm: B1 scan clean, `LICENSE` + `README.md` present on `master` (merge the Phase A+B PR first if protection requires it), CI green, security review triaged.

- [ ] **Step 2: Flip visibility**

```bash
gh repo edit dibidibidone/spin-the-wheel --visibility public --accept-visibility-change-consequences
```

- [ ] **Step 3: Verify**

Run: `gh repo view dibidibidone/spin-the-wheel --json visibility -q .visibility`
Expected: `PUBLIC`.

---

## Self-Review

**Spec coverage (against `2026-06-30-go-public-cicd-domains-roadmap-design.md`):**
- §4.1 CI workflow → Task A1. ✓
- §4.2 e2e workflow (Postgres service, ≤3-spec batches) → Task A2. ✓
- §4.3 Vercel CD (`postinstall` prisma generate, env, connect) → Task A3 (+ `docs/DEPLOY.md`). ✓
- §4.4 branch protection → Task A4. ✓
- §4.5 prereqs (prod Postgres, real secrets) → documented in `docs/DEPLOY.md` (Task A3). ✓
- §5.1 secret-history audit → Task B1. ✓
- §5.2 LICENSE + README → Tasks B2, B3. ✓
- §5.3 security review + `npm audit` + `next` bump → Task B4. ✓
- §5.4 pre-public content review → folded into B1 Step 4 / B5 Step 1 (informed-consent already accepted in the spec). ✓
- §5.5 flip → Task B5. ✓
- §6 Phase C → **out of scope for this plan** (its own existing plan), per the spec's §9. ✓

**Placeholder scan:** No "TBD/handle errors". The one conditional ("if `next build` needs more env, add it") is a deliberate, bounded contingency with the exact action, not a vague placeholder. The remediation block in B1 only runs if a secret is found and gives exact commands. ✓

**Consistency:** The `check` job name is defined in A1 and consumed by A4 (Steps 1–3) and B5. The placeholder env block is identical in A1 Step 1, A1 Step 2, and B4 Step 4. `docs/DEPLOY.md` is created in A3 and linked from the README in B3. Branch `feat/path-to-production` and repo slug `dibidibidone/spin-the-wheel` are used consistently. ✓

## Out of scope
- Phase C (per-landing domains) — execute the existing `docs/superpowers/plans/2026-06-24-per-landing-domain-acquisition-phase-0.md` after A+B.
- Phase 1 VPS origin; production Postgres provider selection; merging `feat/landing-conversion-redesign` → `master`.
