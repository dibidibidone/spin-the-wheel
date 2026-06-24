# Per-landing domain acquisition + hosting — Design Spec

**Date:** 2026-06-24
**Status:** Draft for review
**Branch:** `feat/igaming-visual-polish` (or a fresh `feat/domain-acquisition` branch)

## 1. Goal

Give every landing its **own freshly-registered domain**, bought and provisioned **programmatically** from the admin, and hosted resiliently for an iGaming/casino burner-rotation workload: when a domain gets flagged (Google Safe Browsing, ad-network review, registrar/host AUP), **retire it and swap in a fresh one** without touching the landing's content. One landing = one live domain at a time, with a rotation history.

This extends — does not replace — the existing multi-tenant model: a single app instance serves all landings, matched by `Host` header. What's new is the **domain lifecycle** (buy → DNS → attach → SSL → verify → live → flagged → retired) and the **provider integrations** that drive it.

## 2. Current state (what exists)

- **One multi-tenant app**, host-routed: `getLandingByHost(Host)` matches a landing; `middleware.ts` passes tenant hosts through. Host matching uses the **full Host header including port** in dev.
- **Attach-only domains:** `lib/vercel.ts` (`attachDomain`/`verifyDomain`/`removeDomain` against one Vercel project), `lib/dns.ts` (hostname validation + DNS instructions), `lib/domains.ts` (`addDomain`/`refreshDomain`/`removeDomain`/`listDomains`), `Domain` model (`hostname` unique, `verified`, `vercelStatus`, `landingId`), admin API `/api/admin/domains/*`, `DomainsPanel` editor tab.
- **No registration.** The admin must already own a domain and point DNS at Vercel; the app only *attaches* it. `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` are not set in any live environment yet.

## 3. Locked decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Domains per landing | **One freshly-purchased domain per landing**, rotation expected (burner scale) |
| Acquisition | **Programmatic** via a registrar API |
| Registrar | **Namecheap** (`domains.check` + real-time `domains.create`; sandbox; needs IP allowlist + API-access account minimums) |
| Edge (DNS/SSL/proxy) | **Cloudflare** in front (zones, DNS records, Universal SSL, proxy/origin-hiding) |
| Origin hosting | **Phased: Vercel now → VPS later** |
| Deliverable | This spec **+** an implementation plan |

### 3.1 The Vercel/Cloudflare cert constraint (drives the phasing)

A proxied (orange-cloud) Cloudflare record in front of Vercel **breaks Vercel's Let's Encrypt provisioning** (Cloudflare intercepts the ACME handshake) — Vercel requires the record in **DNS-only (gray-cloud)** mode. So **Cloudflare's origin-hiding proxy cannot be used while Vercel is the origin.** Origin-hiding + clean rotation only materialize once the origin is a host that lets Cloudflare terminate SSL and proxy to it — i.e. **Phase 1 (VPS)**. Phase 0 is therefore "automation works, but origin is exposed and still under Vercel AUP"; Phase 1 is the resilient target.

## 4. Architecture

Three **provider adapters** behind narrow interfaces, an orchestration **lifecycle service** with an explicit state machine, and a **reconciler** that advances pending domains. The adapters isolate every external API so the lifecycle logic is pure and testable, and so swapping Vercel→VPS in Phase 1 touches one adapter, not the core.

```
                         ┌────────────────────────────────────────┐
 admin: "create landing" │            Domain Lifecycle Service     │
   or "rotate domain"  ─▶│  (state machine + idempotent steps)     │
                         └───┬───────────────┬───────────────┬─────┘
                             │               │               │
                    ┌────────▼──────┐ ┌──────▼───────┐ ┌─────▼────────┐
                    │  Registrar    │ │   EdgeDns     │ │  OriginAttach │
                    │  (Namecheap)  │ │ (Cloudflare)  │ │  (Vercel→VPS) │
                    │ check/register│ │ zone/DNS/SSL  │ │ attach/verify │
                    │ setNameservers│ │ proxy toggle  │ │  (P1: no-op)  │
                    └───────────────┘ └───────────────┘ └──────────────┘
```

### 4.1 Adapter interfaces (`lib/providers/`)

- **`Registrar`** — `checkAvailability(name): {available, priceUsd}`, `suggest(keywords, tlds): Candidate[]`, `register(name, contact): {orderId, expiresAt}`, `setNameservers(name, ns[]): void`, `renew(name): void`. Concrete: `namecheap.ts` (XML API; sandbox via env). All calls go through one signed/allowlisted client.
- **`EdgeDns`** — `createZone(name): {zoneId, assignedNs[]}`, `upsertRecords(zoneId, records[]): void`, `setProxied(zoneId, record, bool): void`, `ensureSsl(zoneId): SslStatus`, `deleteZone(zoneId): void`. Concrete: `cloudflare.ts`.
- **`OriginAttach`** — `attach(hostname): AttachStatus`, `verify(hostname): AttachStatus`, `detach(hostname): void`. Concrete Phase 0: `vercelOrigin.ts` (wraps existing `lib/vercel.ts`). Concrete Phase 1: `hostHeaderOrigin.ts` — a **no-op** because the VPS Next app already routes by Host header for any hostname (adding a domain = Cloudflare DNS only). This is the key simplification Phase 1 buys.

`lib/domains.ts` is refactored to call the lifecycle service; existing `addDomain` (attach an externally-owned domain) stays as a manual escape hatch.

### 4.2 Domain lifecycle state machine

```
            register()          createZone+DNS        attach()         verify/SSL ok
 (none) ──▶ purchasing ──▶ dns_pending ──▶ attaching ──▶ ssl_pending ──▶ live
                │               │              │              │            │
                │               │              │              │       flagged() │ admin/automation marks blocked
                ▼               ▼              ▼              ▼            ▼
              failed         failed         failed         failed     retiring ──▶ retired
```

- Each transition is an **idempotent step** keyed off the persisted status, so the reconciler (or a retry) can resume a half-finished domain without double-buying. A domain is **only ever bought once per row** (`registrarOrderId` set ⇒ never re-register).
- **`live`** requires: registrar order confirmed **and** DNS resolves to the origin **and** SSL active **and** origin attach verified (Phase 0) / Host-route reachable (Phase 1).
- **Rotation:** `rotate(landingId)` creates a *new* domain row in `purchasing` for the same landing, drives it to `live`, then flips the landing's `primaryDomainId` and moves the old row to `retiring → retired` (DNS/zone torn down, registrar left to expire or `autoRenew=false`). Content/landingId is untouched, so rotation is a pure infra swap.

### 4.3 Reconciler

A single idempotent `reconcilePending()` pass (invoked by a scheduled job — Vercel Cron in P0, system cron/queue in P1) that, for every non-terminal domain: re-runs its next step, polls DNS propagation + SSL + attach/verify, applies timeouts (→ `failed` with reason), and surfaces status to the admin. No long-lived in-request polling; everything is resumable.

## 5. Data model changes

Extend `Domain` (most state lives here) and add a pointer on `Landing`.

```prisma
model Domain {
  id              String   @id @default(cuid())
  landingId       String
  landing         Landing  @relation(fields: [landingId], references: [id], onDelete: Cascade)
  hostname        String   @unique
  status          String   @default("purchasing") // purchasing|dns_pending|attaching|ssl_pending|live|flagged|retiring|retired|failed
  // registrar
  registrar       String?  // "namecheap"
  registrarOrderId String? // set once registration succeeds — the "bought" guard
  autoRenew       Boolean  @default(false)
  expiresAt       DateTime?
  // edge
  edgeProvider    String?  // "cloudflare"
  edgeZoneId      String?
  nameservers     String[] // Cloudflare-assigned NS we must set at the registrar
  sslStatus       String?  // none|pending|active
  // origin (Phase 0)
  vercelStatus    String?
  verified        Boolean  @default(false)
  // ops
  statusReason    String?  // last error / flag reason
  lastCheckedAt   DateTime?
  createdAt       DateTime @default(now())
  retiredAt       DateTime?
}

model Landing {
  // ...existing...
  primaryDomainId String?  @unique  // the live domain currently serving this landing
}
```

Migration via `prisma db push`/migrate. Backward compatible: existing rows default to `status="live"` backfill (they're already attached) and existing `vercelStatus`/`verified` preserved.

## 6. Per-landing flow (happy path)

1. **Create landing** (admin). After the landing row is saved, the admin either accepts a **suggested available domain** (`Registrar.suggest` from the brand/keywords) or types a candidate; `checkAvailability` confirms price + availability.
2. **Buy** — `Registrar.register(name, contact)` (real-time). Persist `registrarOrderId`, `expiresAt`. Status → `dns_pending`.
3. **Edge** — `EdgeDns.createZone(name)` → returns Cloudflare nameservers; `Registrar.setNameservers(name, cfNs)`. Create DNS records (apex A/AAAA + `www`) pointing at the origin. **Phase 0:** record **DNS-only (gray)** → Vercel IP/CNAME. **Phase 1:** record **proxied (orange)** → VPS IP. Status → `attaching`.
4. **Attach** — **Phase 0:** `OriginAttach.attach(hostname)` = existing `attachDomain` to the Vercel project. **Phase 1:** no-op. Status → `ssl_pending`.
5. **SSL + verify** — reconciler polls: Cloudflare Universal SSL active (P1) / Vercel cert provisioned + `verifyDomain` (P0). When all green → status `live`, set `Landing.primaryDomainId`.
6. **Publish** — landing is reachable at `https://<domain>`; seed/host matching already keys off the full Host header.

**Rotation / takedown:** admin (or an automated Safe-Browsing/uptime check) marks a domain `flagged` → `rotate(landingId)` runs steps 1–5 for a fresh domain → atomically repoint `primaryDomainId` → retire the old (tear down Cloudflare zone + origin detach; let the registration lapse).

## 7. Admin UX

- **Create-landing wizard** gains a **Domain step**: keyword/brand → suggestions w/ price → "Buy & provision" → live progress (status chips per lifecycle stage, driven by the reconciler).
- **DomainsPanel** (existing tab) shows the **current live domain** + **rotation history**, each with status + `statusReason`, plus actions: **Rotate now**, **Mark flagged**, **Retry** (re-run failed step), and **Attach existing** (the legacy manual path).
- Non-blocking: provisioning happens server-side; the panel reflects reconciler progress. A landing can exist in `draft` with no domain yet.

## 8. Config / secrets (per environment)

- **Namecheap:** `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP` (allowlisted), `NAMECHEAP_SANDBOX=true|false`, default WHOIS/registrant contact (`REGISTRANT_*`) — required for `domains.create`.
- **Cloudflare:** `CLOUDFLARE_API_TOKEN` (Zone\:Edit, DNS\:Edit, SSL\:Edit scoped), `CLOUDFLARE_ACCOUNT_ID`.
- **Origin P0:** existing `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID`. **Origin P1:** `ORIGIN_IP` (VPS), no per-domain origin secret.
- All providers run against **sandbox/staging** first (Namecheap sandbox; Cloudflare test zone; Vercel preview project). Secrets are gitignored `.env` + the host's secret store; never committed. Registrant contact data is PII — store the default in secrets, not the DB.

## 9. Phasing (this is the implementation order)

- **Phase 0 — buying automation on the current stack (ship first).** Registrar + EdgeDns(DNS-only) + Vercel attach + lifecycle + reconciler + admin wizard. Outcome: create a landing → it auto-buys + provisions a working `https://` domain. *Caveats acknowledged in the spec:* origin exposed (no proxy), still under Vercel AUP, per-domain Vercel billing/limits.
- **Phase 1 — resilient origin (the real target).** Stand up the VPS (Docker Next app, Host-header routing, health check), point Cloudflare **proxied** at it, switch `OriginAttach` to the no-op adapter, enable origin-hiding + automated rotation triggers (Safe-Browsing/uptime watcher). Migrate existing live domains zone-by-zone. Decommission the Vercel origin once parity is confirmed.

## 10. Compliance / AUP / cost (must be surfaced, not solved here)

- **AUP reality:** Vercel's AUP can suspend gambling content (one suspension ⇒ all P0 landings down). Cloudflare is network-neutral but still responds to abuse reports; the VPS provider must be chosen for iGaming tolerance. **This is why P1 exists.** The operator is responsible for licensing/geo-restrictions/age-gating of the promoted offers — out of scope for this system, but the rotation design assumes takedowns are normal.
- **Cost drivers:** registration is per-domain per-year (Namecheap bulk ≈ low single-digit USD for common TLDs; premium/short TLDs cost more — surface price before buying). Cloudflare zones are free at moderate counts (very large fleets → "Cloudflare for SaaS" custom-hostnames is the scale-up path, noted but **out of scope**). VPS is a flat monthly.

## 11. Failure modes & idempotency

- **Double-buy guard:** never call `register` when `registrarOrderId` is set. Registration is the only irreversible, costly step — it is gated and logged.
- **Partial provision:** any step can fail/timeout → `failed` + `statusReason`; **Retry** resumes from the persisted status (no re-buy). Rollback for a *failed* domain tears down the Cloudflare zone but leaves the (already-paid) registration owned for reuse/manual attach.
- **Rotation atomicity:** `primaryDomainId` flips only after the new domain is `live`; the old domain keeps serving until then (zero-downtime swap).
- **Reconciler is at-least-once:** all steps idempotent; safe to re-run.

## 12. Testing strategy

- **Pure lifecycle state machine:** unit-tested transition table (every status → next step), double-buy guard, rotation swap, timeout → failed. No network.
- **Adapter contract tests:** each provider adapter tested against a **mocked HTTP client** (recorded Namecheap XML / Cloudflare JSON / Vercel JSON fixtures) — asserts request shape + response parsing, not the live API.
- **Sandbox integration (manual/CI-gated):** Namecheap sandbox `check`/`create`, Cloudflare test zone, Vercel preview attach — run behind an env flag, never in the default unit run (matches the repo's existing "live ops needs real tokens" posture).
- **Admin flow:** component test for the wizard domain-step + DomainsPanel rotation actions (mocked service), mirroring existing `*.test.tsx`.

## 13. Out of scope

- Email/mailbox on the domains; domain *transfers* (only fresh registration); marketplace/aftermarket premium domains; "Cloudflare for SaaS" custom-hostname mode (noted as the very-large-scale path); the actual VPS provider selection + IaC (Phase 1 ops task); automated content/AUP compliance of the promoted offers.

## 14. Open questions (resolve during planning)

1. **TLD policy** for burner domains — cheapest registrable set (`.com`/`.net`/`.online`/`.click`/`.xyz`…)? Affects `Registrar.suggest` defaults + price ceiling.
2. **Rotation trigger** — manual-only at first, or wire a Safe-Browsing/uptime watcher in P0? (Recommend manual in P0, automated in P1.)
3. **Registrant identity** — one default WHOIS contact for all, with WHOIS privacy on? (Recommended.)
4. **Scale ceiling for P1** — at what domain count do we adopt Cloudflare-for-SaaS instead of one-zone-per-domain?
