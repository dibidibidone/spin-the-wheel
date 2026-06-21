# Spin-the-Wheel — Plan 3: Custom Domains (Vercel Domains API)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the operator attach a custom domain to any landing from the CMS — the platform calls the **Vercel Domains API** to register the domain on the project (Vercel auto-provisions TLS), persists it in the `Domain` table that Plan 1's host resolver already reads, shows the operator exactly which DNS record to set, and lets them re-check verification status.

**Architecture:** A thin, fully-mocked-in-tests Vercel REST client (`lib/vercel.ts`) plus a pure DNS-instruction helper (`lib/dns.ts`) are composed by a domain service (`lib/domains.ts`) that orchestrates Prisma + Vercel. Three auth-guarded API routes (`/api/admin/domains`, `/api/admin/domains/[id]`, `/api/admin/domains/[id]/verify`) expose add/list/remove/verify. A `'use client'` `DomainsPanel` renders the editor UI and is mounted into Plan 2's landing editor "Domains" tab.

**Tech Stack:** Next.js 15 (App Router route handlers), React 19, TypeScript (strict), Prisma 6 + PostgreSQL, Vitest + Testing Library, `fetch` against `https://api.vercel.com`.

**Scope note:** This is **Plan 3 of 3**. It assumes **Plan 1** (foundation + public landing — Prisma schema incl. the `Domain` model, `lib/db.ts`, `getLandingByHost`, the host-routing middleware) and **Plan 2** (CMS/admin — Auth.js, the `requireAdmin` guard, and the tabbed landing editor) are complete. This plan adds only the custom-domain capability on top of them; it does not redefine the `Domain` model (Plan 1 already created it).

## Dependencies (interfaces consumed from earlier plans)

These already exist when this plan runs. Each new module declares them in its own `Consumes` block; this is the authoritative list:

- **From Plan 1 — `lib/db.ts`:** `prisma` (singleton `PrismaClient`) with the `Domain` model:
  `Domain { id: string; landingId: string; hostname: string (unique); verified: boolean; vercelStatus: string | null; createdAt: DateTime }`.
- **From Plan 1 — host resolution:** `getLandingByHost(host)` already looks up `Domain.hostname` (lowercased) → landing. Adding a verified domain here makes the landing serve on that host with **no further wiring**.
- **From Plan 2 — `lib/auth.ts`:** `requireAdmin(): Promise<{ email: string } | null>` — resolves the current admin session server-side, or `null` if unauthenticated. Every route handler in this plan calls it first and returns `401` on `null`. The route tests **mock** `requireAdmin`'s behavior with `vi.mock("@/lib/auth", …)`, but Vitest still resolves the module path — so `lib/auth.ts` must **exist on disk** for Tasks 4–5 to run. It exists when this plan runs after Plan 2. *If you must run this plan before Plan 2,* first create a throwaway `lib/auth.ts` (`export async function requireAdmin() { return { email: "dev@local" }; }`) and let Plan 2 replace it.
- **From Plan 2 — landing editor:** `app/admin/landings/[id]/page.tsx` renders tabbed sections. Task 6 produces `DomainsPanel`; the editor mounts it in the "Domains" tab (wiring step documented in Task 6).

## Global Constraints

- **Node** ≥ 20. **Package manager:** npm. **TypeScript strict mode** on; no `any` in committed code except where a third-party type is genuinely missing (comment why).
- **Next.js App Router** only. Route handlers are React Server Components / server code; the editor panel is marked `'use client'`.
- **Secrets:** the Vercel token and project id come from env (`VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`). **Never hardcode credentials** and never log the token.
- **Vercel API base:** `https://api.vercel.com`. Attach uses `POST /v10/projects/{projectId}/domains`; get/verify/remove use `/v9/projects/{projectId}/domains/{hostname}`. When `teamId` is set, append `?teamId=…` to every request.
- **Auth:** every `/api/admin/*` route handler in this plan calls `requireAdmin()` first and returns `401` when it resolves to `null`.
- **DNS records (Vercel managed):** apex domains point an `A` record to `76.76.21.21`; sub-domains point a `CNAME` to `cname.vercel-dns.com`.
- **Hostname normalization:** lowercase, trim, strip scheme/path/port before persisting or sending to Vercel. Persisted `hostname` must match what Plan 1's resolver looks up (lowercased host).
- **TDD:** write the failing test first for every logic/route/component task. **Commit after every task.**
- **Test commands:** unit/component/route `npm test`.

---

## File Structure

```
.env.example                                       # + VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID
lib/
  vercel.ts                                        # Vercel Domains REST client (mockable)
  dns.ts                                           # pure: normalize/validate hostname + DNS instructions
  domains.ts                                       # service: Prisma + Vercel orchestration
app/
  api/admin/domains/
    route.ts                                        # GET ?landingId= (list) + POST (add)
    errors.ts                                        # shared error -> NextResponse mapping
    [id]/route.ts                                    # DELETE (remove)
    [id]/verify/route.ts                             # POST (re-check verification)
  admin/landings/[id]/
    DomainsPanel.tsx                                 # 'use client' editor panel (mounted by Plan 2 editor)
app/globals.css                                      # + .domains-* / .badge styles (append)
tests live colocated as *.test.ts(x) next to each module
```

---

## Task 1: Vercel Domains API client + env

**Files:**
- Modify: `.env.example`
- Create: `lib/vercel.ts`
- Test: `lib/vercel.test.ts`

**Interfaces:**
- Produces:
  - `type VercelConfig = { token: string; projectId: string; teamId?: string }`
  - `type VercelDomain = { name: string; verified: boolean; verification: { type: string; domain: string; value: string; reason: string }[] }`
  - `class VercelApiError extends Error { status: number; code: string }`
  - `vercelConfigFromEnv(): VercelConfig` — throws if token/projectId missing.
  - `attachDomain(config, hostname): Promise<VercelDomain>`
  - `getDomain(config, hostname): Promise<VercelDomain>`
  - `verifyDomain(config, hostname): Promise<VercelDomain>`
  - `removeDomain(config, hostname): Promise<void>`

- [ ] **Step 1: Add Vercel env vars** — append to `.env.example`

```
VERCEL_TOKEN=""
VERCEL_PROJECT_ID=""
VERCEL_TEAM_ID=""
```

- [ ] **Step 2: Write the failing test** — `lib/vercel.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  attachDomain,
  verifyDomain,
  removeDomain,
  vercelConfigFromEnv,
  VercelApiError,
} from "@/lib/vercel";

const config = { token: "tok_123", projectId: "prj_1" };

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

beforeEach(() => vi.unstubAllGlobals());

describe("attachDomain", () => {
  it("POSTs to the v10 project domains endpoint with auth + name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRes({ name: "promo.com", verified: false, verification: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const domain = await attachDomain(config, "promo.com");

    expect(domain).toEqual({ name: "promo.com", verified: false, verification: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.vercel.com/v10/projects/prj_1/domains");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "promo.com" }));
    expect(init.headers.Authorization).toBe("Bearer tok_123");
  });

  it("appends teamId when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ name: "promo.com", verified: true, verification: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await attachDomain({ ...config, teamId: "team_9" }, "promo.com");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.vercel.com/v10/projects/prj_1/domains?teamId=team_9",
    );
  });

  it("throws VercelApiError carrying the API status and code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRes({ error: { code: "domain_taken", message: "in use" } }, 409));
    vi.stubGlobal("fetch", fetchMock);

    await expect(attachDomain(config, "taken.com")).rejects.toMatchObject({
      name: "VercelApiError",
      status: 409,
      code: "domain_taken",
      message: "in use",
    });
  });
});

describe("verifyDomain", () => {
  it("POSTs to the v9 verify endpoint and returns the parsed domain", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ name: "promo.com", verified: true, verification: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const domain = await verifyDomain(config, "promo.com");

    expect(domain.verified).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.vercel.com/v9/projects/prj_1/domains/promo.com/verify",
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});

describe("removeDomain", () => {
  it("DELETEs and tolerates a 204 with no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(removeDomain(config, "promo.com")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.vercel.com/v9/projects/prj_1/domains/promo.com");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("vercelConfigFromEnv", () => {
  it("reads env vars and throws when required ones are missing", () => {
    const prev = { ...process.env };
    process.env.VERCEL_TOKEN = "tok";
    process.env.VERCEL_PROJECT_ID = "prj";
    delete process.env.VERCEL_TEAM_ID;
    expect(vercelConfigFromEnv()).toEqual({ token: "tok", projectId: "prj", teamId: undefined });

    delete process.env.VERCEL_PROJECT_ID;
    expect(() => vercelConfigFromEnv()).toThrow(/VERCEL_PROJECT_ID/);
    process.env = prev;
  });
});

describe("VercelApiError", () => {
  it("is an Error subclass", () => {
    expect(new VercelApiError(500, "x", "y")).toBeInstanceOf(Error);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- lib/vercel.test.ts`
Expected: FAIL — module `@/lib/vercel` not found.

- [ ] **Step 4: Implement** — `lib/vercel.ts`

```ts
const API_BASE = "https://api.vercel.com";

export type VercelConfig = { token: string; projectId: string; teamId?: string };

export type VercelDomain = {
  name: string;
  verified: boolean;
  verification: { type: string; domain: string; value: string; reason: string }[];
};

export class VercelApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "VercelApiError";
    this.status = status;
    this.code = code;
  }
}

export function vercelConfigFromEnv(): VercelConfig {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token) throw new Error("VERCEL_TOKEN is not set");
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not set");
  return { token, projectId, teamId: process.env.VERCEL_TEAM_ID || undefined };
}

function buildUrl(path: string, config: VercelConfig): string {
  const url = new URL(`${API_BASE}${path}`);
  if (config.teamId) url.searchParams.set("teamId", config.teamId);
  return url.toString();
}

async function call(config: VercelConfig, path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(buildUrl(path, config), {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (res.status === 204) return null;
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  if (!res.ok) {
    throw new VercelApiError(
      res.status,
      body.error?.code ?? "unknown",
      body.error?.message ?? "Vercel API request failed",
    );
  }
  return body;
}

function toDomain(body: unknown): VercelDomain {
  const b = body as Partial<VercelDomain> & { name: string };
  return { name: b.name, verified: b.verified ?? false, verification: b.verification ?? [] };
}

export async function attachDomain(config: VercelConfig, hostname: string): Promise<VercelDomain> {
  const body = await call(config, `/v10/projects/${config.projectId}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: hostname }),
  });
  return toDomain(body);
}

export async function getDomain(config: VercelConfig, hostname: string): Promise<VercelDomain> {
  const body = await call(config, `/v9/projects/${config.projectId}/domains/${hostname}`, {
    method: "GET",
  });
  return toDomain(body);
}

export async function verifyDomain(config: VercelConfig, hostname: string): Promise<VercelDomain> {
  const body = await call(config, `/v9/projects/${config.projectId}/domains/${hostname}/verify`, {
    method: "POST",
  });
  return toDomain(body);
}

export async function removeDomain(config: VercelConfig, hostname: string): Promise<void> {
  await call(config, `/v9/projects/${config.projectId}/domains/${hostname}`, { method: "DELETE" });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- lib/vercel.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add .env.example lib/vercel.ts lib/vercel.test.ts
git commit -m "feat: Vercel Domains API client"
```

---

## Task 2: DNS instructions + hostname helpers (pure)

**Files:**
- Create: `lib/dns.ts`
- Test: `lib/dns.test.ts`

**Interfaces:**
- Produces:
  - `const VERCEL_A_RECORD = "76.76.21.21"`, `const VERCEL_CNAME_TARGET = "cname.vercel-dns.com"`
  - `type DnsRecord = { type: "A" | "CNAME"; name: string; value: string }`
  - `normalizeHostname(input: string): string` — lowercase, trim, strip scheme/path/port.
  - `isValidHostname(host: string): boolean` — requires at least two dot-separated labels of valid chars.
  - `dnsInstructionsFor(hostname: string): DnsRecord` — apex → `A @`; sub-domain → `CNAME <sub>`.

- [ ] **Step 1: Write the failing test** — `lib/dns.test.ts`

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeHostname,
  isValidHostname,
  dnsInstructionsFor,
  VERCEL_A_RECORD,
  VERCEL_CNAME_TARGET,
} from "@/lib/dns";

describe("normalizeHostname", () => {
  it("lowercases and strips scheme, path, and port", () => {
    expect(normalizeHostname("  HTTPS://Promo.Boomzino.com:443/win?x=1 ")).toBe("promo.boomzino.com");
    expect(normalizeHostname("boomzino.com")).toBe("boomzino.com");
  });
});

describe("isValidHostname", () => {
  it("accepts multi-label hostnames", () => {
    expect(isValidHostname("boomzino.com")).toBe(true);
    expect(isValidHostname("promo.boomzino.com")).toBe(true);
  });

  it("rejects single labels, bad characters, and leading/trailing hyphens", () => {
    expect(isValidHostname("localhost")).toBe(false);
    expect(isValidHostname("bad_underscore.com")).toBe(false);
    expect(isValidHostname("-bad.com")).toBe(false);
    expect(isValidHostname("bad-.com")).toBe(false);
  });
});

describe("dnsInstructionsFor", () => {
  it("returns an apex A record for two-label domains", () => {
    expect(dnsInstructionsFor("boomzino.com")).toEqual({
      type: "A",
      name: "@",
      value: VERCEL_A_RECORD,
    });
  });

  it("returns a CNAME for sub-domains, with the sub-domain as the record name", () => {
    expect(dnsInstructionsFor("promo.boomzino.com")).toEqual({
      type: "CNAME",
      name: "promo",
      value: VERCEL_CNAME_TARGET,
    });
    expect(dnsInstructionsFor("a.b.boomzino.com")).toEqual({
      type: "CNAME",
      name: "a.b",
      value: VERCEL_CNAME_TARGET,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/dns.test.ts`
Expected: FAIL — module `@/lib/dns` not found.

- [ ] **Step 3: Implement** — `lib/dns.ts`

```ts
export const VERCEL_A_RECORD = "76.76.21.21";
export const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

// One or more dot-separated labels; each 1-63 chars, no leading/trailing hyphen.
const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export function isValidHostname(host: string): boolean {
  return HOSTNAME_RE.test(host);
}

export function dnsInstructionsFor(hostname: string): DnsRecord {
  const labels = hostname.split(".");
  if (labels.length <= 2) {
    return { type: "A", name: "@", value: VERCEL_A_RECORD };
  }
  const subdomain = labels.slice(0, labels.length - 2).join(".");
  return { type: "CNAME", name: subdomain, value: VERCEL_CNAME_TARGET };
}
```

> Note: apex detection counts labels, so multi-part public suffixes (e.g. `example.co.uk`) would be treated as a sub-domain. That is out of scope here (YAGNI) — operators on such TLDs follow Vercel's dashboard hint. Documented intentionally.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/dns.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dns.ts lib/dns.test.ts
git commit -m "feat: hostname normalization/validation and DNS instructions"
```

---

## Task 3: Domain service (Prisma + Vercel orchestration)

**Files:**
- Create: `lib/domains.ts`
- Test: `lib/domains.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/db`; `attachDomain`, `verifyDomain`, `removeDomain` (as `vercelRemoveDomain`), `VercelApiError`, `VercelConfig` from `@/lib/vercel`; `dnsInstructionsFor`, `normalizeHostname`, `isValidHostname`, `DnsRecord` from `@/lib/dns`.
- Produces:
  - `type DomainView = { id: string; hostname: string; verified: boolean; vercelStatus: string | null; dns: DnsRecord }`
  - `class InvalidHostnameError extends Error`
  - `listDomains(landingId: string): Promise<DomainView[]>`
  - `addDomain(landingId: string, rawHostname: string, config: VercelConfig): Promise<DomainView>`
  - `refreshDomain(domainId: string, config: VercelConfig): Promise<DomainView>`
  - `removeDomain(domainId: string, config: VercelConfig): Promise<void>` — tolerates a Vercel 404.

- [ ] **Step 1: Write the failing test** — `lib/domains.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const domain = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
vi.mock("@/lib/db", () => ({ prisma: { domain } }));

const attachDomain = vi.fn();
const verifyDomain = vi.fn();
const vercelRemove = vi.fn();
vi.mock("@/lib/vercel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vercel")>();
  return { ...actual, attachDomain, verifyDomain, removeDomain: vercelRemove };
});

import {
  listDomains,
  addDomain,
  refreshDomain,
  removeDomain,
  InvalidHostnameError,
} from "@/lib/domains";
import { VercelApiError } from "@/lib/vercel";

const config = { token: "t", projectId: "p" };

beforeEach(() => {
  Object.values(domain).forEach((fn) => fn.mockReset());
  attachDomain.mockReset();
  verifyDomain.mockReset();
  vercelRemove.mockReset();
});

describe("listDomains", () => {
  it("maps rows to views with DNS instructions", async () => {
    domain.findMany.mockResolvedValue([
      { id: "d1", hostname: "promo.boomzino.com", verified: false, vercelStatus: "pending" },
    ]);
    const views = await listDomains("L1");
    expect(domain.findMany).toHaveBeenCalledWith({
      where: { landingId: "L1" },
      orderBy: { createdAt: "asc" },
    });
    expect(views[0].dns).toEqual({ type: "CNAME", name: "promo", value: "cname.vercel-dns.com" });
  });
});

describe("addDomain", () => {
  it("normalizes, attaches via Vercel, persists, and returns a view", async () => {
    attachDomain.mockResolvedValue({ name: "promo.boomzino.com", verified: false, verification: [] });
    domain.create.mockResolvedValue({
      id: "d1",
      hostname: "promo.boomzino.com",
      verified: false,
      vercelStatus: "pending",
    });

    const view = await addDomain("L1", "  HTTPS://Promo.Boomzino.com/win  ", config);

    expect(attachDomain).toHaveBeenCalledWith(config, "promo.boomzino.com");
    expect(domain.create).toHaveBeenCalledWith({
      data: {
        landingId: "L1",
        hostname: "promo.boomzino.com",
        verified: false,
        vercelStatus: "pending",
      },
    });
    expect(view).toEqual({
      id: "d1",
      hostname: "promo.boomzino.com",
      verified: false,
      vercelStatus: "pending",
      dns: { type: "CNAME", name: "promo", value: "cname.vercel-dns.com" },
    });
  });

  it("rejects an invalid hostname before calling Vercel", async () => {
    await expect(addDomain("L1", "not-a-domain", config)).rejects.toBeInstanceOf(InvalidHostnameError);
    expect(attachDomain).not.toHaveBeenCalled();
  });
});

describe("refreshDomain", () => {
  it("re-verifies via Vercel and updates the row", async () => {
    domain.findUnique.mockResolvedValue({ id: "d1", hostname: "promo.boomzino.com" });
    verifyDomain.mockResolvedValue({ name: "promo.boomzino.com", verified: true, verification: [] });
    domain.update.mockResolvedValue({
      id: "d1",
      hostname: "promo.boomzino.com",
      verified: true,
      vercelStatus: "verified",
    });

    const view = await refreshDomain("d1", config);

    expect(verifyDomain).toHaveBeenCalledWith(config, "promo.boomzino.com");
    expect(domain.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { verified: true, vercelStatus: "verified" },
    });
    expect(view.verified).toBe(true);
  });
});

describe("removeDomain", () => {
  it("removes from Vercel then deletes the row", async () => {
    domain.findUnique.mockResolvedValue({ id: "d1", hostname: "promo.boomzino.com" });
    vercelRemove.mockResolvedValue(undefined);

    await removeDomain("d1", config);

    expect(vercelRemove).toHaveBeenCalledWith(config, "promo.boomzino.com");
    expect(domain.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("still deletes the row when Vercel returns 404", async () => {
    domain.findUnique.mockResolvedValue({ id: "d1", hostname: "promo.boomzino.com" });
    vercelRemove.mockRejectedValue(new VercelApiError(404, "not_found", "gone"));

    await removeDomain("d1", config);

    expect(domain.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("is a no-op when the row does not exist", async () => {
    domain.findUnique.mockResolvedValue(null);
    await removeDomain("missing", config);
    expect(vercelRemove).not.toHaveBeenCalled();
    expect(domain.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/domains.test.ts`
Expected: FAIL — module `@/lib/domains` not found.

- [ ] **Step 3: Implement** — `lib/domains.ts`

```ts
import { prisma } from "./db";
import {
  attachDomain,
  verifyDomain,
  removeDomain as vercelRemoveDomain,
  VercelApiError,
  type VercelConfig,
} from "./vercel";
import { dnsInstructionsFor, normalizeHostname, isValidHostname, type DnsRecord } from "./dns";

export type DomainView = {
  id: string;
  hostname: string;
  verified: boolean;
  vercelStatus: string | null;
  dns: DnsRecord;
};

export class InvalidHostnameError extends Error {
  constructor(hostname: string) {
    super(`Invalid hostname: ${hostname}`);
    this.name = "InvalidHostnameError";
  }
}

type DomainRow = { id: string; hostname: string; verified: boolean; vercelStatus: string | null };

function toView(row: DomainRow): DomainView {
  return {
    id: row.id,
    hostname: row.hostname,
    verified: row.verified,
    vercelStatus: row.vercelStatus,
    dns: dnsInstructionsFor(row.hostname),
  };
}

export async function listDomains(landingId: string): Promise<DomainView[]> {
  const rows = await prisma.domain.findMany({
    where: { landingId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toView);
}

export async function addDomain(
  landingId: string,
  rawHostname: string,
  config: VercelConfig,
): Promise<DomainView> {
  const hostname = normalizeHostname(rawHostname);
  if (!isValidHostname(hostname)) throw new InvalidHostnameError(hostname);

  const result = await attachDomain(config, hostname);
  const row = await prisma.domain.create({
    data: {
      landingId,
      hostname,
      verified: result.verified,
      vercelStatus: result.verified ? "verified" : "pending",
    },
  });
  return toView(row);
}

export async function refreshDomain(domainId: string, config: VercelConfig): Promise<DomainView> {
  const existing = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!existing) throw new Error(`Domain not found: ${domainId}`);

  const result = await verifyDomain(config, existing.hostname);
  const row = await prisma.domain.update({
    where: { id: domainId },
    data: { verified: result.verified, vercelStatus: result.verified ? "verified" : "pending" },
  });
  return toView(row);
}

export async function removeDomain(domainId: string, config: VercelConfig): Promise<void> {
  const existing = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!existing) return;

  try {
    await vercelRemoveDomain(config, existing.hostname);
  } catch (err) {
    // A domain already gone from Vercel should not block local cleanup.
    if (!(err instanceof VercelApiError) || err.status !== 404) throw err;
  }
  await prisma.domain.delete({ where: { id: domainId } });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- lib/domains.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/domains.ts lib/domains.test.ts
git commit -m "feat: domain service orchestrating Prisma and the Vercel API"
```

---

## Task 4: Domains API route — list + add (with error mapping)

**Files:**
- Create: `app/api/admin/domains/route.ts`, `app/api/admin/domains/errors.ts`
- Test: `app/api/admin/domains/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/auth` (Plan 2); `addDomain`, `listDomains`, `InvalidHostnameError` from `@/lib/domains`; `vercelConfigFromEnv`, `VercelApiError` from `@/lib/vercel`.
- Produces:
  - `domainErrorResponse(err: unknown): NextResponse` — maps `InvalidHostnameError`→400, Prisma `P2002`→409, `VercelApiError`→502, else→500.
  - `GET(req)` — requires admin; `?landingId=` required; returns `{ domains: DomainView[] }`.
  - `POST(req)` — requires admin; body `{ landingId, hostname }`; returns `{ domain: DomainView }` (201) or a mapped error.

- [ ] **Step 1: Write the failing test** — `app/api/admin/domains/route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdmin }));

const addDomain = vi.fn();
const listDomains = vi.fn();
vi.mock("@/lib/domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domains")>();
  return { ...actual, addDomain, listDomains };
});

vi.mock("@/lib/vercel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vercel")>();
  return { ...actual, vercelConfigFromEnv: () => ({ token: "t", projectId: "p" }) };
});

import { GET, POST } from "@/app/api/admin/domains/route";
import { InvalidHostnameError } from "@/lib/domains";
import { VercelApiError } from "@/lib/vercel";

function postReq(body: unknown) {
  return new Request("http://admin.local/api/admin/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ email: "admin@x.com" });
  addDomain.mockReset();
  listDomains.mockReset();
});

describe("GET /api/admin/domains", () => {
  it("401s when not authenticated", async () => {
    requireAdmin.mockResolvedValue(null);
    const res = await GET(new Request("http://admin.local/api/admin/domains?landingId=L1"));
    expect(res.status).toBe(401);
  });

  it("400s without a landingId", async () => {
    const res = await GET(new Request("http://admin.local/api/admin/domains"));
    expect(res.status).toBe(400);
  });

  it("returns the landing's domains", async () => {
    listDomains.mockResolvedValue([{ id: "d1", hostname: "promo.com" }]);
    const res = await GET(new Request("http://admin.local/api/admin/domains?landingId=L1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ domains: [{ id: "d1", hostname: "promo.com" }] });
    expect(listDomains).toHaveBeenCalledWith("L1");
  });
});

describe("POST /api/admin/domains", () => {
  it("401s when not authenticated", async () => {
    requireAdmin.mockResolvedValue(null);
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(401);
  });

  it("400s when fields are missing", async () => {
    const res = await POST(postReq({ landingId: "L1" }));
    expect(res.status).toBe(400);
  });

  it("creates a domain and returns 201", async () => {
    addDomain.mockResolvedValue({ id: "d1", hostname: "promo.com", verified: false });
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ domain: { id: "d1", hostname: "promo.com", verified: false } });
    expect(addDomain).toHaveBeenCalledWith("L1", "promo.com", { token: "t", projectId: "p" });
  });

  it("maps an invalid hostname to 400", async () => {
    addDomain.mockRejectedValue(new InvalidHostnameError("bad"));
    const res = await POST(postReq({ landingId: "L1", hostname: "bad" }));
    expect(res.status).toBe(400);
  });

  it("maps a duplicate (Prisma P2002) to 409", async () => {
    addDomain.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(409);
  });

  it("maps a Vercel API error to 502", async () => {
    addDomain.mockRejectedValue(new VercelApiError(403, "forbidden", "no access"));
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/no access/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- app/api/admin/domains/route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement the error helper** — `app/api/admin/domains/errors.ts`

```ts
import { NextResponse } from "next/server";
import { InvalidHostnameError } from "@/lib/domains";
import { VercelApiError } from "@/lib/vercel";

export function domainErrorResponse(err: unknown): NextResponse {
  if (err instanceof InvalidHostnameError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof VercelApiError) {
    return NextResponse.json({ error: `Vercel: ${err.message}`, code: err.code }, { status: 502 });
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  ) {
    return NextResponse.json({ error: "That domain is already added." }, { status: 409 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
```

- [ ] **Step 4: Implement the route** — `app/api/admin/domains/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addDomain, listDomains } from "@/lib/domains";
import { vercelConfigFromEnv } from "@/lib/vercel";
import { domainErrorResponse } from "./errors";

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const landingId = new URL(req.url).searchParams.get("landingId");
  if (!landingId) {
    return NextResponse.json({ error: "landingId is required" }, { status: 400 });
  }
  return NextResponse.json({ domains: await listDomains(landingId) });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { landingId, hostname } = (await req.json().catch(() => ({}))) as {
    landingId?: string;
    hostname?: string;
  };
  if (!landingId || !hostname) {
    return NextResponse.json({ error: "landingId and hostname are required" }, { status: 400 });
  }
  try {
    const domain = await addDomain(landingId, hostname, vercelConfigFromEnv());
    return NextResponse.json({ domain }, { status: 201 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- app/api/admin/domains/route.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/domains/route.ts app/api/admin/domains/errors.ts app/api/admin/domains/route.test.ts
git commit -m "feat: admin API to list and attach landing domains"
```

---

## Task 5: Domains API routes — remove + verify

**Files:**
- Create: `app/api/admin/domains/[id]/route.ts`, `app/api/admin/domains/[id]/verify/route.ts`
- Test: `app/api/admin/domains/[id]/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin` from `@/lib/auth`; `removeDomain`, `refreshDomain` from `@/lib/domains`; `vercelConfigFromEnv` from `@/lib/vercel`; `domainErrorResponse` from `../errors` / `../../errors`.
- Produces:
  - `DELETE(_req, { params })` — requires admin; removes the domain; `204` on success.
  - `POST(_req, { params })` (verify) — requires admin; re-checks verification; returns `{ domain: DomainView }`.

- [ ] **Step 1: Write the failing test** — `app/api/admin/domains/[id]/route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdmin }));

const removeDomain = vi.fn();
const refreshDomain = vi.fn();
vi.mock("@/lib/domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domains")>();
  return { ...actual, removeDomain, refreshDomain };
});

vi.mock("@/lib/vercel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vercel")>();
  return { ...actual, vercelConfigFromEnv: () => ({ token: "t", projectId: "p" }) };
});

import { DELETE } from "@/app/api/admin/domains/[id]/route";
import { POST } from "@/app/api/admin/domains/[id]/verify/route";

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({ email: "admin@x.com" });
  removeDomain.mockReset().mockResolvedValue(undefined);
  refreshDomain.mockReset();
});

describe("DELETE /api/admin/domains/[id]", () => {
  it("401s when not authenticated", async () => {
    requireAdmin.mockResolvedValue(null);
    const res = await DELETE(new Request("http://admin.local/x", { method: "DELETE" }), params("d1"));
    expect(res.status).toBe(401);
  });

  it("removes the domain and returns 204", async () => {
    const res = await DELETE(new Request("http://admin.local/x", { method: "DELETE" }), params("d1"));
    expect(res.status).toBe(204);
    expect(removeDomain).toHaveBeenCalledWith("d1", { token: "t", projectId: "p" });
  });
});

describe("POST /api/admin/domains/[id]/verify", () => {
  it("401s when not authenticated", async () => {
    requireAdmin.mockResolvedValue(null);
    const res = await POST(new Request("http://admin.local/x", { method: "POST" }), params("d1"));
    expect(res.status).toBe(401);
  });

  it("re-checks verification and returns the updated domain", async () => {
    refreshDomain.mockResolvedValue({ id: "d1", hostname: "promo.com", verified: true });
    const res = await POST(new Request("http://admin.local/x", { method: "POST" }), params("d1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ domain: { id: "d1", hostname: "promo.com", verified: true } });
    expect(refreshDomain).toHaveBeenCalledWith("d1", { token: "t", projectId: "p" });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- "app/api/admin/domains/[id]/route.test.ts"`
Expected: FAIL — route modules not found.

- [ ] **Step 3: Implement the remove route** — `app/api/admin/domains/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { removeDomain } from "@/lib/domains";
import { vercelConfigFromEnv } from "@/lib/vercel";
import { domainErrorResponse } from "../errors";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    await removeDomain(id, vercelConfigFromEnv());
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

- [ ] **Step 4: Implement the verify route** — `app/api/admin/domains/[id]/verify/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { refreshDomain } from "@/lib/domains";
import { vercelConfigFromEnv } from "@/lib/vercel";
import { domainErrorResponse } from "../../errors";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const domain = await refreshDomain(id, vercelConfigFromEnv());
    return NextResponse.json({ domain });
  } catch (err) {
    return domainErrorResponse(err);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- "app/api/admin/domains/[id]/route.test.ts"`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add "app/api/admin/domains/[id]/route.ts" "app/api/admin/domains/[id]/verify/route.ts" "app/api/admin/domains/[id]/route.test.ts"
git commit -m "feat: admin API to remove and re-verify landing domains"
```

---

## Task 6: Domains editor panel (client) + styles + editor wiring

**Files:**
- Create: `app/admin/landings/[id]/DomainsPanel.tsx`
- Test: `app/admin/landings/[id]/DomainsPanel.test.tsx`
- Modify: `app/globals.css` (append domains styles)
- Modify (wiring, Plan 2): `app/admin/landings/[id]/page.tsx` — mount `<DomainsPanel>` in the Domains tab.

**Interfaces:**
- Consumes: the API routes from Tasks 4–5 (via `fetch`); `DomainView` type from `@/lib/domains`.
- Produces: `<DomainsPanel landingId={string} pollMs={number=8000} />` — lists domains, adds a domain, shows DNS instructions for unverified domains, re-checks status (button + optional polling), and removes a domain. Each row carries `data-testid="domain-row"`.

- [ ] **Step 1: Write the failing test** — `app/admin/landings/[id]/DomainsPanel.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DomainsPanel } from "@/app/admin/landings/[id]/DomainsPanel";

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const cname = { type: "CNAME", name: "promo", value: "cname.vercel-dns.com" };

function installFetch() {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET" && input.startsWith("/api/admin/domains?")) {
      return jsonRes({
        domains: [
          { id: "d1", hostname: "promo.boomzino.com", verified: false, vercelStatus: "pending", dns: cname },
        ],
      });
    }
    if (method === "POST" && input === "/api/admin/domains") {
      return jsonRes(
        {
          domain: {
            id: "d2",
            hostname: "win.boomzino.com",
            verified: false,
            vercelStatus: "pending",
            dns: { type: "CNAME", name: "win", value: "cname.vercel-dns.com" },
          },
        },
        201,
      );
    }
    if (method === "POST" && input === "/api/admin/domains/d1/verify") {
      return jsonRes({
        domain: { id: "d1", hostname: "promo.boomzino.com", verified: true, vercelStatus: "verified", dns: cname },
      });
    }
    if (method === "DELETE" && input === "/api/admin/domains/d1") {
      return jsonRes(null, 204);
    }
    return jsonRes({ error: "unexpected" }, 500);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => vi.unstubAllGlobals());

describe("DomainsPanel", () => {
  it("lists existing domains with DNS instructions for unverified ones", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    expect(await screen.findByText("promo.boomzino.com")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText(/cname\.vercel-dns\.com/)).toBeInTheDocument();
  });

  it("adds a new domain", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    await screen.findByText("promo.boomzino.com");

    await userEvent.type(screen.getByLabelText("Domain to add"), "win.boomzino.com");
    await userEvent.click(screen.getByRole("button", { name: "Add domain" }));

    expect(await screen.findByText("win.boomzino.com")).toBeInTheDocument();
  });

  it("re-checks status and shows Verified, hiding the DNS hint", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    await screen.findByText("promo.boomzino.com");

    await userEvent.click(screen.getByRole("button", { name: "Check status" }));

    expect(await screen.findByText("Verified")).toBeInTheDocument();
    expect(screen.queryByText(/cname\.vercel-dns\.com/)).not.toBeInTheDocument();
  });

  it("removes a domain", async () => {
    installFetch();
    render(<DomainsPanel landingId="L1" pollMs={0} />);
    await screen.findByText("promo.boomzino.com");

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(screen.queryByText("promo.boomzino.com")).not.toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- "app/admin/landings/[id]/DomainsPanel.test.tsx"`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `app/admin/landings/[id]/DomainsPanel.tsx`

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { DomainView } from "@/lib/domains";

export function DomainsPanel({ landingId, pollMs = 8000 }: { landingId: string; pollMs?: number }) {
  const [domains, setDomains] = useState<DomainView[]>([]);
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/domains?landingId=${encodeURIComponent(landingId)}`);
    if (res.ok) setDomains((await res.json()).domains);
  }, [landingId]);

  useEffect(() => {
    load();
  }, [load]);

  const check = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/domains/${id}/verify`, { method: "POST" });
    if (res.ok) {
      const { domain } = await res.json();
      setDomains((list) => list.map((d) => (d.id === id ? domain : d)));
    }
  }, []);

  // Poll verification for still-pending domains (spec: CMS polls status).
  useEffect(() => {
    if (!pollMs) return;
    const pending = domains.filter((d) => !d.verified).map((d) => d.id);
    if (pending.length === 0) return;
    const timer = setInterval(() => pending.forEach((id) => check(id)), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, domains, check]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/admin/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landingId, hostname }),
    });
    setBusy(false);
    if (res.ok) {
      setHostname("");
      setDomains((list) => [...list, (await res.json()).domain]);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add domain");
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/domains/${id}`, { method: "DELETE" });
    if (res.ok) setDomains((list) => list.filter((d) => d.id !== id));
  }

  return (
    <div className="domains-panel">
      <form className="domains-add" onSubmit={add}>
        <input
          className="domains-input"
          placeholder="promo.yourcasino.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          aria-label="Domain to add"
        />
        <button className="btn" type="submit" disabled={busy || !hostname}>
          Add domain
        </button>
      </form>
      {error && (
        <p className="domains-error" role="alert">
          {error}
        </p>
      )}

      <ul className="domains-list">
        {domains.map((d) => (
          <li key={d.id} className="domains-item" data-testid="domain-row">
            <div className="domains-head">
              <span className="domains-host">{d.hostname}</span>
              <span className={d.verified ? "badge badge-ok" : "badge badge-pending"}>
                {d.verified ? "Verified" : "Pending"}
              </span>
            </div>
            {!d.verified && (
              <p className="domains-dns">
                Add a <strong>{d.dns.type}</strong> record — name <code>{d.dns.name}</code> → value{" "}
                <code>{d.dns.value}</code>
              </p>
            )}
            <div className="domains-actions">
              <button className="btn-sm" type="button" onClick={() => check(d.id)}>
                Check status
              </button>
              <button className="btn-sm btn-danger" type="button" onClick={() => remove(d.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- "app/admin/landings/[id]/DomainsPanel.test.tsx"`
Expected: PASS (all cases).

- [ ] **Step 5: Append the panel styles** — add to the end of `app/globals.css`

```css
/* --- Admin: domains panel --- */
.domains-panel { display: flex; flex-direction: column; gap: 16px; }
.domains-add { display: flex; gap: 8px; }
.domains-input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: var(--surface, #13251a);
  color: var(--text, #eaf6ee);
}
.btn, .btn-sm {
  border: none;
  border-radius: 8px;
  background: var(--accent, #27c24c);
  color: #04140a;
  font-weight: 700;
  cursor: pointer;
}
.btn { padding: 10px 16px; }
.btn-sm { padding: 6px 12px; font-size: 13px; }
.btn:disabled { opacity: 0.6; cursor: default; }
.btn-danger { background: #c2412b; color: #fff; }
.domains-error { color: #ff8a7a; margin: 0; }
.domains-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.domains-item {
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: var(--surface, #13251a);
}
.domains-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.domains-host { font-weight: 700; }
.badge { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.badge-ok { background: rgba(39, 194, 76, 0.18); color: #27c24c; }
.badge-pending { background: rgba(245, 194, 75, 0.18); color: #f5c24b; }
.domains-dns { margin: 10px 0; font-size: 13px; color: var(--muted, #7fa88e); }
.domains-dns code { color: var(--text, #eaf6ee); }
.domains-actions { display: flex; gap: 8px; margin-top: 8px; }
```

- [ ] **Step 6: Wire the panel into the editor (Plan 2)** — in `app/admin/landings/[id]/page.tsx`, render the panel inside the Domains tab/section:

```tsx
import { DomainsPanel } from "./DomainsPanel";

// …inside the editor's "Domains" tab content:
<DomainsPanel landingId={landing.id} />
```

> If executing this plan before Plan 2's editor exists, skip Step 6 and rely on the component test as the gate; add this one line when the editor lands. The panel needs no other Plan-2 wiring.

- [ ] **Step 7: Run the full unit/component suite**

Run: `npm test`
Expected: all suites PASS (Tasks 1–6, plus everything from Plan 1).

- [ ] **Step 8: Commit**

```bash
git add "app/admin/landings/[id]/DomainsPanel.tsx" "app/admin/landings/[id]/DomainsPanel.test.tsx" app/globals.css
git commit -m "feat: domains editor panel with DNS hints and status polling"
```

---

## Done criteria for Plan 3

- `npm test` — all unit/component/route suites green (Vercel client, DNS helper, domain service, both API routes, and the editor panel).
- With Plan 2 present and `VERCEL_TOKEN` / `VERCEL_PROJECT_ID` set, `npm run build` succeeds (the routes resolve `@/lib/auth`).
- **Manual end-to-end** (requires real Vercel credentials + Plan 2 admin):
  1. Open a landing in the CMS → **Domains** tab → add `promo.<yourdomain>.com`.
  2. The panel shows status **Pending** and the exact DNS record to set (CNAME → `cname.vercel-dns.com`, or A → `76.76.21.21` for an apex).
  3. Create that DNS record, click **Check status** (or wait for the poll) → status flips to **Verified**.
  4. Visit the domain → Plan 1's middleware + `getLandingByHost` serve that landing over Vercel-provisioned TLS, with **no rebuild**.
  5. **Remove** the domain → it disappears from the list and is detached from the Vercel project.
- All work committed in small, per-task commits.

**This completes the three-plan series:** Plan 1 (foundation + public landing) → Plan 2 (CMS/admin) → Plan 3 (custom domains).
