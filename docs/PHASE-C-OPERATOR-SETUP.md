# Per-landing domains (Phase C) — Operator setup (your side)

The code is complete and unit-tested, but it is **inert until you wire up the three providers + secrets**. Until then, the existing manual "attach an externally-owned domain" path still works; the new **Buy & provision / Rotate / Flag / Retry** features just error/no-op without credentials. All credentials are env-only — never commit them.

## 1. Provider accounts

### Namecheap — registrar (buys the domains)
- Use a Namecheap account with **API access** enabled (Profile → Tools → API Access). Namecheap gates the **production** API behind account minimums (balance / spend / domains held) — check their current threshold.
- **Allowlist the egress IP** that will call the API (`NAMECHEAP_CLIENT_IP`). ⚠️ Vercel serverless has **no fixed outbound IP**, so production Namecheap calls need a fixed-IP path (a small proxy / fixed-IP host, or Vercel Secure Compute). This is one of the reasons Phase 1 moves the origin to a VPS.
- Start in **sandbox** (`sandbox.namecheap.com`) with `NAMECHEAP_SANDBOX=true`.
- Env: `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP`, `NAMECHEAP_SANDBOX`.

### Cloudflare — edge DNS + zones
- Create a **scoped API token**: `Zone:Read`, `Zone:Edit`, `DNS:Edit`, `SSL and Certificates:Edit`.
- Env: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

### Vercel — Phase-0 origin (domains attach to your project)
- API token + the project/team ids of the project the app deploys to.
- Env: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`.
- `ORIGIN_DNS_TARGET` — the value the Cloudflare apex record points at for the Vercel origin (default `76.76.21.21`; confirm against Vercel's current recommendation).

## 2. Registrant (WHOIS) contact — required to buy
Domains require a registrant contact. This is **PII** — set it in secrets, use WHOIS privacy where available:
`REGISTRANT_FIRST_NAME`, `REGISTRANT_LAST_NAME`, `REGISTRANT_ADDRESS1`, `REGISTRANT_CITY`, `REGISTRANT_STATE`, `REGISTRANT_POSTAL`, `REGISTRANT_COUNTRY`, `REGISTRANT_PHONE`, `REGISTRANT_EMAIL`.

## 3. Cron secret
`CRON_SECRET` — a random string. The reconciler route `/api/cron/reconcile` (scheduled every 5 min in `vercel.json`) rejects any request without `Authorization: Bearer $CRON_SECRET`. Set the same value as a Vercel project env var — Vercel Cron sends it automatically.

## 4. Where to set them
- **Local testing:** copy the new vars from `.env.example` into `.env` (sandbox values).
- **Production:** Vercel → Project → Settings → Environment Variables (Production + Preview), then redeploy.

## 5. Sandbox smoke test (before spending real money)
With `NAMECHEAP_SANDBOX=true`, a Cloudflare test zone, and a Vercel preview:
1. Admin **DomainsPanel** → enter a keyword → **Suggest** → pick an available name → **Buy & provision**.
2. Watch the status advance `purchasing → dns_pending → attaching → ssl_pending → live` as the 5-min reconciler runs (or POST the cron route with the bearer to advance immediately).
3. Confirm the domain reaches **live** and serves the landing over `https://`.
4. Exercise **Rotate** (buys a fresh domain, flips the landing to it once live, retires the old + tears down its zone/attachment), **Mark flagged**, and **Retry** (resumes a `failed` row from where it stopped — no re-buy when the order already exists).

## 6. Go live
Flip `NAMECHEAP_SANDBOX=false` and point at the production Cloudflare/Vercel. The first real `register()` spends money — the **buy-once guard** ensures one purchase per domain row.

## Known limitations (Phase 0 — by design)
- Origin is **exposed**: Cloudflare records are **DNS-only (gray-cloud)** because a proxied record breaks Vercel's cert provisioning. Origin-hiding + resilient rotation arrive in **Phase 1** (VPS origin, separate plan).
- Vercel's AUP can suspend gambling content; the operator owns licensing / geo-restriction / age-gating of the promoted offers.
- Edge case logged in review: if a registration crashes *between* the paid call and persisting the order id, that row goes `failed` with a "manual check" reason — set its `registrarOrderId` before retrying so Retry resumes instead of re-buying.
