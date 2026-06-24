# Per-landing domain acquisition — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin provisions a domain for a landing, the app programmatically **buys it (Namecheap), creates its Cloudflare DNS zone, points DNS at the Vercel origin, attaches it to the Vercel project, waits for SSL, and marks the landing live** — driven by an idempotent, resumable state machine — and can **rotate** a flagged domain for a fresh one with zero downtime.

**Architecture:** Three provider adapters behind narrow interfaces (`Registrar`=Namecheap, `EdgeDns`=Cloudflare, `OriginAttach`=Vercel) keep all external APIs isolated and the core pure. A pure **lifecycle** module decides the next step for a domain from its persisted `status`; an orchestration **service** executes one step at a time against the adapters + Prisma; a **reconciler** (cron route) advances every non-terminal domain. Phase 0 keeps the current single multi-tenant Vercel origin (Cloudflare records stay **DNS-only**); Phase 1 (separate plan) swaps the origin adapter to a no-op VPS.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma/Postgres, Vitest + Testing Library. External: Namecheap XML API, Cloudflare v4 JSON API, Vercel REST (existing `lib/vercel.ts`).

## Global Constraints

- TypeScript strict; match existing style (`lib/vercel.ts`/`lib/domains.ts` patterns); no unrelated refactors.
- Unit tests: `npm test`; single file: `npx vitest run <path>`. `npx tsc --noEmit` must stay clean. Commit after every task.
- **No live external calls in unit tests.** Adapters are tested against a mocked global `fetch` with recorded fixtures; the service/lifecycle are tested with injected fake adapters and a mocked `@/lib/db`. Real Namecheap/Cloudflare/Vercel calls are exercised only behind a sandbox env flag (Task 11), never in the default `npm test`.
- **Phase 0 origin = Vercel, Cloudflare records DNS-only (gray-cloud).** A proxied record breaks Vercel's cert provisioning. Do NOT set `proxied: true` anywhere in Phase 0.
- **Buy-once guard is sacred:** `register()` is the only irreversible, paid step. Never call it when `registrarOrderId` is already set on the row.
- Domain status vocabulary (exact strings): `purchasing | dns_pending | attaching | ssl_pending | live | flagged | retiring | retired | failed`.
- Secrets via env only (gitignored `.env` + host secret store): `NAMECHEAP_*`, `CLOUDFLARE_*`, `VERCEL_*`, `ORIGIN_DNS_TARGET`, `REGISTRANT_*`, `CRON_SECRET`. Never commit secrets or registrant PII.

## File Structure

**New:**
- `lib/domains/status.ts` — status union + helpers (terminal/active sets).
- `lib/domains/lifecycle.ts` — pure `nextStep()` + `isTerminal()` over a domain-shaped record.
- `lib/providers/types.ts` — `Registrar` / `EdgeDns` / `OriginAttach` interfaces + shared types + `Providers` bundle.
- `lib/providers/config.ts` — env readers (`namecheapConfigFromEnv`, `cloudflareConfigFromEnv`, `originTargetFromEnv`).
- `lib/providers/namecheap.ts` — `createNamecheapRegistrar(config): Registrar`.
- `lib/providers/cloudflare.ts` — `createCloudflareEdge(config): EdgeDns`.
- `lib/providers/vercelOrigin.ts` — `createVercelOrigin(config): OriginAttach` (wraps `lib/vercel.ts`).
- `lib/providers/index.ts` — `providersFromEnv(): Providers`.
- `lib/domains/service.ts` — `purchaseDomainForLanding` / `advanceDomain` / `rotateDomain` / `retireDomain` / `flagDomain`.
- `lib/domains/reconcile.ts` — `reconcilePending(providers)`.
- `app/api/cron/reconcile/route.ts` — cron entrypoint.
- `app/api/admin/domains/suggest/route.ts`, `app/api/admin/domains/buy/route.ts`, `app/api/admin/domains/rotate/route.ts`, `app/api/admin/domains/[id]/retry/route.ts`, `app/api/admin/domains/[id]/flag/route.ts`.

**Modified:**
- `prisma/schema.prisma` — `Domain` lifecycle fields + `Landing.primaryDomainId`.
- `lib/domains.ts` — extend `DomainView`/`toView` with the new fields; keep `addDomain` (manual attach) as-is.
- `components/admin/DomainsPanel.tsx` (+ test) — provision/rotate/flag/retry UI + status + history.
- `lib/adminClient.ts` — client helpers for the new endpoints.
- `.env.example` (create if absent) + `README`/docs — new env vars.

---

### Task 1: Schema + status vocabulary

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/domains/status.ts`, `lib/domains/status.test.ts`

**Interfaces:**
- Produces: `DomainStatus` union; `DOMAIN_STATUSES` (readonly tuple); `ACTIVE_STATUSES: DomainStatus[]` (reconciler advances these); `isTerminal(s): boolean`.

- [ ] **Step 1: Extend the Prisma schema**

In `prisma/schema.prisma`, replace the `Domain` model with (keep `hostname @unique`, `landingId`, relation):

```prisma
model Domain {
  id               String    @id @default(cuid())
  landingId        String
  landing          Landing   @relation(fields: [landingId], references: [id], onDelete: Cascade)
  hostname         String    @unique
  status           String    @default("purchasing") // purchasing|dns_pending|attaching|ssl_pending|live|flagged|retiring|retired|failed

  registrar        String?   // "namecheap"
  registrarOrderId String?   // set once registration succeeds — the buy-once guard
  autoRenew        Boolean   @default(false)
  expiresAt        DateTime?

  edgeProvider     String?   // "cloudflare"
  edgeZoneId       String?
  nameservers      String[]  // edge-assigned NS to set at the registrar
  sslStatus        String?   // none|pending|active

  vercelStatus     String?   // origin attach status (Phase 0)
  verified         Boolean   @default(false)

  statusReason     String?   // last error / flag reason
  lastCheckedAt    DateTime?
  createdAt        DateTime  @default(now())
  retiredAt        DateTime?
}
```

Add to the `Landing` model (after `domains Domain[]`):

```prisma
  primaryDomainId String?  @unique
```

- [ ] **Step 2: Push schema + regenerate client**

Run: `npx prisma db push && npx prisma generate`
Expected: applies the new columns (additive; existing rows get defaults), client regenerates, exit 0.

- [ ] **Step 3: Write the failing status test**

Create `lib/domains/status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { DOMAIN_STATUSES, ACTIVE_STATUSES, isTerminal } from "./status";

describe("domain status vocabulary", () => {
  it("includes every lifecycle status", () => {
    expect(DOMAIN_STATUSES).toEqual([
      "purchasing", "dns_pending", "attaching", "ssl_pending",
      "live", "flagged", "retiring", "retired", "failed",
    ]);
  });
  it("marks live/retired/failed terminal and the rest non-terminal", () => {
    expect(isTerminal("live")).toBe(true);
    expect(isTerminal("retired")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("ssl_pending")).toBe(false);
  });
  it("active statuses are exactly the ones the reconciler advances", () => {
    expect(ACTIVE_STATUSES).toEqual(["purchasing", "dns_pending", "attaching", "ssl_pending"]);
  });
});
```

- [ ] **Step 4: Run it (fails — module missing)**

Run: `npx vitest run lib/domains/status.test.ts` — Expected: FAIL `Cannot find module './status'`.

- [ ] **Step 5: Implement `status.ts`**

Create `lib/domains/status.ts`:

```ts
export const DOMAIN_STATUSES = [
  "purchasing", "dns_pending", "attaching", "ssl_pending",
  "live", "flagged", "retiring", "retired", "failed",
] as const;

export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

// Non-terminal statuses the reconciler keeps advancing toward `live`.
export const ACTIVE_STATUSES: DomainStatus[] = ["purchasing", "dns_pending", "attaching", "ssl_pending"];

export function isTerminal(s: DomainStatus): boolean {
  return s === "live" || s === "retired" || s === "failed";
}
```

- [ ] **Step 6: Run tests + tsc, then commit**

Run: `npx vitest run lib/domains/status.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add prisma/schema.prisma lib/domains/status.ts lib/domains/status.test.ts
git commit -m "feat(domains): lifecycle schema fields + status vocabulary"
```

---

### Task 2: Pure lifecycle — `nextStep`

**Files:**
- Create: `lib/domains/lifecycle.ts`, `lib/domains/lifecycle.test.ts`

**Interfaces:**
- Consumes: `DomainStatus` (Task 1).
- Produces: `LifecycleRecord` (`{ status: DomainStatus; registrarOrderId: string | null }`); `Step = "register" | "provision_edge" | "attach_origin" | "verify" | "none"`; `nextStep(d: LifecycleRecord): Step`.

- [ ] **Step 1: Write the failing test**

Create `lib/domains/lifecycle.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nextStep, type LifecycleRecord } from "./lifecycle";

const rec = (status: LifecycleRecord["status"], registrarOrderId: string | null = null): LifecycleRecord =>
  ({ status, registrarOrderId });

describe("nextStep", () => {
  it("buys when purchasing and not yet bought", () => {
    expect(nextStep(rec("purchasing"))).toBe("register");
  });
  it("skips buying when already bought (buy-once guard) and moves to edge", () => {
    expect(nextStep(rec("purchasing", "order-1"))).toBe("provision_edge");
  });
  it("provisions edge, then attaches origin, then verifies", () => {
    expect(nextStep(rec("dns_pending", "o"))).toBe("provision_edge");
    expect(nextStep(rec("attaching", "o"))).toBe("attach_origin");
    expect(nextStep(rec("ssl_pending", "o"))).toBe("verify");
  });
  it("does nothing for terminal/holding statuses", () => {
    for (const s of ["live", "retired", "failed", "flagged", "retiring"] as const) {
      expect(nextStep(rec(s, "o"))).toBe("none");
    }
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/domains/lifecycle.test.ts` — Expected: FAIL `Cannot find module './lifecycle'`.

- [ ] **Step 3: Implement `lifecycle.ts`**

Create `lib/domains/lifecycle.ts`:

```ts
import type { DomainStatus } from "./status";

// Only the fields the pure decision needs — the service passes a real Domain row.
export type LifecycleRecord = { status: DomainStatus; registrarOrderId: string | null };

export type Step = "register" | "provision_edge" | "attach_origin" | "verify" | "none";

// The single source of truth for "what happens next" given a domain's persisted status.
// The buy-once guard lives here: a `purchasing` row that already has an order skips `register`.
export function nextStep(d: LifecycleRecord): Step {
  switch (d.status) {
    case "purchasing":
      return d.registrarOrderId ? "provision_edge" : "register";
    case "dns_pending":
      return "provision_edge";
    case "attaching":
      return "attach_origin";
    case "ssl_pending":
      return "verify";
    default:
      return "none";
  }
}
```

- [ ] **Step 4: Run tests + tsc, then commit**

Run: `npx vitest run lib/domains/lifecycle.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/domains/lifecycle.ts lib/domains/lifecycle.test.ts
git commit -m "feat(domains): pure lifecycle nextStep with buy-once guard"
```

---

### Task 3: Provider interfaces + env config

**Files:**
- Create: `lib/providers/types.ts`, `lib/providers/config.ts`, `lib/providers/config.test.ts`

**Interfaces:**
- Produces:
  - `DomainCandidate = { name: string; available: boolean; priceUsd: number }`
  - `RegisterResult = { orderId: string; expiresAt: Date }`
  - `RegistrantContact = { firstName; lastName; address1; city; stateProvince; postalCode; country; phone; email }` (all `string`)
  - `Registrar` = `{ checkAvailability(name): Promise<DomainCandidate>; suggest(keyword, tlds): Promise<DomainCandidate[]>; register(name): Promise<RegisterResult>; setNameservers(name, nameservers: string[]): Promise<void> }`
  - `DnsRecordInput = { type: "A" | "AAAA" | "CNAME"; name: string; content: string; proxied: boolean }`
  - `ZoneResult = { zoneId: string; nameservers: string[] }`; `SslStatus = "none" | "pending" | "active"`
  - `EdgeDns` = `{ createZone(name): Promise<ZoneResult>; upsertRecords(zoneId, records: DnsRecordInput[]): Promise<void>; ensureSsl(zoneId): Promise<SslStatus>; deleteZone(zoneId): Promise<void> }`
  - `AttachStatus = { verified: boolean }`; `OriginAttach` = `{ attach(hostname): Promise<AttachStatus>; verify(hostname): Promise<AttachStatus>; detach(hostname): Promise<void> }`
  - `OriginTarget = { ip?: string; cname?: string }`
  - `Providers = { registrar: Registrar; edge: EdgeDns; origin: OriginAttach; originTarget: OriginTarget }`
  - `NamecheapConfig`, `CloudflareConfig`; `namecheapConfigFromEnv()`, `cloudflareConfigFromEnv()`, `originTargetFromEnv()`.

- [ ] **Step 1: Write `types.ts` (no test — pure types/interfaces)**

Create `lib/providers/types.ts`:

```ts
export type DomainCandidate = { name: string; available: boolean; priceUsd: number };
export type RegisterResult = { orderId: string; expiresAt: Date };

export type RegistrantContact = {
  firstName: string; lastName: string; address1: string; city: string;
  stateProvince: string; postalCode: string; country: string; phone: string; email: string;
};

export interface Registrar {
  checkAvailability(name: string): Promise<DomainCandidate>;
  suggest(keyword: string, tlds: string[]): Promise<DomainCandidate[]>;
  register(name: string): Promise<RegisterResult>;
  setNameservers(name: string, nameservers: string[]): Promise<void>;
}

export type DnsRecordInput = { type: "A" | "AAAA" | "CNAME"; name: string; content: string; proxied: boolean };
export type ZoneResult = { zoneId: string; nameservers: string[] };
export type SslStatus = "none" | "pending" | "active";

export interface EdgeDns {
  createZone(name: string): Promise<ZoneResult>;
  upsertRecords(zoneId: string, records: DnsRecordInput[]): Promise<void>;
  ensureSsl(zoneId: string): Promise<SslStatus>;
  deleteZone(zoneId: string): Promise<void>;
}

export type AttachStatus = { verified: boolean };

export interface OriginAttach {
  attach(hostname: string): Promise<AttachStatus>;
  verify(hostname: string): Promise<AttachStatus>;
  detach(hostname: string): Promise<void>;
}

export type OriginTarget = { ip?: string; cname?: string };

export type Providers = {
  registrar: Registrar;
  edge: EdgeDns;
  origin: OriginAttach;
  originTarget: OriginTarget;
};
```

- [ ] **Step 2: Write the failing config test**

Create `lib/providers/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { namecheapConfigFromEnv, cloudflareConfigFromEnv, originTargetFromEnv } from "./config";

const saved = { ...process.env };
beforeEach(() => { process.env = { ...saved }; });
afterEach(() => { process.env = { ...saved }; });

describe("namecheapConfigFromEnv", () => {
  it("throws when a required var is missing", () => {
    delete process.env.NAMECHEAP_API_KEY;
    expect(() => namecheapConfigFromEnv()).toThrow(/NAMECHEAP_API_KEY/);
  });
  it("parses the sandbox flag and registrant contact", () => {
    Object.assign(process.env, {
      NAMECHEAP_API_USER: "u", NAMECHEAP_API_KEY: "k", NAMECHEAP_USERNAME: "u",
      NAMECHEAP_CLIENT_IP: "1.2.3.4", NAMECHEAP_SANDBOX: "true",
      REGISTRANT_FIRST_NAME: "A", REGISTRANT_LAST_NAME: "B", REGISTRANT_ADDRESS1: "1 St",
      REGISTRANT_CITY: "C", REGISTRANT_STATE: "S", REGISTRANT_POSTAL: "00000",
      REGISTRANT_COUNTRY: "US", REGISTRANT_PHONE: "+1.5550000000", REGISTRANT_EMAIL: "a@b.test",
    });
    const c = namecheapConfigFromEnv();
    expect(c.sandbox).toBe(true);
    expect(c.clientIp).toBe("1.2.3.4");
    expect(c.registrant.country).toBe("US");
  });
});

describe("originTargetFromEnv", () => {
  it("defaults to the Vercel anycast A record when unset", () => {
    delete process.env.ORIGIN_DNS_TARGET;
    expect(originTargetFromEnv()).toEqual({ ip: "76.76.21.21" });
  });
  it("uses an explicit A target", () => {
    process.env.ORIGIN_DNS_TARGET = "203.0.113.7";
    expect(originTargetFromEnv()).toEqual({ ip: "203.0.113.7" });
  });
});

describe("cloudflareConfigFromEnv", () => {
  it("throws when token missing", () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    expect(() => cloudflareConfigFromEnv()).toThrow(/CLOUDFLARE_API_TOKEN/);
  });
});
```

- [ ] **Step 3: Run it (fails — module missing)**

Run: `npx vitest run lib/providers/config.test.ts` — Expected: FAIL `Cannot find module './config'`.

- [ ] **Step 4: Implement `config.ts`**

Create `lib/providers/config.ts`:

```ts
import type { RegistrantContact, OriginTarget } from "./types";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export type NamecheapConfig = {
  apiUser: string; apiKey: string; userName: string; clientIp: string;
  sandbox: boolean; registrant: RegistrantContact;
};

export function namecheapConfigFromEnv(): NamecheapConfig {
  return {
    apiUser: req("NAMECHEAP_API_USER"),
    apiKey: req("NAMECHEAP_API_KEY"),
    userName: req("NAMECHEAP_USERNAME"),
    clientIp: req("NAMECHEAP_CLIENT_IP"),
    sandbox: process.env.NAMECHEAP_SANDBOX === "true",
    registrant: {
      firstName: req("REGISTRANT_FIRST_NAME"), lastName: req("REGISTRANT_LAST_NAME"),
      address1: req("REGISTRANT_ADDRESS1"), city: req("REGISTRANT_CITY"),
      stateProvince: req("REGISTRANT_STATE"), postalCode: req("REGISTRANT_POSTAL"),
      country: req("REGISTRANT_COUNTRY"), phone: req("REGISTRANT_PHONE"), email: req("REGISTRANT_EMAIL"),
    },
  };
}

export type CloudflareConfig = { apiToken: string; accountId: string };

export function cloudflareConfigFromEnv(): CloudflareConfig {
  return { apiToken: req("CLOUDFLARE_API_TOKEN"), accountId: req("CLOUDFLARE_ACCOUNT_ID") };
}

// Phase 0: the public A target for fresh apex domains. Defaults to Vercel's anycast IP.
export function originTargetFromEnv(): OriginTarget {
  return { ip: process.env.ORIGIN_DNS_TARGET || "76.76.21.21" };
}
```

- [ ] **Step 5: Run tests + tsc, then commit**

Run: `npx vitest run lib/providers/config.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/providers/types.ts lib/providers/config.ts lib/providers/config.test.ts
git commit -m "feat(providers): adapter interfaces + env config"
```

---

### Task 4: Namecheap registrar adapter

**Files:**
- Create: `lib/providers/namecheap.ts`, `lib/providers/namecheap.test.ts`

**Interfaces:**
- Consumes: `Registrar`, `DomainCandidate`, `RegisterResult` (Task 3), `NamecheapConfig` (Task 3).
- Produces: `createNamecheapRegistrar(config: NamecheapConfig): Registrar`.

> Namecheap returns XML at `https://api.namecheap.com/xml.response` (prod) / `https://api.sandbox.namecheap.com/xml.response` (sandbox). We extract the few fields we need with targeted regex helpers; the fixtures in the test pin the exact shapes. (A future hardening could swap to `fast-xml-parser`; out of scope.)

- [ ] **Step 1: Write the failing test (mocked fetch + fixtures)**

Create `lib/providers/namecheap.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createNamecheapRegistrar } from "./namecheap";
import type { NamecheapConfig } from "./config";

const config: NamecheapConfig = {
  apiUser: "u", apiKey: "k", userName: "u", clientIp: "1.2.3.4", sandbox: true,
  registrant: { firstName: "A", lastName: "B", address1: "1 St", city: "C", stateProvince: "S",
    postalCode: "00000", country: "US", phone: "+1.5550000000", email: "a@b.test" },
};

const xml = (inner: string) =>
  `<?xml version="1.0"?><ApiResponse Status="OK" xmlns="http://api.namecheap.com/xml.response">${inner}</ApiResponse>`;

let calls: { url: string; body: string | null }[];
function mockFetch(responseXml: string) {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: (init?.body as string) ?? null });
    return new Response(responseXml, { status: 200 });
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe("namecheap registrar", () => {
  it("checkAvailability parses availability + price", async () => {
    mockFetch(xml(
      `<CommandResponse><DomainCheckResult Domain="boomzino.click" Available="true" PremiumRegistrationPrice="0.0"/></CommandResponse>`
    ));
    const r = createNamecheapRegistrar(config);
    const c = await r.checkAvailability("boomzino.click");
    expect(c).toMatchObject({ name: "boomzino.click", available: true });
    expect(calls[0].url).toContain("sandbox.namecheap.com");
    expect(calls[0].url).toContain("Command=namecheap.domains.check");
  });

  it("register parses the order id and returns an expiry one year out", async () => {
    mockFetch(xml(
      `<CommandResponse><DomainCreateResult Domain="boomzino.click" Registered="true" OrderID="12345" ChargedAmount="9.06"/></CommandResponse>`
    ));
    const r = createNamecheapRegistrar(config);
    const res = await r.register("boomzino.click");
    expect(res.orderId).toBe("12345");
    expect(res.expiresAt.getUTCFullYear()).toBe(new Date().getUTCFullYear() + 1);
    expect(calls[0].url).toContain("Command=namecheap.domains.create");
    expect(calls[0].url).toContain("RegistrantFirstName=A");
  });

  it("throws on an API error response", async () => {
    mockFetch(
      `<?xml version="1.0"?><ApiResponse Status="ERROR"><Errors><Error Number="2030280">Domain taken</Error></Errors></ApiResponse>`
    );
    const r = createNamecheapRegistrar(config);
    await expect(r.register("taken.com")).rejects.toThrow(/Domain taken/);
  });

  it("setNameservers calls domains.dns.setCustom with the NS list", async () => {
    mockFetch(xml(`<CommandResponse><DomainDNSSetCustomResult Domain="boomzino.click" Updated="true"/></CommandResponse>`));
    const r = createNamecheapRegistrar(config);
    await r.setNameservers("boomzino.click", ["dana.ns.cloudflare.com", "rob.ns.cloudflare.com"]);
    expect(calls[0].url).toContain("Command=namecheap.domains.dns.setCustom");
    expect(calls[0].url).toContain("Nameservers=dana.ns.cloudflare.com%2Crob.ns.cloudflare.com");
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/providers/namecheap.test.ts` — Expected: FAIL `Cannot find module './namecheap'`.

- [ ] **Step 3: Implement `namecheap.ts`**

Create `lib/providers/namecheap.ts`:

```ts
import type { NamecheapConfig } from "./config";
import type { Registrar, DomainCandidate, RegisterResult } from "./types";

const PROD = "https://api.namecheap.com/xml.response";
const SANDBOX = "https://api.sandbox.namecheap.com/xml.response";

export class NamecheapError extends Error {
  constructor(message: string) { super(message); this.name = "NamecheapError"; }
}

// Pull an attribute value out of the (small, known) Namecheap XML responses.
function attr(xml: string, tag: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}
function splitDomain(name: string): { sld: string; tld: string } {
  const i = name.indexOf(".");
  return { sld: name.slice(0, i), tld: name.slice(i + 1) };
}

export function createNamecheapRegistrar(config: NamecheapConfig): Registrar {
  const base = config.sandbox ? SANDBOX : PROD;

  async function call(command: string, params: Record<string, string>): Promise<string> {
    const url = new URL(base);
    url.searchParams.set("ApiUser", config.apiUser);
    url.searchParams.set("ApiKey", config.apiKey);
    url.searchParams.set("UserName", config.userName);
    url.searchParams.set("ClientIp", config.clientIp);
    url.searchParams.set("Command", command);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString(), { method: "GET" });
    const body = await res.text();
    if (/Status="ERROR"/i.test(body) || !res.ok) {
      const err = body.match(/<Error[^>]*>([^<]+)<\/Error>/i)?.[1] ?? `Namecheap request failed (${res.status})`;
      throw new NamecheapError(err);
    }
    return body;
  }

  return {
    async checkAvailability(name): Promise<DomainCandidate> {
      const body = await call("namecheap.domains.check", { DomainList: name });
      const available = attr(body, "DomainCheckResult", "Available") === "true";
      const price = Number(attr(body, "DomainCheckResult", "PremiumRegistrationPrice") ?? "0");
      return { name, available, priceUsd: Number.isFinite(price) ? price : 0 };
    },

    async suggest(keyword, tlds): Promise<DomainCandidate[]> {
      // Namecheap has no first-class "suggest"; check `keyword.<tld>` across the requested TLDs.
      const names = tlds.map((t) => `${keyword}.${t.replace(/^\./, "")}`);
      const body = await call("namecheap.domains.check", { DomainList: names.join(",") });
      return names.map((name) => ({
        name,
        available: new RegExp(`Domain="${name}"[^>]*Available="true"`, "i").test(body),
        priceUsd: 0,
      }));
    },

    async register(name): Promise<RegisterResult> {
      const { sld, tld } = splitDomain(name);
      const r = config.registrant;
      const contact = {
        RegistrantFirstName: r.firstName, RegistrantLastName: r.lastName,
        RegistrantAddress1: r.address1, RegistrantCity: r.city, RegistrantStateProvince: r.stateProvince,
        RegistrantPostalCode: r.postalCode, RegistrantCountry: r.country, RegistrantPhone: r.phone,
        RegistrantEmailAddress: r.email,
      };
      // Namecheap requires the same contact for Tech/Admin/AuxBilling.
      const all: Record<string, string> = { DomainName: name, Years: "1" };
      for (const role of ["Registrant", "Tech", "Admin", "AuxBilling"]) {
        for (const [k, v] of Object.entries(contact)) all[k.replace("Registrant", role)] = v;
      }
      const body = await call("namecheap.domains.create", all);
      const orderId = attr(body, "DomainCreateResult", "OrderID");
      if (!orderId || attr(body, "DomainCreateResult", "Registered") !== "true") {
        throw new NamecheapError(`Registration not confirmed for ${name}`);
      }
      const expiresAt = new Date();
      expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
      void sld; void tld; // (split kept for future per-TLD handling)
      return { orderId, expiresAt };
    },

    async setNameservers(name, nameservers): Promise<void> {
      const { sld, tld } = splitDomain(name);
      await call("namecheap.domains.dns.setCustom", { SLD: sld, TLD: tld, Nameservers: nameservers.join(",") });
    },
  };
}
```

- [ ] **Step 4: Run tests + tsc, then commit**

Run: `npx vitest run lib/providers/namecheap.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/providers/namecheap.ts lib/providers/namecheap.test.ts
git commit -m "feat(providers): Namecheap registrar adapter (check/suggest/register/setNameservers)"
```

---

### Task 5: Cloudflare EdgeDns adapter

**Files:**
- Create: `lib/providers/cloudflare.ts`, `lib/providers/cloudflare.test.ts`

**Interfaces:**
- Consumes: `EdgeDns`, `DnsRecordInput`, `ZoneResult`, `SslStatus` (Task 3), `CloudflareConfig` (Task 3).
- Produces: `createCloudflareEdge(config: CloudflareConfig): EdgeDns`.

- [ ] **Step 1: Write the failing test (mocked fetch)**

Create `lib/providers/cloudflare.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { createCloudflareEdge } from "./cloudflare";

const config = { apiToken: "t", accountId: "acct-1" };

type Reply = { status?: number; json: unknown };
function mockSequence(replies: Reply[]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  let i = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(init.body as string) : null });
    const r = replies[Math.min(i++, replies.length - 1)];
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
  }));
  return calls;
}
afterEach(() => vi.unstubAllGlobals());
const ok = (result: unknown) => ({ json: { success: true, errors: [], result } });

describe("cloudflare edge", () => {
  it("createZone returns the zone id + assigned nameservers", async () => {
    const calls = mockSequence([ok({ id: "zone-1", name_servers: ["dana.ns.cloudflare.com", "rob.ns.cloudflare.com"] })]);
    const edge = createCloudflareEdge(config);
    const z = await edge.createZone("boomzino.click");
    expect(z).toEqual({ zoneId: "zone-1", nameservers: ["dana.ns.cloudflare.com", "rob.ns.cloudflare.com"] });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/zones");
    expect(calls[0].body).toMatchObject({ name: "boomzino.click", account: { id: "acct-1" } });
  });

  it("upsertRecords creates a DNS-only A record (proxied:false in Phase 0)", async () => {
    const calls = mockSequence([ok({ result: [] }), ok({ id: "rec-1" })]); // list (empty) then create
    const edge = createCloudflareEdge(config);
    await edge.upsertRecords("zone-1", [{ type: "A", name: "boomzino.click", content: "76.76.21.21", proxied: false }]);
    const create = calls[1];
    expect(create.method).toBe("POST");
    expect(create.url).toContain("/zones/zone-1/dns_records");
    expect(create.body).toMatchObject({ type: "A", name: "boomzino.click", content: "76.76.21.21", proxied: false });
  });

  it("ensureSsl maps the universal cert status to active/pending", async () => {
    mockSequence([ok({ certificate_authority: "google", status: "active" })]);
    const edge = createCloudflareEdge(config);
    expect(await edge.ensureSsl("zone-1")).toBe("active");
  });

  it("throws on a Cloudflare error envelope", async () => {
    mockSequence([{ json: { success: false, errors: [{ message: "zone exists" }] } }]);
    const edge = createCloudflareEdge(config);
    await expect(edge.createZone("x.com")).rejects.toThrow(/zone exists/);
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/providers/cloudflare.test.ts` — Expected: FAIL `Cannot find module './cloudflare'`.

- [ ] **Step 3: Implement `cloudflare.ts`**

Create `lib/providers/cloudflare.ts`:

```ts
import type { CloudflareConfig } from "./config";
import type { EdgeDns, DnsRecordInput, ZoneResult, SslStatus } from "./types";

const API = "https://api.cloudflare.com/client/v4";

export class CloudflareError extends Error {
  constructor(message: string) { super(message); this.name = "CloudflareError"; }
}

type Envelope<T> = { success: boolean; errors: { message: string }[]; result: T };

export function createCloudflareEdge(config: CloudflareConfig): EdgeDns {
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json", ...init.headers },
    });
    const body = (await res.json().catch(() => ({}))) as Envelope<T>;
    if (!res.ok || !body.success) {
      throw new CloudflareError(body.errors?.[0]?.message ?? `Cloudflare request failed (${res.status})`);
    }
    return body.result;
  }

  return {
    async createZone(name): Promise<ZoneResult> {
      const r = await call<{ id: string; name_servers: string[] }>("/zones", {
        method: "POST",
        body: JSON.stringify({ name, account: { id: config.accountId }, type: "full" }),
      });
      return { zoneId: r.id, nameservers: r.name_servers };
    },

    async upsertRecords(zoneId, records): Promise<void> {
      const existing = await call<{ id: string; name: string; type: string }[]>(`/zones/${zoneId}/dns_records`, { method: "GET" });
      for (const rec of records) {
        const match = existing.find((e) => e.name === rec.name && e.type === rec.type);
        const payload = JSON.stringify({ type: rec.type, name: rec.name, content: rec.content, proxied: rec.proxied, ttl: 1 });
        if (match) {
          await call(`/zones/${zoneId}/dns_records/${match.id}`, { method: "PUT", body: payload });
        } else {
          await call(`/zones/${zoneId}/dns_records`, { method: "POST", body: payload });
        }
      }
    },

    async ensureSsl(zoneId): Promise<SslStatus> {
      const r = await call<{ status?: string }>(`/zones/${zoneId}/ssl/universal/settings`, { method: "GET" }).catch(() => ({ status: undefined }));
      if (r.status === "active") return "active";
      return r.status ? "pending" : "none";
    },

    async deleteZone(zoneId): Promise<void> {
      await call(`/zones/${zoneId}`, { method: "DELETE" });
    },
  };
}
```

- [ ] **Step 4: Run tests + tsc, then commit**

Run: `npx vitest run lib/providers/cloudflare.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/providers/cloudflare.ts lib/providers/cloudflare.test.ts
git commit -m "feat(providers): Cloudflare EdgeDns adapter (zone/dns/ssl)"
```

---

### Task 6: Vercel origin adapter + providers bundle

**Files:**
- Create: `lib/providers/vercelOrigin.ts`, `lib/providers/vercelOrigin.test.ts`, `lib/providers/index.ts`

**Interfaces:**
- Consumes: `OriginAttach`, `AttachStatus`, `Providers` (Task 3); existing `lib/vercel.ts` (`attachDomain`/`verifyDomain`/`removeDomain`/`vercelConfigFromEnv`/`VercelApiError`).
- Produces: `createVercelOrigin(config: VercelConfig): OriginAttach`; `providersFromEnv(): Providers`.

- [ ] **Step 1: Write the failing test**

Create `lib/providers/vercelOrigin.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/vercel", () => ({
  attachDomain: vi.fn(async () => ({ name: "x.com", verified: false, verification: [] })),
  verifyDomain: vi.fn(async () => ({ name: "x.com", verified: true, verification: [] })),
  removeDomain: vi.fn(async () => {}),
  VercelApiError: class extends Error { status = 404; },
}));

import { attachDomain, verifyDomain, removeDomain } from "@/lib/vercel";
import { createVercelOrigin } from "./vercelOrigin";

const config = { token: "t", projectId: "p" };
afterEach(() => vi.clearAllMocks());

describe("vercel origin adapter", () => {
  it("attach maps Vercel's verified flag", async () => {
    const o = createVercelOrigin(config);
    expect(await o.attach("x.com")).toEqual({ verified: false });
    expect(attachDomain).toHaveBeenCalledWith(config, "x.com");
  });
  it("verify maps the verified flag", async () => {
    const o = createVercelOrigin(config);
    expect(await o.verify("x.com")).toEqual({ verified: true });
    expect(verifyDomain).toHaveBeenCalledWith(config, "x.com");
  });
  it("detach delegates to removeDomain", async () => {
    const o = createVercelOrigin(config);
    await o.detach("x.com");
    expect(removeDomain).toHaveBeenCalledWith(config, "x.com");
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/providers/vercelOrigin.test.ts` — Expected: FAIL `Cannot find module './vercelOrigin'`.

- [ ] **Step 3: Implement `vercelOrigin.ts` + `index.ts`**

Create `lib/providers/vercelOrigin.ts`:

```ts
import { attachDomain, verifyDomain, removeDomain, type VercelConfig } from "@/lib/vercel";
import type { OriginAttach, AttachStatus } from "./types";

// Phase 0 origin: attach each hostname to the single Vercel project. (Phase 1 replaces this
// with a no-op adapter — a VPS routes any Host header, so no per-domain origin step.)
export function createVercelOrigin(config: VercelConfig): OriginAttach {
  return {
    async attach(hostname): Promise<AttachStatus> {
      const r = await attachDomain(config, hostname);
      return { verified: r.verified };
    },
    async verify(hostname): Promise<AttachStatus> {
      const r = await verifyDomain(config, hostname);
      return { verified: r.verified };
    },
    async detach(hostname): Promise<void> {
      await removeDomain(config, hostname);
    },
  };
}
```

Create `lib/providers/index.ts`:

```ts
import { vercelConfigFromEnv } from "@/lib/vercel";
import { namecheapConfigFromEnv, cloudflareConfigFromEnv, originTargetFromEnv } from "./config";
import { createNamecheapRegistrar } from "./namecheap";
import { createCloudflareEdge } from "./cloudflare";
import { createVercelOrigin } from "./vercelOrigin";
import type { Providers } from "./types";

export function providersFromEnv(): Providers {
  return {
    registrar: createNamecheapRegistrar(namecheapConfigFromEnv()),
    edge: createCloudflareEdge(cloudflareConfigFromEnv()),
    origin: createVercelOrigin(vercelConfigFromEnv()),
    originTarget: originTargetFromEnv(),
  };
}
```

- [ ] **Step 4: Run tests + tsc, then commit**

Run: `npx vitest run lib/providers/vercelOrigin.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/providers/vercelOrigin.ts lib/providers/vercelOrigin.test.ts lib/providers/index.ts
git commit -m "feat(providers): Vercel origin adapter + providersFromEnv bundle"
```

---

### Task 7: Domain service — purchase + advance

**Files:**
- Create: `lib/domains/service.ts`, `lib/domains/service.test.ts`

**Interfaces:**
- Consumes: `Providers` (Task 3), `nextStep` (Task 2), `prisma` from `@/lib/db`.
- Produces:
  - `purchaseDomainForLanding(providers: Providers, landingId: string, hostname: string): Promise<string>` (creates a `Domain` row in `purchasing`, returns its id)
  - `advanceDomain(providers: Providers, domainId: string): Promise<DomainStatus>` (executes the single next step, persists, returns the new status; on throw → `failed` + `statusReason`)

> Tests mock `@/lib/db` with a tiny in-memory fake and pass fake adapters, so the state machine is verified without any network or real DB.

- [ ] **Step 1: Write the failing test**

Create `lib/domains/service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory prisma fake (only the calls the service makes).
const db: { domains: any[]; landings: any[] } = { domains: [], landings: [] };
vi.mock("@/lib/db", () => ({
  prisma: {
    domain: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `d${db.domains.length + 1}`, ...data }; db.domains.push(row); return row; }),
      findUnique: vi.fn(async ({ where }: any) => db.domains.find((d) => d.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: any) => { const row = db.domains.find((d) => d.id === where.id); Object.assign(row, data); return row; }),
    },
    landing: { update: vi.fn(async ({ where, data }: any) => { db.landings.push({ where, data }); return {}; }) },
  },
}));

import { purchaseDomainForLanding, advanceDomain } from "./service";
import type { Providers } from "@/lib/providers/types";

function fakeProviders(over: Partial<Providers> = {}): Providers {
  return {
    registrar: {
      checkAvailability: vi.fn(async (name) => ({ name, available: true, priceUsd: 9 })),
      suggest: vi.fn(async () => []),
      register: vi.fn(async () => ({ orderId: "ord-1", expiresAt: new Date("2027-01-01") })),
      setNameservers: vi.fn(async () => {}),
    },
    edge: {
      createZone: vi.fn(async () => ({ zoneId: "z1", nameservers: ["a.ns", "b.ns"] })),
      upsertRecords: vi.fn(async () => {}),
      ensureSsl: vi.fn(async () => "active"),
      deleteZone: vi.fn(async () => {}),
    },
    origin: {
      attach: vi.fn(async () => ({ verified: false })),
      verify: vi.fn(async () => ({ verified: true })),
      detach: vi.fn(async () => {}),
    },
    originTarget: { ip: "76.76.21.21" },
    ...over,
  } as Providers;
}

beforeEach(() => { db.domains = []; db.landings = []; });

describe("domain service", () => {
  it("purchaseDomainForLanding creates a purchasing row", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "boomzino.click");
    const row = db.domains.find((d) => d.id === id);
    expect(row).toMatchObject({ landingId: "land-1", hostname: "boomzino.click", status: "purchasing", registrarOrderId: null });
  });

  it("drives a domain through the full lifecycle to live", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "boomzino.click");

    expect(await advanceDomain(p, id)).toBe("dns_pending");      // register
    expect(p.registrar.register).toHaveBeenCalledOnce();
    expect(db.domains[0].registrarOrderId).toBe("ord-1");

    expect(await advanceDomain(p, id)).toBe("attaching");        // provision_edge
    expect(p.edge.createZone).toHaveBeenCalledOnce();
    expect(p.registrar.setNameservers).toHaveBeenCalledWith("boomzino.click", ["a.ns", "b.ns"]);
    expect(p.edge.upsertRecords).toHaveBeenCalled();

    expect(await advanceDomain(p, id)).toBe("ssl_pending");      // attach_origin
    expect(p.origin.attach).toHaveBeenCalledWith("boomzino.click");

    expect(await advanceDomain(p, id)).toBe("live");             // verify (ssl active + verified)
    expect(db.domains[0].status).toBe("live");
  });

  it("buy-once guard: re-advancing a purchasing row that already has an order does NOT re-register", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await advanceDomain(p, id);                 // register -> dns_pending
    db.domains[0].status = "purchasing";        // simulate a crash/retry that left status stale
    await advanceDomain(p, id);                 // must NOT call register again
    expect(p.registrar.register).toHaveBeenCalledOnce();
  });

  it("stays in ssl_pending while SSL is not yet active", async () => {
    const p = fakeProviders({ edge: { ...fakeProviders().edge, ensureSsl: vi.fn(async () => "pending") } });
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await advanceDomain(p, id); await advanceDomain(p, id); await advanceDomain(p, id);
    expect(await advanceDomain(p, id)).toBe("ssl_pending");
  });

  it("a thrown step marks the domain failed with a reason", async () => {
    const p = fakeProviders({ registrar: { ...fakeProviders().registrar, register: vi.fn(async () => { throw new Error("balance too low"); }) } });
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    expect(await advanceDomain(p, id)).toBe("failed");
    expect(db.domains[0].statusReason).toMatch(/balance too low/);
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/domains/service.test.ts` — Expected: FAIL `Cannot find module './service'`.

- [ ] **Step 3: Implement `service.ts`**

Create `lib/domains/service.ts`:

```ts
import { prisma } from "@/lib/db";
import type { Providers } from "@/lib/providers/types";
import { nextStep } from "./lifecycle";
import type { DomainStatus } from "./status";

export async function purchaseDomainForLanding(
  _providers: Providers, landingId: string, hostname: string,
): Promise<string> {
  const row = await prisma.domain.create({
    data: { landingId, hostname, status: "purchasing", registrar: "namecheap", edgeProvider: "cloudflare", registrarOrderId: null, nameservers: [], verified: false },
  });
  return row.id;
}

export async function advanceDomain(providers: Providers, domainId: string): Promise<DomainStatus> {
  const d = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!d) throw new Error(`Domain not found: ${domainId}`);
  const status = d.status as DomainStatus;

  try {
    const step = nextStep({ status, registrarOrderId: d.registrarOrderId });
    switch (step) {
      case "register": {
        const r = await providers.registrar.register(d.hostname);
        return persist(domainId, { status: "dns_pending", registrarOrderId: r.orderId, expiresAt: r.expiresAt });
      }
      case "provision_edge": {
        const zone = await providers.edge.createZone(d.hostname);
        await providers.registrar.setNameservers(d.hostname, zone.nameservers);
        const target = providers.originTarget;
        const record = target.cname
          ? { type: "CNAME" as const, name: d.hostname, content: target.cname, proxied: false }
          : { type: "A" as const, name: d.hostname, content: target.ip ?? "", proxied: false };
        await providers.edge.upsertRecords(zone.zoneId, [record]);
        return persist(domainId, { status: "attaching", edgeZoneId: zone.zoneId, nameservers: zone.nameservers });
      }
      case "attach_origin": {
        const a = await providers.origin.attach(d.hostname);
        return persist(domainId, { status: "ssl_pending", verified: a.verified, vercelStatus: a.verified ? "verified" : "pending" });
      }
      case "verify": {
        const ssl = d.edgeZoneId ? await providers.edge.ensureSsl(d.edgeZoneId) : "none";
        const att = await providers.origin.verify(d.hostname);
        if (ssl === "active" && att.verified) {
          const out = await persist(domainId, { status: "live", sslStatus: ssl, verified: true, vercelStatus: "verified", lastCheckedAt: new Date() });
          await prisma.landing.update({ where: { id: d.landingId }, data: { primaryDomainId: domainId } });
          return out;
        }
        return persist(domainId, { status: "ssl_pending", sslStatus: ssl, verified: att.verified, lastCheckedAt: new Date() });
      }
      default:
        return status; // terminal / holding — nothing to do
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return persist(domainId, { status: "failed", statusReason: reason });
  }
}

async function persist(id: string, data: Record<string, unknown>): Promise<DomainStatus> {
  const row = await prisma.domain.update({ where: { id }, data });
  return row.status as DomainStatus;
}
```

- [ ] **Step 4: Run tests + tsc, then commit**

Run: `npx vitest run lib/domains/service.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/domains/service.ts lib/domains/service.test.ts
git commit -m "feat(domains): purchase + advance service driving the lifecycle"
```

---

### Task 8: Rotation, retire, flag

**Files:**
- Modify: `lib/domains/service.ts`, `lib/domains/service.test.ts`

**Interfaces:**
- Consumes: `purchaseDomainForLanding`, `advanceDomain` (Task 7).
- Produces:
  - `flagDomain(domainId: string, reason: string): Promise<void>` (→ `flagged` + reason)
  - `retireDomain(providers: Providers, domainId: string): Promise<void>` (tear down edge zone + origin detach → `retired`)
  - `rotateDomain(providers: Providers, landingId: string, newHostname: string): Promise<string>` (buy+provision a fresh domain to `live`, repoint `Landing.primaryDomainId`, retire the old primary; returns the new domain id)

- [ ] **Step 1: Write the failing tests (append to `service.test.ts`)**

Append to `lib/domains/service.test.ts`:

```ts
import { flagDomain, retireDomain, rotateDomain } from "./service";

describe("rotation / retire / flag", () => {
  it("flagDomain sets flagged + reason", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await flagDomain(id, "safe-browsing");
    expect(db.domains[0]).toMatchObject({ status: "flagged", statusReason: "safe-browsing" });
  });

  it("retireDomain tears down the edge zone, detaches origin, and marks retired", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    db.domains[0].edgeZoneId = "z1";
    await retireDomain(p, id);
    expect(p.edge.deleteZone).toHaveBeenCalledWith("z1");
    expect(p.origin.detach).toHaveBeenCalledWith("x.com");
    expect(db.domains[0].status).toBe("retired");
    expect(db.domains[0].retiredAt).toBeInstanceOf(Date);
  });

  it("rotateDomain provisions a fresh live domain then retires the old primary", async () => {
    const p = fakeProviders();
    const oldId = await purchaseDomainForLanding(p, "land-1", "old.com");
    for (let i = 0; i < 4; i++) await advanceDomain(p, oldId); // -> live (sets primaryDomainId)
    db.domains[0].edgeZoneId = "zold";

    const newId = await rotateDomain(p, "land-1", "fresh.com");

    expect(db.domains.find((d) => d.id === newId)?.status).toBe("live");
    expect(db.domains.find((d) => d.id === oldId)?.status).toBe("retired");
    // primaryDomainId repointed to the new domain
    expect(db.landings.at(-1)).toMatchObject({ where: { id: "land-1" }, data: { primaryDomainId: newId } });
  });
});
```

- [ ] **Step 2: Run it (fails — exports missing)**

Run: `npx vitest run lib/domains/service.test.ts` — Expected: FAIL (`flagDomain`/`retireDomain`/`rotateDomain` not exported).

- [ ] **Step 3: Implement the three functions (append to `service.ts`)**

Append to `lib/domains/service.ts`:

```ts
import { isTerminal } from "./status";

export async function flagDomain(domainId: string, reason: string): Promise<void> {
  await prisma.domain.update({ where: { id: domainId }, data: { status: "flagged", statusReason: reason } });
}

export async function retireDomain(providers: Providers, domainId: string): Promise<void> {
  const d = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!d) return;
  await prisma.domain.update({ where: { id: domainId }, data: { status: "retiring" } });
  if (d.edgeZoneId) await providers.edge.deleteZone(d.edgeZoneId).catch(() => {});
  await providers.origin.detach(d.hostname).catch(() => {});
  await prisma.domain.update({ where: { id: domainId }, data: { status: "retired", retiredAt: new Date() } });
}

// Zero-downtime swap: the old domain keeps serving until the new one is fully live.
export async function rotateDomain(providers: Providers, landingId: string, newHostname: string): Promise<string> {
  const newId = await purchaseDomainForLanding(providers, landingId, newHostname);
  // Drive to a terminal status (live or failed). Bounded by the number of lifecycle steps.
  for (let i = 0; i < 6; i++) {
    const status = await advanceDomain(providers, newId);
    if (isTerminal(status)) break;
  }
  const fresh = await prisma.domain.findUnique({ where: { id: newId } });
  if (fresh?.status !== "live") throw new Error(`Rotation failed: new domain ${newHostname} is ${fresh?.status}`);

  const landing = await prisma.landing.findUnique({ where: { id: landingId } });
  const oldPrimaryId = landing?.primaryDomainId ?? null;
  await prisma.landing.update({ where: { id: landingId }, data: { primaryDomainId: newId } });
  if (oldPrimaryId && oldPrimaryId !== newId) await retireDomain(providers, oldPrimaryId);
  return newId;
}
```

> Add `findUnique` for `landing` to the test's prisma fake: in `service.test.ts`, extend the mocked `landing` object with `findUnique: vi.fn(async ({ where }: any) => ({ id: where.id, primaryDomainId: db.domains.find((d) => d.landingId === where.id && d.status === "live")?.id ?? null }))`.

- [ ] **Step 4: Run tests + tsc, then commit**

Run: `npx vitest run lib/domains/service.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/domains/service.ts lib/domains/service.test.ts
git commit -m "feat(domains): rotation (zero-downtime swap) + retire + flag"
```

---

### Task 9: Reconciler + cron route

**Files:**
- Create: `lib/domains/reconcile.ts`, `lib/domains/reconcile.test.ts`, `app/api/cron/reconcile/route.ts`, `app/api/cron/reconcile/route.test.ts`

**Interfaces:**
- Consumes: `advanceDomain` (Task 7), `ACTIVE_STATUSES` (Task 1), `providersFromEnv` (Task 6).
- Produces: `reconcilePending(providers: Providers): Promise<{ advanced: number }>`; `GET` cron route guarded by `CRON_SECRET`.

- [ ] **Step 1: Write the failing reconcile test**

Create `lib/domains/reconcile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const db: { domains: any[] } = { domains: [] };
vi.mock("@/lib/db", () => ({
  prisma: { domain: { findMany: vi.fn(async ({ where }: any) => db.domains.filter((d) => where.status.in.includes(d.status))) } },
}));
vi.mock("./service", () => ({ advanceDomain: vi.fn(async (_p, id) => { const d = db.domains.find((x) => x.id === id); d.status = "live"; return "live"; }) }));

import { reconcilePending } from "./reconcile";
import { advanceDomain } from "./service";

beforeEach(() => { db.domains = []; vi.clearAllMocks(); });

describe("reconcilePending", () => {
  it("advances every active domain and skips terminal ones", async () => {
    db.domains = [
      { id: "a", status: "ssl_pending" }, { id: "b", status: "dns_pending" }, { id: "c", status: "live" },
    ];
    const res = await reconcilePending({} as any);
    expect(res.advanced).toBe(2);
    expect(advanceDomain).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/domains/reconcile.test.ts` — Expected: FAIL `Cannot find module './reconcile'`.

- [ ] **Step 3: Implement `reconcile.ts`**

Create `lib/domains/reconcile.ts`:

```ts
import { prisma } from "@/lib/db";
import type { Providers } from "@/lib/providers/types";
import { advanceDomain } from "./service";
import { ACTIVE_STATUSES } from "./status";

// One idempotent pass: advance every non-terminal domain by a single step.
// Safe to run repeatedly (at-least-once) — each step is keyed off persisted status.
export async function reconcilePending(providers: Providers): Promise<{ advanced: number }> {
  const rows = await prisma.domain.findMany({ where: { status: { in: ACTIVE_STATUSES } } });
  let advanced = 0;
  for (const row of rows) {
    await advanceDomain(providers, row.id);
    advanced += 1;
  }
  return { advanced };
}
```

- [ ] **Step 4: Write the failing cron-route test**

Create `app/api/cron/reconcile/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/domains/reconcile", () => ({ reconcilePending: vi.fn(async () => ({ advanced: 3 })) }));
vi.mock("@/lib/providers", () => ({ providersFromEnv: vi.fn(() => ({})) }));

import { GET } from "./route";
import { reconcilePending } from "@/lib/domains/reconcile";

beforeEach(() => { process.env.CRON_SECRET = "secret"; vi.clearAllMocks(); });

describe("GET /api/cron/reconcile", () => {
  it("rejects without the cron secret", async () => {
    const res = await GET(new Request("http://x/api/cron/reconcile"));
    expect(res.status).toBe(401);
    expect(reconcilePending).not.toHaveBeenCalled();
  });
  it("runs the reconciler with the bearer secret", async () => {
    const res = await GET(new Request("http://x/api/cron/reconcile", { headers: { authorization: "Bearer secret" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ advanced: 3 });
  });
});
```

- [ ] **Step 5: Implement the cron route**

Create `app/api/cron/reconcile/route.ts`:

```ts
import { NextResponse } from "next/server";
import { reconcilePending } from "@/lib/domains/reconcile";
import { providersFromEnv } from "@/lib/providers";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await reconcilePending(providersFromEnv());
  return NextResponse.json(result);
}
```

- [ ] **Step 6: Run tests + tsc, then commit**

Run: `npx vitest run lib/domains/reconcile.test.ts "app/api/cron/reconcile/route.test.ts" && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/domains/reconcile.ts lib/domains/reconcile.test.ts "app/api/cron/reconcile/route.ts" "app/api/cron/reconcile/route.test.ts"
git commit -m "feat(domains): reconciler + cron route"
```

---

### Task 10: Admin API endpoints

**Files:**
- Create: `app/api/admin/domains/suggest/route.ts`, `app/api/admin/domains/buy/route.ts`, `app/api/admin/domains/rotate/route.ts`, `app/api/admin/domains/[id]/retry/route.ts`, `app/api/admin/domains/[id]/flag/route.ts` (+ a `route.test.ts` beside `buy`)
- Modify: `lib/domains.ts` (extend `DomainView`/`toView` with the new fields)

**Interfaces:**
- Consumes: `requireApiSession` (`@/lib/admin/guard`), service functions (Tasks 7–8), `providersFromEnv` (Task 6), `domainErrorResponse` (`app/api/admin/domains/errors.ts`).
- Produces: REST endpoints. `GET /suggest?keyword=&tlds=`; `POST /buy {landingId, hostname}`; `POST /rotate {landingId, hostname}`; `POST /[id]/retry`; `POST /[id]/flag {reason}`.

- [ ] **Step 1: Extend `DomainView` + `toView` in `lib/domains.ts`**

In `lib/domains.ts`, add the new fields to `DomainView` and `DomainRow` and map them in `toView`:

```ts
export type DomainView = {
  id: string;
  hostname: string;
  status: string;
  verified: boolean;
  vercelStatus: string | null;
  sslStatus: string | null;
  statusReason: string | null;
  dns: DnsRecord;
};
```
```ts
type DomainRow = { id: string; hostname: string; status: string; verified: boolean; vercelStatus: string | null; sslStatus: string | null; statusReason: string | null };
```
```ts
function toView(row: DomainRow): DomainView {
  return {
    id: row.id, hostname: row.hostname, status: row.status, verified: row.verified,
    vercelStatus: row.vercelStatus, sslStatus: row.sslStatus, statusReason: row.statusReason,
    dns: dnsInstructionsFor(row.hostname),
  };
}
```

(The existing `listDomains` `select`/`findMany` returns the full row, so these fields are present; no query change needed. `addDomain` keeps working — set `status: result.verified ? "live" : "attaching"` in its `create` data so manually-attached domains have a sensible status.)

- [ ] **Step 2: Write the failing test for `buy`**

Create `app/api/admin/domains/buy/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin/guard", () => ({ requireApiSession: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/providers", () => ({ providersFromEnv: vi.fn(() => ({})) }));
vi.mock("@/lib/domains/service", () => ({
  purchaseDomainForLanding: vi.fn(async () => "dom-1"),
  advanceDomain: vi.fn(async () => "dns_pending"),
}));

import { POST } from "./route";
import { purchaseDomainForLanding, advanceDomain } from "@/lib/domains/service";

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/domains/buy", () => {
  it("400s without landingId + hostname", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });
  it("purchases then kicks off the first advance", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ landingId: "l1", hostname: "boomzino.click" }) }));
    expect(res.status).toBe(201);
    expect(purchaseDomainForLanding).toHaveBeenCalledWith({}, "l1", "boomzino.click");
    expect(advanceDomain).toHaveBeenCalledWith({}, "dom-1");
    expect(await res.json()).toEqual({ domainId: "dom-1", status: "dns_pending" });
  });
});
```

- [ ] **Step 3: Run it (fails — module missing)**

Run: `npx vitest run "app/api/admin/domains/buy/route.test.ts"` — Expected: FAIL `Cannot find module './route'`.

- [ ] **Step 4: Implement the five routes**

Create `app/api/admin/domains/buy/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { purchaseDomainForLanding, advanceDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../errors";

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { landingId, hostname } = (await req.json().catch(() => ({}))) as { landingId?: string; hostname?: string };
  if (!landingId || !hostname) return NextResponse.json({ error: "landingId and hostname are required" }, { status: 400 });
  try {
    const providers = providersFromEnv();
    const domainId = await purchaseDomainForLanding(providers, landingId, hostname);
    const status = await advanceDomain(providers, domainId); // first step: register
    return NextResponse.json({ domainId, status }, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

Create `app/api/admin/domains/suggest/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { domainErrorResponse } from "../errors";

export async function GET(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const url = new URL(req.url);
  const keyword = url.searchParams.get("keyword");
  if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  const tlds = (url.searchParams.get("tlds") ?? "com,net,click,online,xyz").split(",");
  try {
    const candidates = await providersFromEnv().registrar.suggest(keyword, tlds);
    return NextResponse.json({ candidates });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

Create `app/api/admin/domains/rotate/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { rotateDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../errors";

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { landingId, hostname } = (await req.json().catch(() => ({}))) as { landingId?: string; hostname?: string };
  if (!landingId || !hostname) return NextResponse.json({ error: "landingId and hostname are required" }, { status: 400 });
  try {
    const domainId = await rotateDomain(providersFromEnv(), landingId, hostname);
    return NextResponse.json({ domainId }, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

Create `app/api/admin/domains/[id]/retry/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { providersFromEnv } from "@/lib/providers";
import { advanceDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../../errors";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  try {
    const status = await advanceDomain(providersFromEnv(), id);
    return NextResponse.json({ domainId: id, status });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

Create `app/api/admin/domains/[id]/flag/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/admin/guard";
import { flagDomain } from "@/lib/domains/service";
import { domainErrorResponse } from "../../errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };
  try {
    await flagDomain(id, reason ?? "manual");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

- [ ] **Step 5: Run tests + tsc, then commit**

Run: `npx vitest run "app/api/admin/domains/buy/route.test.ts" && npx tsc --noEmit` — Expected: PASS, exit 0. (Confirm the existing `app/api/admin/domains/route.test.ts` still passes after the `DomainView` change: `npx vitest run "app/api/admin/domains/route.test.ts"`.)

```bash
git add "app/api/admin/domains" lib/domains.ts
git commit -m "feat(domains): admin API (suggest/buy/rotate/retry/flag) + DomainView status fields"
```

---

### Task 11: DomainsPanel UI + env docs + final verification

**Files:**
- Modify: `components/admin/DomainsPanel.tsx`, `components/admin/DomainsPanel.test.tsx`, `lib/adminClient.ts`
- Create: `.env.example` (if absent — append the new vars if present)

**Interfaces:**
- Consumes: the admin endpoints (Task 10) via `lib/adminClient.ts`.
- Produces: a provisioning UI — keyword → suggestions → "Buy & provision", a live-status list with per-domain `status`/`statusReason`, and **Rotate** / **Mark flagged** / **Retry** actions.

- [ ] **Step 1: Add client helpers in `lib/adminClient.ts`**

Append (match the existing fetch-wrapper style in that file):

```ts
export async function suggestDomains(keyword: string): Promise<{ candidates: { name: string; available: boolean; priceUsd: number }[] }> {
  const res = await fetch(`/api/admin/domains/suggest?keyword=${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error((await res.json()).error ?? "suggest failed");
  return res.json();
}
export async function buyDomain(landingId: string, hostname: string): Promise<{ domainId: string; status: string }> {
  const res = await fetch("/api/admin/domains/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingId, hostname }) });
  if (!res.ok) throw new Error((await res.json()).error ?? "buy failed");
  return res.json();
}
export async function rotateDomain(landingId: string, hostname: string): Promise<{ domainId: string }> {
  const res = await fetch("/api/admin/domains/rotate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingId, hostname }) });
  if (!res.ok) throw new Error((await res.json()).error ?? "rotate failed");
  return res.json();
}
export async function flagDomain(id: string, reason: string): Promise<void> {
  await fetch(`/api/admin/domains/${id}/flag`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
}
export async function retryDomain(id: string): Promise<void> {
  await fetch(`/api/admin/domains/${id}/retry`, { method: "POST" });
}
```

- [ ] **Step 2: Write the failing DomainsPanel test**

Add to `components/admin/DomainsPanel.test.tsx` (mock `lib/adminClient`'s new helpers; mirror the file's existing render+mock pattern):

```tsx
it("buys a suggested domain and shows its provisioning status", async () => {
  const { suggestDomains, buyDomain } = await import("@/lib/adminClient");
  vi.mocked(suggestDomains).mockResolvedValue({ candidates: [{ name: "boomzino.click", available: true, priceUsd: 9 }] });
  vi.mocked(buyDomain).mockResolvedValue({ domainId: "d1", status: "dns_pending" });

  render(<DomainsPanel landingId="l1" />);
  await userEvent.type(screen.getByPlaceholderText(/brand or keyword/i), "boomzino");
  await userEvent.click(screen.getByRole("button", { name: /search/i }));
  await userEvent.click(await screen.findByRole("button", { name: /buy & provision boomzino\.click/i }));

  expect(buyDomain).toHaveBeenCalledWith("l1", "boomzino.click");
  expect(await screen.findByText(/dns_pending/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run it (fails)**

Run: `npx vitest run components/admin/DomainsPanel.test.tsx` — Expected: FAIL (search box / buy button not present).

- [ ] **Step 4: Implement the DomainsPanel additions**

In `components/admin/DomainsPanel.tsx`, add a provisioning section above the existing manual-attach form: a keyword input + "Search" button calling `suggestDomains`, a list of available candidates each with a "Buy & provision {name}" button calling `buyDomain` then optimistically showing the returned `status`; and for each existing domain row render its `status` + `statusReason` with **Rotate** (prompts for a new hostname → `rotateDomain`), **Mark flagged** (`flagDomain(id, "manual")`), and **Retry** (`retryDomain(id)`) buttons. Keep the existing "Attach existing domain" form as the manual escape hatch. (Follow the component's existing state/handler/error-display conventions; no new styling system.)

- [ ] **Step 5: Run tests + tsc**

Run: `npx vitest run components/admin/DomainsPanel.test.tsx && npx tsc --noEmit` — Expected: PASS, exit 0.

- [ ] **Step 6: Document env + add a Vercel cron entry**

Create/append `.env.example` with the new keys (no values):

```
# Registrar (Namecheap)
NAMECHEAP_API_USER=
NAMECHEAP_API_KEY=
NAMECHEAP_USERNAME=
NAMECHEAP_CLIENT_IP=
NAMECHEAP_SANDBOX=true
# Default WHOIS registrant (PII — keep out of git)
REGISTRANT_FIRST_NAME=
REGISTRANT_LAST_NAME=
REGISTRANT_ADDRESS1=
REGISTRANT_CITY=
REGISTRANT_STATE=
REGISTRANT_POSTAL=
REGISTRANT_COUNTRY=US
REGISTRANT_PHONE=
REGISTRANT_EMAIL=
# Edge (Cloudflare)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
# Origin DNS target (Phase 0 default = Vercel anycast IP)
ORIGIN_DNS_TARGET=76.76.21.21
# Reconciler cron auth
CRON_SECRET=
```

Add to `vercel.json` (create if absent) a cron hitting the reconciler every 5 minutes:

```json
{ "crons": [{ "path": "/api/cron/reconcile", "schedule": "*/5 * * * *" }] }
```

> Note: Vercel Cron sends the `Authorization: Bearer ${CRON_SECRET}` header only if you configure it; for Vercel Cron specifically, also accept Vercel's own cron header per their docs during P0 if the bearer isn't injected. (Verify against current Vercel Cron docs at implementation.)

- [ ] **Step 7: Full verification + commit**

Run: `npm test && npx tsc --noEmit` — Expected: full suite green, exit 0.

Then a **sandbox smoke** (manual, not in CI), with Namecheap sandbox + a Cloudflare test zone + Vercel preview project credentials in `.env`: create a landing, call `buy` with a sandbox-available domain, watch the reconciler drive it `purchasing → … → live`. Tear down the sandbox domain/zone afterward. Document the result in the commit body.

```bash
git add components/admin/DomainsPanel.tsx components/admin/DomainsPanel.test.tsx lib/adminClient.ts .env.example vercel.json
git commit -m "feat(domains): DomainsPanel provisioning/rotation UI + env + reconcile cron"
```

---

## Self-Review

**Spec coverage:**
- §4.1 Registrar/EdgeDns/OriginAttach adapters → Tasks 3–6. ✓
- §4.2 lifecycle state machine + buy-once guard → Tasks 1–2 (pure) + Task 7 (execution). ✓
- §4.3 reconciler → Task 9. ✓
- §5 data model (`Domain` fields + `Landing.primaryDomainId`) → Task 1. ✓
- §6 per-landing flow (buy→DNS→attach→SSL→verify→live) → Task 7; rotation/retire/flag → Task 8. ✓
- §7 admin UX (provision + status + rotate/flag/retry) → Tasks 10–11. ✓
- §8 config/secrets → Task 3 + Task 11 Step 6. ✓
- §11 failure modes (buy-once, partial→failed+retry, rotation atomicity, idempotent reconciler) → Tasks 2,7,8,9. ✓
- §12 testing (pure SM, adapter contract tests w/ mocked fetch, admin component test, sandbox-gated integration) → every task + Task 11 Step 7. ✓
- §3.1 Phase-0 DNS-only constraint → enforced (`proxied:false` everywhere; Global Constraints). ✓

**Placeholder scan:** No "TBD/handle errors generically". Task 11 Step 4 describes the DomainsPanel JSX in prose rather than a full literal because it threads into an existing component's conventions; its required behavior (search→suggest, buy button label `Buy & provision {name}`, status/reason display, rotate/flag/retry handlers) is pinned by the Step 2 test. The one verify-at-implementation note (Vercel Cron header) is flagged explicitly, not hidden. ✓

**Type consistency:** `Registrar`/`EdgeDns`/`OriginAttach`/`Providers` (Task 3) are consumed unchanged in Tasks 4–7. `nextStep`'s `Step` union (Task 2) matches the `switch` arms in `advanceDomain` (Task 7). `DomainStatus` strings are identical across schema (Task 1), lifecycle (Task 2), service (Tasks 7–8), reconciler (Task 9). `purchaseDomainForLanding`/`advanceDomain`/`rotateDomain`/`retireDomain`/`flagDomain` signatures match between definition (Tasks 7–8) and callers (Tasks 9–10). `DomainView` extension (Task 10) matches the fields the UI reads (Task 11). ✓

## Out of scope (Phase 1 — separate plan)
VPS origin + Docker + Host-header routing; switching `OriginAttach` to the no-op adapter; Cloudflare proxy (orange-cloud) + origin-hiding; automated Safe-Browsing/uptime rotation triggers; Cloudflare-for-SaaS at very large scale; per-TLD pricing strategy.
