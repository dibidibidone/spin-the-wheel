# Admin Statistics — funnel tracking + Statistics tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture an in-house visit→install→open funnel (unique per device) for every landing, and surface it in a new admin **Statistics** tab (per-landing dashboard + conversion table, filterable by landing and date range).

**Architecture:** A new `Event` table records three funnel events. A public `POST /api/track` beacon (host-derives the landing, mints a first-party `vid` cookie) writes rows; three client beacons fire it (page mount = visit, `appinstalled` = install, standalone `/launch` = open). A guarded `GET /api/admin/stats` aggregates with `COUNT(DISTINCT visitorId)`. The admin panel gains top-level Landings|Statistics tabs; the Statistics view reads the aggregation API.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma/Postgres (`prisma db push`, no migrations dir), Vitest + Testing Library.

## Global Constraints

- TypeScript strict; match existing patterns. `npx tsc --noEmit` must stay clean. Commit after every task.
- Tests: single file `npx vitest run <path>`; full suite `npm test`. Dev Postgres is on `:5433` and `.env` has `DATABASE_URL`, so `npx prisma db push` / `npx prisma generate` work. The schema change is additive.
- Prisma client is imported as `import { prisma } from "@/lib/db"`. Service tests mock `@/lib/db`; route tests mock the service + guard layer (no live DB).
- Funnel stages are **visit → install → open**, counted **unique per device**: `COUNT(DISTINCT "visitorId")`. The device id is a first-party `vid` cookie (`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=63072000`), minted server-side by `/api/track` on first event.
- `POST /api/track` is **public** (anonymous landing visitors hit it) — no auth guard. It derives the landing from **`x-forwarded-host` (falling back to `host`)** via `getLandingIdByHost` (the middleware matcher excludes `api/`, so this route is NOT host-rewritten). `x-forwarded-host` is what proxies/Vercel set and is settable in tests (`host` is a forbidden header name that test `Request`/proxies may strip). `GET /api/admin/stats` is **session-guarded** via `requireApiSession()` (returns `{ ok: true, session } | { ok: false, response }`).
- Our funnel beacons fire **independently of Facebook-pixel config**: the VISIT component is always mounted (not part of `MetaPixel`), and the OPEN beacon fires on **every** standalone open — NOT gated behind the `pixelKey` check that guards the `Lead` pixel.
- Wire event names are lowercase (`"visit" | "install" | "open"`); the Prisma `EventType` enum is uppercase (`VISIT | INSTALL | OPEN`).
- Out of scope: rollup tables, real-time streaming, bot filtering beyond the cookie, geo/device/UTM breakdowns, CSV export, the Facebook Graph API source.

## File Structure

**New:**
- `lib/eventTypes.ts` — `export type TrackType = "visit" | "install" | "open"` (zero-dep; shared by client + server).
- `lib/events.ts` (+ `lib/events.test.ts`) — server: `recordEvent(...)`, `isTrackType(...)`.
- `lib/track.ts` (+ `lib/track.test.ts`) — browser: `beaconEvent(type)`.
- `app/api/track/route.ts` (+ `app/api/track/route.test.ts`) — public beacon endpoint.
- `components/analytics/VisitBeacon.tsx` (+ `.test.tsx`) — fires `visit` on mount.
- `lib/admin/statsService.ts` (+ `.test.ts`) — `computeFunnel(...)`, `getFunnelStats(...)`.
- `app/api/admin/stats/route.ts` (+ `route.test.ts`) — guarded aggregation endpoint.
- `lib/admin/statsRange.ts` (+ `.test.ts`) — `presetToRange(preset, now)`.
- `components/admin/StatisticsView.tsx` (+ `.test.tsx`) — filters + dashboard + table.
- `components/admin/StatsTabNav.tsx` (+ `.test.tsx`) — top-level Landings|Statistics nav.
- `app/admin/(panel)/stats/page.tsx` — Statistics route shell.

**Modified:**
- `prisma/schema.prisma` — `EventType` enum, `Event` model, `Landing.events`.
- `lib/tenant.ts` (+ `lib/tenant.test.ts`) — `getLandingIdByHost(host)`.
- `components/r3f/kit/usePwaInstall.ts` (+ `usePwaInstall.test.ts`) — beacon `install` on `appinstalled`.
- `app/[domain]/launch/LaunchRedirect.client.tsx` (+ `LaunchRedirect.test.tsx`) — beacon `open` for all standalone opens.
- `app/[domain]/page.tsx` — render `<VisitBeacon />`.
- `app/admin/(panel)/layout.tsx` — render `<StatsTabNav />`.
- `app/admin/admin.css` — minimal styles for stat cards + table.

---

### Task 1: `Event` model + `recordEvent` service

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/eventTypes.ts`, `lib/events.ts`, `lib/events.test.ts`

**Interfaces:**
- Produces: `TrackType = "visit"|"install"|"open"` (`lib/eventTypes.ts`); `recordEvent(input: { landingId: string; visitorId: string; type: TrackType }): Promise<void>` and `isTrackType(v: unknown): v is TrackType` (`lib/events.ts`). Consumed by Tasks 2–5.

- [ ] **Step 1: Add the schema model + enum**

In `prisma/schema.prisma`, add after the `Landing` model's last field (inside `model Landing { ... }`) a relation:

```prisma
  events             Event[]
```

Then add at the end of the file:

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

- [ ] **Step 2: Push + regenerate**

Run: `npx prisma db push && npx prisma generate`
Expected: additive `Event` table + `EventType` enum created, exit 0.

- [ ] **Step 3: The shared wire type**

Create `lib/eventTypes.ts`:

```ts
// Wire-level funnel event names (lowercase). The Prisma EventType enum is uppercase;
// lib/events.ts maps between them. Kept dependency-free so both client (lib/track.ts)
// and server (lib/events.ts) can import the type without crossing the runtime boundary.
export type TrackType = "visit" | "install" | "open";
```

- [ ] **Step 4: Failing test**

Create `lib/events.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { event } = vi.hoisted(() => ({ event: { create: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: { event } }));

import { recordEvent, isTrackType } from "./events";

beforeEach(() => event.create.mockReset());

describe("recordEvent", () => {
  it("maps the wire type to the EventType enum and inserts a row", async () => {
    await recordEvent({ landingId: "l1", visitorId: "v1", type: "visit" });
    expect(event.create).toHaveBeenCalledWith({ data: { landingId: "l1", visitorId: "v1", type: "VISIT" } });
    await recordEvent({ landingId: "l1", visitorId: "v1", type: "install" });
    await recordEvent({ landingId: "l1", visitorId: "v1", type: "open" });
    expect(event.create.mock.calls[1][0].data.type).toBe("INSTALL");
    expect(event.create.mock.calls[2][0].data.type).toBe("OPEN");
  });
});

describe("isTrackType", () => {
  it("accepts the three wire names and rejects anything else", () => {
    expect(isTrackType("visit")).toBe(true);
    expect(isTrackType("install")).toBe(true);
    expect(isTrackType("open")).toBe(true);
    expect(isTrackType("lead")).toBe(false);
    expect(isTrackType(undefined)).toBe(false);
  });
});
```

Run: `npx vitest run lib/events.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 5: Implement**

Create `lib/events.ts`:

```ts
import { prisma } from "@/lib/db";
import type { TrackType } from "@/lib/eventTypes";

const TYPE_MAP = { visit: "VISIT", install: "INSTALL", open: "OPEN" } as const;

export function isTrackType(v: unknown): v is TrackType {
  return v === "visit" || v === "install" || v === "open";
}

export async function recordEvent(input: { landingId: string; visitorId: string; type: TrackType }): Promise<void> {
  await prisma.event.create({
    data: { landingId: input.landingId, visitorId: input.visitorId, type: TYPE_MAP[input.type] },
  });
}
```

- [ ] **Step 6: Run + commit**

Run: `npx vitest run lib/events.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add prisma/schema.prisma lib/eventTypes.ts lib/events.ts lib/events.test.ts
git commit -m "feat(stats): Event model + recordEvent service"
```

---

### Task 2: `getLandingIdByHost` + public `POST /api/track`

**Files:**
- Modify: `lib/tenant.ts`, `lib/tenant.test.ts`
- Create: `app/api/track/route.ts`, `app/api/track/route.test.ts`

**Interfaces:**
- Consumes: `recordEvent`, `isTrackType` (Task 1).
- Produces: `getLandingIdByHost(host: string): Promise<string | null>` (`lib/tenant.ts`); `POST` handler at `app/api/track/route.ts`.

- [ ] **Step 1: Failing test for `getLandingIdByHost`**

In `lib/tenant.test.ts`, add (the file already mocks `@/lib/db`; if its mock object lacks `domain.findUnique`, add `domain: { findUnique: vi.fn() }` to the mock and reset it in `beforeEach`):

```ts
import { getLandingIdByHost } from "./tenant";

it("getLandingIdByHost returns the landingId for a known host, null otherwise", async () => {
  // `prisma` here is the test's mocked @/lib/db client
  const { prisma } = await import("@/lib/db");
  (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ landingId: "l9" });
  expect(await getLandingIdByHost("Foo.com")).toBe("l9");
  (prisma.domain.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
  expect(await getLandingIdByHost("nope.com")).toBeNull();
});
```

(If `lib/tenant.test.ts` mocks `@/lib/db` differently, mirror its existing style — the assertion is: known host → `"l9"`, unknown → `null`, and the lookup lowercases the host.)

Run: `npx vitest run lib/tenant.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement `getLandingIdByHost`**

In `lib/tenant.ts`, after `getLandingByHost`, add:

```ts
export async function getLandingIdByHost(host: string): Promise<string | null> {
  const domain = await prisma.domain.findUnique({
    where: { hostname: host.toLowerCase() },
    select: { landingId: true },
  });
  return domain?.landingId ?? null;
}
```

- [ ] **Step 3: Failing test for the route**

Create `app/api/track/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const recordEvent = vi.fn();
vi.mock("@/lib/events", () => ({
  recordEvent: (i: unknown) => recordEvent(i),
  isTrackType: (v: unknown) => v === "visit" || v === "install" || v === "open",
}));
const getLandingIdByHost = vi.fn();
vi.mock("@/lib/tenant", () => ({ getLandingIdByHost: (h: string) => getLandingIdByHost(h) }));

import { POST } from "./route";

function req(body: unknown, { host = "promo.com", cookie }: { host?: string; cookie?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (host) headers["x-forwarded-host"] = host;
  if (cookie) headers["cookie"] = cookie;
  return new Request("http://promo.com/api/track", { method: "POST", headers, body: JSON.stringify(body) });
}

beforeEach(() => { recordEvent.mockReset(); getLandingIdByHost.mockReset(); getLandingIdByHost.mockResolvedValue("l1"); });

describe("POST /api/track", () => {
  it("mints a vid cookie and records the event when none is present", async () => {
    const res = await POST(req({ type: "visit" }));
    expect(res.status).toBe(204);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^vid=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(recordEvent).toHaveBeenCalledTimes(1);
    const arg = recordEvent.mock.calls[0][0];
    expect(arg).toMatchObject({ landingId: "l1", type: "visit" });
    expect(typeof arg.visitorId).toBe("string");
    expect(arg.visitorId.length).toBeGreaterThan(0);
  });

  it("reuses an existing vid cookie and sets no cookie", async () => {
    const res = await POST(req({ type: "open" }, { cookie: "vid=abc-123" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(recordEvent).toHaveBeenCalledWith({ landingId: "l1", visitorId: "abc-123", type: "open" });
  });

  it("404 for an unknown host", async () => {
    getLandingIdByHost.mockResolvedValue(null);
    expect((await POST(req({ type: "visit" }))).status).toBe(404);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("400 for a bad event type", async () => {
    expect((await POST(req({ type: "lead" }))).status).toBe(400);
    expect(recordEvent).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run "app/api/track/route.test.ts"` — Expected: FAIL (module missing).

- [ ] **Step 4: Implement the route**

Create `app/api/track/route.ts`:

```ts
import { getLandingIdByHost } from "@/lib/tenant";
import { recordEvent, isTrackType } from "@/lib/events";

function readVid(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|;\s*)vid=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function POST(req: Request): Promise<Response> {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return new Response(null, { status: 400 });

  const body = await req.json().catch(() => null);
  const type = (body as { type?: unknown } | null)?.type;
  if (!isTrackType(type)) return new Response(null, { status: 400 });

  const landingId = await getLandingIdByHost(host);
  if (!landingId) return new Response(null, { status: 404 });

  let visitorId = readVid(req);
  const minted = !visitorId;
  if (!visitorId) visitorId = crypto.randomUUID();

  await recordEvent({ landingId, visitorId, type });

  const headers = new Headers();
  if (minted) {
    headers.append(
      "Set-Cookie",
      `vid=${visitorId}; Path=/; Max-Age=63072000; HttpOnly; Secure; SameSite=Lax`,
    );
  }
  return new Response(null, { status: 204, headers });
}
```

- [ ] **Step 5: Run + commit**

Run: `npx vitest run lib/tenant.test.ts "app/api/track/route.test.ts" && npx tsc --noEmit` — Expected: PASS.

```bash
git add lib/tenant.ts lib/tenant.test.ts "app/api/track"
git commit -m "feat(stats): getLandingIdByHost + public /api/track beacon endpoint"
```

---

### Task 3: `beaconEvent` browser helper

**Files:**
- Create: `lib/track.ts`, `lib/track.test.ts`

**Interfaces:**
- Consumes: `TrackType` (Task 1).
- Produces: `beaconEvent(type: TrackType): void` (`lib/track.ts`). Consumed by Tasks 4–5.

- [ ] **Step 1: Failing test**

Create `lib/track.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { beaconEvent } from "./track";

beforeEach(() => { vi.restoreAllMocks(); });

describe("beaconEvent", () => {
  it("POSTs the event to /api/track with keepalive + same-origin credentials", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    beaconEvent("open");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/track");
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "same-origin" });
    expect(JSON.parse(init.body)).toEqual({ type: "open" });
    expect(init.headers).toMatchObject({ "content-type": "application/json" });
  });

  it("never throws if fetch rejects (fire-and-forget)", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => beaconEvent("visit")).not.toThrow();
  });
});
```

Run: `npx vitest run lib/track.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

Create `lib/track.ts`:

```ts
import type { TrackType } from "@/lib/eventTypes";

// Fire-and-forget funnel beacon to our own /api/track endpoint. keepalive lets it survive
// a navigation/unload (the /launch redirect); same-origin sends the vid cookie and honors
// the Set-Cookie response. No-op on the server. Never throws.
export function beaconEvent(type: TrackType): void {
  if (typeof fetch === "undefined") return;
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    /* fire-and-forget */
  }
}
```

- [ ] **Step 3: Run + commit**

Run: `npx vitest run lib/track.test.ts && npx tsc --noEmit` — Expected: PASS.

```bash
git add lib/track.ts lib/track.test.ts
git commit -m "feat(stats): beaconEvent browser helper"
```

---

### Task 4: VISIT beacon component + wire into the landing page

**Files:**
- Create: `components/analytics/VisitBeacon.tsx`, `components/analytics/VisitBeacon.test.tsx`
- Modify: `app/[domain]/page.tsx`

**Interfaces:**
- Consumes: `beaconEvent` (Task 3).
- Produces: `VisitBeacon()` component (renders null).

- [ ] **Step 1: Failing test**

Create `components/analytics/VisitBeacon.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const beaconEvent = vi.fn();
vi.mock("@/lib/track", () => ({ beaconEvent: (t: string) => beaconEvent(t) }));

import { VisitBeacon } from "./VisitBeacon";

beforeEach(() => beaconEvent.mockReset());

describe("VisitBeacon", () => {
  it("fires a single visit beacon on mount and renders nothing", () => {
    const { container } = render(<VisitBeacon />);
    expect(beaconEvent).toHaveBeenCalledTimes(1);
    expect(beaconEvent).toHaveBeenCalledWith("visit");
    expect(container.firstChild).toBeNull();
  });
});
```

Run: `npx vitest run components/analytics/VisitBeacon.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

Create `components/analytics/VisitBeacon.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { beaconEvent } from "@/lib/track";

// Records one VISIT ("click") per page mount. Always mounted on every landing, independent
// of Facebook-pixel config. Renders nothing.
export function VisitBeacon() {
  useEffect(() => {
    beaconEvent("visit");
  }, []);
  return null;
}
```

- [ ] **Step 3: Wire it into the landing page**

In `app/[domain]/page.tsx`, add the import after the `MetaPixel` import:

```ts
import { VisitBeacon } from "@/components/analytics/VisitBeacon";
```

and add `<VisitBeacon />` to the returned fragment, just after `<MetaPixel ... />`:

```tsx
  return (
    <>
      <MetaPixel pixelIds={view.fbPixelIds} />
      <VisitBeacon />
      {scene}
    </>
  );
```

- [ ] **Step 4: Run + commit**

Run: `npx vitest run components/analytics/VisitBeacon.test.tsx && npx tsc --noEmit` — Expected: PASS.

```bash
git add components/analytics/VisitBeacon.tsx components/analytics/VisitBeacon.test.tsx "app/[domain]/page.tsx"
git commit -m "feat(stats): VisitBeacon fires visit on every landing"
```

---

### Task 5: INSTALL + OPEN beacons (usePwaInstall + LaunchRedirect)

**Files:**
- Modify: `components/r3f/kit/usePwaInstall.ts`, `components/r3f/kit/usePwaInstall.test.ts`
- Modify: `app/[domain]/launch/LaunchRedirect.client.tsx`, `app/[domain]/launch/LaunchRedirect.test.tsx`

**Interfaces:**
- Consumes: `beaconEvent` (Task 3).

- [ ] **Step 1: Failing test — INSTALL on `appinstalled`**

In `components/r3f/kit/usePwaInstall.test.ts`, add the mock near the top (after imports), and reset it in the existing `beforeEach`:

```ts
const beaconEvent = vi.fn();
vi.mock("@/lib/track", () => ({ beaconEvent: (t: string) => beaconEvent(t) }));
```

Then add a test (mirror the file's existing render-hook + `window.dispatchEvent(new Event("appinstalled"))` style — if the file uses `renderHook`, use it; otherwise render a tiny probe component that calls the hook):

```ts
it("beacons an install when the appinstalled event fires", () => {
  renderHook(() => usePwaInstall());
  beaconEvent.mockClear();
  act(() => { window.dispatchEvent(new Event("appinstalled")); });
  expect(beaconEvent).toHaveBeenCalledWith("install");
});
```

(Import `renderHook`/`act` from `@testing-library/react` if not already imported, matching the file's conventions.)

Run: `npx vitest run components/r3f/kit/usePwaInstall.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement — beacon in `onInstalled`**

In `components/r3f/kit/usePwaInstall.ts`, add the import at the top:

```ts
import { beaconEvent } from "@/lib/track";
```

and in the `onInstalled` handler inside the `useEffect`, add the beacon call:

```ts
    const onInstalled = () => { setInstalled(true); deferred.current = null; beaconEvent("install"); };
```

- [ ] **Step 3: Failing test — OPEN for all standalone opens**

Replace the body of `app/[domain]/launch/LaunchRedirect.test.tsx` with the version below. It mocks `@/lib/track` and asserts: OPEN fires for standalone (with AND without pixels), never for a non-standalone tab, and the iOS path still works. (`@/lib/fbq` is mocked so `Lead` assertions stay isolated from the network helper.)

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

const beaconEvent = vi.fn();
vi.mock("@/lib/track", () => ({ beaconEvent: (t: string) => beaconEvent(t) }));
const track = vi.fn();
vi.mock("@/lib/fbq", () => ({ ensureBaseSnippet: vi.fn(), initPixels: vi.fn(), track: (...a: unknown[]) => track(...a) }));

import { LaunchRedirect } from "./LaunchRedirect.client";

let replace: ReturnType<typeof vi.fn>;
function setStandalone(on: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: on && q.includes("standalone"), media: q,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return false; }, onchange: null,
  })) as unknown as typeof window.matchMedia;
}
beforeEach(() => {
  vi.useFakeTimers();
  beaconEvent.mockReset(); track.mockReset();
  replace = vi.fn();
  Object.defineProperty(window, "location", { value: { replace }, writable: true, configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  delete (window.navigator as unknown as { standalone?: boolean }).standalone;
});

describe("LaunchRedirect", () => {
  it("standalone with pixels: beacons open, fires Lead, redirects after the delay", () => {
    setStandalone(true);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(beaconEvent).toHaveBeenCalledWith("open");
    expect(track).toHaveBeenCalledWith("Lead");
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });

  it("standalone WITHOUT pixels: still beacons open, no Lead, redirects after the delay", () => {
    setStandalone(true);
    render(<LaunchRedirect pixelIds={[]} redirectUrl="https://offer.example/app" />);
    expect(beaconEvent).toHaveBeenCalledWith("open");
    expect(track).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });

  it("not standalone: redirects immediately, no open beacon, no Lead", () => {
    setStandalone(false);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
    expect(beaconEvent).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("iOS standalone (navigator.standalone): beacons open + Lead, redirects after the delay", () => {
    setStandalone(false);
    Object.defineProperty(window.navigator, "standalone", { value: true, configurable: true });
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(beaconEvent).toHaveBeenCalledWith("open");
    expect(track).toHaveBeenCalledWith("Lead");
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });
});
```

Run: `npx vitest run "app/[domain]/launch/LaunchRedirect.test.tsx"` — Expected: FAIL (open beacon not wired yet).

- [ ] **Step 4: Implement — OPEN beacon for every standalone open**

Replace the `useEffect` body in `app/[domain]/launch/LaunchRedirect.client.tsx` so the OPEN beacon fires for ALL standalone opens (not gated on pixels), and add the import. New file contents:

```tsx
"use client";
import { useEffect } from "react";
import { ensureBaseSnippet, initPixels, track } from "@/lib/fbq";
import { beaconEvent } from "@/lib/track";

// The PWA start_url lands here when the installed app is opened. Standalone == "downloaded +
// opened": we record an OPEN (always) and fire the Lead pixel (only if the landing has pixels),
// then forward to the admin link. A normal browser visit just forwards — no OPEN, no Lead.
export function LaunchRedirect({ pixelIds, redirectUrl }: { pixelIds: string[]; redirectUrl: string }) {
  const pixelKey = pixelIds.join(",");
  useEffect(() => {
    const standalone =
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      beaconEvent("open");
      if (pixelKey) {
        ensureBaseSnippet();
        initPixels(pixelKey.split(","));
        track("Lead");
      }
      const t = setTimeout(() => window.location.replace(redirectUrl), 500);
      return () => clearTimeout(t);
    }
    window.location.replace(redirectUrl);
  }, [pixelKey, redirectUrl]);

  return <p style={{ font: "16px system-ui", textAlign: "center", marginTop: "40vh" }}>Opening…</p>;
}
```

- [ ] **Step 5: Run + commit**

Run: `npx vitest run components/r3f/kit/usePwaInstall.test.ts "app/[domain]/launch/LaunchRedirect.test.tsx" && npx tsc --noEmit` — Expected: PASS.

```bash
git add components/r3f/kit/usePwaInstall.ts components/r3f/kit/usePwaInstall.test.ts "app/[domain]/launch/LaunchRedirect.client.tsx" "app/[domain]/launch/LaunchRedirect.test.tsx"
git commit -m "feat(stats): beacon install on appinstalled + open on standalone /launch"
```

---

### Task 6: `statsService` — `computeFunnel` + `getFunnelStats`

**Files:**
- Create: `lib/admin/statsService.ts`, `lib/admin/statsService.test.ts`

**Interfaces:**
- Produces: `FunnelRow` type; `computeFunnel(rows): FunnelRow[]`; `getFunnelStats(filters: { landingId?: string; from?: Date; to?: Date }): Promise<FunnelRow[]>`. Consumed by Task 7.

- [ ] **Step 1: Failing test (the pure conversion math)**

Create `lib/admin/statsService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { $queryRaw } = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw } }));

import { computeFunnel, getFunnelStats } from "./statsService";

beforeEach(() => $queryRaw.mockReset());

describe("computeFunnel", () => {
  it("computes the three conversion rates, rounded to one decimal", () => {
    const [r] = computeFunnel([{ landingId: "l1", name: "Promo", visits: 200, downloads: 50, opens: 10 }]);
    expect(r.visitToDownloadPct).toBe(25);     // 50/200
    expect(r.downloadToOpenPct).toBe(20);      // 10/50
    expect(r.visitToOpenPct).toBe(5);          // 10/200
  });

  it("returns 0 for every rate when there are zero visits/downloads (no divide-by-zero)", () => {
    const [r] = computeFunnel([{ landingId: "l2", name: "Empty", visits: 0, downloads: 0, opens: 0 }]);
    expect([r.visitToDownloadPct, r.downloadToOpenPct, r.visitToOpenPct]).toEqual([0, 0, 0]);
  });
});

describe("getFunnelStats", () => {
  it("maps bigint counts to numbers and applies computeFunnel", async () => {
    $queryRaw.mockResolvedValue([{ landingId: "l1", name: "Promo", visits: 200n, downloads: 50n, opens: 10n }]);
    const rows = await getFunnelStats({});
    expect(rows).toEqual([
      { landingId: "l1", name: "Promo", visits: 200, downloads: 50, opens: 10,
        visitToDownloadPct: 25, downloadToOpenPct: 20, visitToOpenPct: 5 },
    ]);
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });
});
```

Run: `npx vitest run lib/admin/statsService.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

Create `lib/admin/statsService.ts`:

```ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type FunnelRow = {
  landingId: string;
  name: string;
  visits: number;
  downloads: number;
  opens: number;
  visitToDownloadPct: number;
  downloadToOpenPct: number;
  visitToOpenPct: number;
};

type CountRow = { landingId: string; name: string; visits: number; downloads: number; opens: number };
type RawRow = { landingId: string; name: string; visits: bigint; downloads: bigint; opens: bigint };

const pct = (num: number, den: number): number => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);

export function computeFunnel(rows: CountRow[]): FunnelRow[] {
  return rows.map((r) => ({
    ...r,
    visitToDownloadPct: pct(r.downloads, r.visits),
    downloadToOpenPct: pct(r.opens, r.downloads),
    visitToOpenPct: pct(r.opens, r.visits),
  }));
}

export async function getFunnelStats(filters: { landingId?: string; from?: Date; to?: Date }): Promise<FunnelRow[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT l.id AS "landingId", l.name AS name,
      COUNT(DISTINCT e."visitorId") FILTER (WHERE e.type = 'VISIT')   AS visits,
      COUNT(DISTINCT e."visitorId") FILTER (WHERE e.type = 'INSTALL') AS downloads,
      COUNT(DISTINCT e."visitorId") FILTER (WHERE e.type = 'OPEN')    AS opens
    FROM "Landing" l
    LEFT JOIN "Event" e ON e."landingId" = l.id
      ${filters.from ? Prisma.sql`AND e."createdAt" >= ${filters.from}` : Prisma.empty}
      ${filters.to ? Prisma.sql`AND e."createdAt" < ${filters.to}` : Prisma.empty}
    ${filters.landingId ? Prisma.sql`WHERE l.id = ${filters.landingId}` : Prisma.empty}
    GROUP BY l.id, l.name
    ORDER BY l.name ASC
  `;
  return computeFunnel(
    rows.map((r) => ({
      landingId: r.landingId,
      name: r.name,
      visits: Number(r.visits),
      downloads: Number(r.downloads),
      opens: Number(r.opens),
    })),
  );
}
```

- [ ] **Step 3: Run + commit**

Run: `npx vitest run lib/admin/statsService.test.ts && npx tsc --noEmit` — Expected: PASS.

```bash
git add lib/admin/statsService.ts lib/admin/statsService.test.ts
git commit -m "feat(stats): funnel aggregation service (unique counts + conversion rates)"
```

---

### Task 7: Guarded `GET /api/admin/stats`

**Files:**
- Create: `app/api/admin/stats/route.ts`, `app/api/admin/stats/route.test.ts`

**Interfaces:**
- Consumes: `requireApiSession` (`@/lib/admin/guard`), `getFunnelStats` (Task 6).

- [ ] **Step 1: Failing test**

Create `app/api/admin/stats/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));
const getFunnelStats = vi.fn();
vi.mock("@/lib/admin/statsService", () => ({ getFunnelStats: (f: unknown) => getFunnelStats(f) }));

import { GET } from "./route";

const authed = { ok: true, session: { user: {} } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
const url = (qs: string) => new Request(`http://admin.local/api/admin/stats${qs}`);

beforeEach(() => { requireApiSession.mockReset(); getFunnelStats.mockReset(); getFunnelStats.mockResolvedValue([]); });

describe("GET /api/admin/stats", () => {
  it("401 without a session", async () => {
    requireApiSession.mockResolvedValue(denied);
    expect((await GET(url(""))).status).toBe(401);
    expect(getFunnelStats).not.toHaveBeenCalled();
  });

  it("passes parsed filters (landingId=all dropped; from/to parsed to Dates)", async () => {
    requireApiSession.mockResolvedValue(authed);
    await GET(url("?landingId=all&from=2026-06-01T00:00:00.000Z&to=2026-07-01T00:00:00.000Z"));
    const f = getFunnelStats.mock.calls[0][0];
    expect(f.landingId).toBeUndefined();
    expect(f.from).toBeInstanceOf(Date);
    expect(f.to.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("keeps a concrete landingId and returns the stats json", async () => {
    requireApiSession.mockResolvedValue(authed);
    getFunnelStats.mockResolvedValue([{ landingId: "l1", name: "Promo", visits: 1, downloads: 0, opens: 0, visitToDownloadPct: 0, downloadToOpenPct: 0, visitToOpenPct: 0 }]);
    const res = await GET(url("?landingId=l1"));
    expect(res.status).toBe(200);
    expect(getFunnelStats.mock.calls[0][0].landingId).toBe("l1");
    await expect(res.json()).resolves.toHaveLength(1);
  });

  it("400 on an invalid date", async () => {
    requireApiSession.mockResolvedValue(authed);
    expect((await GET(url("?from=not-a-date"))).status).toBe(400);
  });
});
```

Run: `npx vitest run "app/api/admin/stats/route.test.ts"` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

Create `app/api/admin/stats/route.ts`:

```ts
import { requireApiSession } from "@/lib/admin/guard";
import { getFunnelStats } from "@/lib/admin/statsService";

export async function GET(req: Request): Promise<Response> {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const params = new URL(req.url).searchParams;
  const landingIdParam = params.get("landingId");
  const fromStr = params.get("from");
  const toStr = params.get("to");

  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const stats = await getFunnelStats({
    landingId: landingIdParam && landingIdParam !== "all" ? landingIdParam : undefined,
    from,
    to,
  });
  return Response.json(stats);
}
```

- [ ] **Step 3: Run + commit**

Run: `npx vitest run "app/api/admin/stats/route.test.ts" && npx tsc --noEmit` — Expected: PASS.

```bash
git add "app/api/admin/stats"
git commit -m "feat(stats): guarded GET /api/admin/stats aggregation endpoint"
```

---

### Task 8: `presetToRange` + `StatisticsView` (filters + dashboard + table)

**Files:**
- Create: `lib/admin/statsRange.ts`, `lib/admin/statsRange.test.ts`
- Create: `components/admin/StatisticsView.tsx`, `components/admin/StatisticsView.test.tsx`
- Modify: `app/admin/admin.css`

**Interfaces:**
- Consumes: the `/api/admin/stats` response shape (`FunnelRow[]`, Task 6/7).
- Produces: `presetToRange(preset, now): { from?: Date; to?: Date }`; `StatisticsView({ landings }: { landings: { id: string; name: string }[] })`.

- [ ] **Step 1: Failing test — `presetToRange`**

Create `lib/admin/statsRange.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { presetToRange } from "./statsRange";

const now = new Date("2026-07-01T12:00:00.000Z");

describe("presetToRange", () => {
  it("all -> no bounds", () => {
    expect(presetToRange("all", now)).toEqual({});
  });
  it("7d -> from is 7 days before now, to is now", () => {
    const { from, to } = presetToRange("7d", now);
    expect(to).toEqual(now);
    expect(from?.toISOString()).toBe("2026-06-24T12:00:00.000Z");
  });
  it("30d -> from is 30 days before now", () => {
    expect(presetToRange("30d", now).from?.toISOString()).toBe("2026-06-01T12:00:00.000Z");
  });
  it("today -> from is local midnight, to is now", () => {
    const { from, to } = presetToRange("today", now);
    expect(to).toEqual(now);
    expect(from!.getHours()).toBe(0);
    expect(from!.getMinutes()).toBe(0);
    expect(from!.getTime()).toBeLessThanOrEqual(now.getTime());
  });
});
```

Run: `npx vitest run lib/admin/statsRange.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implement `presetToRange`**

Create `lib/admin/statsRange.ts`:

```ts
export type RangePreset = "today" | "7d" | "30d" | "all";

// Resolves a preset to absolute instants using the caller's local clock. "today" starts at
// local midnight; "7d"/"30d" look back N*24h from now; "all" has no bounds.
export function presetToRange(preset: RangePreset, now: Date = new Date()): { from?: Date; to?: Date } {
  if (preset === "all") return {};
  if (preset === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  const days = preset === "7d" ? 7 : 30;
  return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now };
}
```

- [ ] **Step 3: Failing test — `StatisticsView`**

Create `components/admin/StatisticsView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatisticsView } from "./StatisticsView";

const rows = [
  { landingId: "l1", name: "Promo A", visits: 200, downloads: 50, opens: 10, visitToDownloadPct: 25, downloadToOpenPct: 20, visitToOpenPct: 5 },
  { landingId: "l2", name: "Promo B", visits: 100, downloads: 10, opens: 2, visitToDownloadPct: 10, downloadToOpenPct: 20, visitToOpenPct: 2 },
];
const landings = [{ id: "l1", name: "Promo A" }, { id: "l2", name: "Promo B" }];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
  vi.stubGlobal("fetch", fetchMock);
});

describe("StatisticsView", () => {
  it("loads all-landings stats on mount and renders a table row + dashboard card per landing", async () => {
    render(<StatisticsView landings={landings} />);
    await waitFor(() => expect(screen.getByText("Promo A")).toBeInTheDocument());
    // table shows the numbers + a conversion %
    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    expect(screen.getAllByText("25%").length).toBeGreaterThan(0);
    // a dashboard card per landing (cards carry a stable testid)
    expect(screen.getAllByTestId(/^stat-card-/)).toHaveLength(2);
    // first fetch is to the stats endpoint
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/admin/stats");
  });

  it("refetches with landingId when a specific landing is selected", async () => {
    render(<StatisticsView landings={landings} />);
    await waitFor(() => expect(screen.getByText("Promo A")).toBeInTheDocument());
    fetchMock.mockClear();
    await userEvent.selectOptions(screen.getByLabelText("Landing"), "l2");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("landingId=l2");
  });

  it("refetches with a from= bound when a preset range is chosen", async () => {
    render(<StatisticsView landings={landings} />);
    await waitFor(() => expect(screen.getByText("Promo A")).toBeInTheDocument());
    fetchMock.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(String(fetchMock.mock.calls[0][0])).toContain("from=");
  });
});
```

Run: `npx vitest run components/admin/StatisticsView.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 4: Implement `StatisticsView`**

Create `components/admin/StatisticsView.tsx`:

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { presetToRange, type RangePreset } from "@/lib/admin/statsRange";

type FunnelRow = {
  landingId: string; name: string;
  visits: number; downloads: number; opens: number;
  visitToDownloadPct: number; downloadToOpenPct: number; visitToOpenPct: number;
};

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export function StatisticsView({ landings }: { landings: { id: string; name: string }[] }) {
  const [landingId, setLandingId] = useState("all");
  const [preset, setPreset] = useState<RangePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (landingId !== "all") params.set("landingId", landingId);
    if (customFrom || customTo) {
      if (customFrom) params.set("from", new Date(customFrom).toISOString());
      if (customTo) params.set("to", new Date(customTo).toISOString());
    } else {
      const { from, to } = presetToRange(preset);
      if (from) params.set("from", from.toISOString());
      if (to) params.set("to", to.toISOString());
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?${params.toString()}`, { credentials: "same-origin" });
      setRows(res.ok ? await res.json() : []);
    } finally {
      setLoading(false);
    }
  }, [landingId, preset, customFrom, customTo]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="stats">
      <div className="stats-filters">
        <label className="field">
          <span>Landing</span>
          <select aria-label="Landing" value={landingId} onChange={(e) => setLandingId(e.target.value)}>
            <option value="all">All landings</option>
            {landings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <div className="stats-presets" role="group" aria-label="Time range">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={preset === p.key && !customFrom && !customTo ? "preset active" : "preset"}
              onClick={() => { setCustomFrom(""); setCustomTo(""); setPreset(p.key); }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>From</span>
          <input aria-label="From date" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
        </label>
        <label className="field">
          <span>To</span>
          <input aria-label="To date" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </label>
      </div>

      <div className="stat-cards">
        {rows.map((r) => (
          <div className="stat-card" data-testid={`stat-card-${r.landingId}`} key={r.landingId}>
            <h3>{r.name}</h3>
            <p className="stat-nums">
              <span><b>{r.visits}</b> visits</span>
              <span><b>{r.downloads}</b> downloads</span>
              <span><b>{r.opens}</b> opens</span>
            </p>
            <p className="stat-rates">{r.visitToDownloadPct}% → {r.downloadToOpenPct}%</p>
          </div>
        ))}
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            <th>Landing</th><th>Visits</th><th>Downloads</th><th>Opens</th>
            <th>Visit→Download</th><th>Download→Open</th><th>Visit→Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.landingId}>
              <td>{r.name}</td><td>{r.visits}</td><td>{r.downloads}</td><td>{r.opens}</td>
              <td>{r.visitToDownloadPct}%</td><td>{r.downloadToOpenPct}%</td><td>{r.visitToOpenPct}%</td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr><td colSpan={7} className="empty">No data for this filter yet.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 5: Add minimal styles**

Append to `app/admin/admin.css`:

```css
.stats-filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; margin-bottom: 20px; }
.stats-presets { display: flex; gap: 6px; }
.stats-presets .preset { padding: 6px 10px; border: 1px solid #2a3b30; background: transparent; color: inherit; border-radius: 6px; cursor: pointer; }
.stats-presets .preset.active { background: #27C24C; border-color: #27C24C; color: #07120c; }
.stat-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat-card { border: 1px solid #1d2c22; border-radius: 10px; padding: 14px; }
.stat-card h3 { margin: 0 0 8px; font-size: 15px; }
.stat-nums { display: flex; gap: 14px; flex-wrap: wrap; margin: 0 0 6px; font-size: 13px; }
.stat-rates { margin: 0; color: #7FA88E; font-size: 13px; }
.stats-table { width: 100%; border-collapse: collapse; }
.stats-table th, .stats-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #15231a; }
```

- [ ] **Step 6: Run + commit**

Run: `npx vitest run lib/admin/statsRange.test.ts components/admin/StatisticsView.test.tsx && npx tsc --noEmit` — Expected: PASS.

```bash
git add lib/admin/statsRange.ts lib/admin/statsRange.test.ts components/admin/StatisticsView.tsx components/admin/StatisticsView.test.tsx app/admin/admin.css
git commit -m "feat(stats): StatisticsView (filters + dashboard cards + conversion table)"
```

---

### Task 9: Top-level Landings|Statistics tabs + Statistics route

**Files:**
- Create: `components/admin/StatsTabNav.tsx`, `components/admin/StatsTabNav.test.tsx`
- Create: `app/admin/(panel)/stats/page.tsx`
- Modify: `app/admin/(panel)/layout.tsx`

**Interfaces:**
- Consumes: `StatisticsView` (Task 8), `listLandings` (`@/lib/admin/landingService`).

- [ ] **Step 1: Failing test — `StatsTabNav`**

Create `components/admin/StatsTabNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { StatsTabNav } from "./StatsTabNav";

describe("StatsTabNav", () => {
  it("marks Landings active on /admin and on a landing editor route", () => {
    usePathname.mockReturnValue("/admin/landings/abc");
    render(<StatsTabNav />);
    expect(screen.getByRole("link", { name: "Landings" }).className).toContain("active");
    expect(screen.getByRole("link", { name: "Statistics" }).className).not.toContain("active");
  });

  it("marks Statistics active on /admin/stats", () => {
    usePathname.mockReturnValue("/admin/stats");
    render(<StatsTabNav />);
    expect(screen.getByRole("link", { name: "Statistics" }).className).toContain("active");
    expect(screen.getByRole("link", { name: "Landings" }).className).not.toContain("active");
  });
});
```

Run: `npx vitest run components/admin/StatsTabNav.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement `StatsTabNav`**

Create `components/admin/StatsTabNav.tsx` (reuses the existing `.tabs`/`.tab` classes that `LandingEditor` uses):

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Top-level admin sections. "Statistics" is active only under /admin/stats; everything else
// under the panel (the landings list + the per-landing editor) belongs to "Landings".
export function StatsTabNav() {
  const pathname = usePathname() ?? "";
  const onStats = pathname.startsWith("/admin/stats");
  return (
    <nav className="tabs">
      <Link href="/admin" className={onStats ? "tab" : "tab active"}>Landings</Link>
      <Link href="/admin/stats" className={onStats ? "tab active" : "tab"}>Statistics</Link>
    </nav>
  );
}
```

- [ ] **Step 3: Render the nav in the panel layout**

In `app/admin/(panel)/layout.tsx`, add the import:

```ts
import { StatsTabNav } from "@/components/admin/StatsTabNav";
```

and render it just inside `<main className="admin-main">`, before `{children}`:

```tsx
      <main className="admin-main">
        <StatsTabNav />
        {children}
      </main>
```

- [ ] **Step 4: Create the Statistics route**

Create `app/admin/(panel)/stats/page.tsx` (server component; auth is enforced by the panel layout's `requireAdminSession()`):

```tsx
import { listLandings } from "@/lib/admin/landingService";
import { StatisticsView } from "@/components/admin/StatisticsView";

export default async function StatsPage() {
  const landings = await listLandings();
  return (
    <section>
      <h1>Statistics</h1>
      <StatisticsView landings={landings.map((l) => ({ id: l.id, name: l.name }))} />
    </section>
  );
}
```

- [ ] **Step 5: Verify the nav + route, full suite, commit**

Run: `npx vitest run components/admin/StatsTabNav.test.tsx && npm test && npx tsc --noEmit` — Expected: full suite green, exit 0.

```bash
git add components/admin/StatsTabNav.tsx components/admin/StatsTabNav.test.tsx "app/admin/(panel)/stats/page.tsx" "app/admin/(panel)/layout.tsx"
git commit -m "feat(stats): top-level Landings|Statistics tabs + Statistics route"
```

---

## Self-Review

**Spec coverage:**
- §4 data model (`Event` + `EventType` + `Landing.events`) → Task 1. ✓
- §5 capture: `vid` cookie + `/api/track` host-derive + mint → Task 2; `beaconEvent` helper → Task 3; VISIT (page) → Task 4; INSTALL (`appinstalled`) + OPEN (standalone `/launch`, not pixel-gated) → Task 5. ✓
- §6 aggregation `COUNT(DISTINCT visitorId)` + conversion rates + range/landing filters + divide-by-zero → Task 6; guarded `GET /api/admin/stats` + UTC instant params → Task 7. ✓
- §7 admin: top-level Landings|Statistics tabs → Task 9; filters (landing + presets + custom dates) + dashboard cards + conversion table → Task 8. ✓
- §8 testing → each task ships its tests (events, tenant, /api/track, track, VisitBeacon, usePwaInstall, LaunchRedirect, statsService, stats route, statsRange, StatisticsView, StatsTabNav). ✓
- §9 iOS limitation → no code (documented); INSTALL relies on `appinstalled` which iOS doesn't fire — consistent with the spec, not a gap to "fix". ✓
- §10 out-of-scope items → none implemented. ✓

**Placeholder scan:** Every code step carries complete code; every test step carries real assertions. Task 5 Step 1 and Task 2 Step 1 say "mirror the file's existing style" only for the test-harness boilerplate (renderHook vs probe; the `@/lib/db` mock shape) — the behavior asserted, the new function names, and all production code are given verbatim. No "TBD/handle errors". ✓

**Type consistency:** `TrackType = "visit"|"install"|"open"` is identical across `lib/eventTypes.ts`, `recordEvent`/`isTrackType` (Task 1), `beaconEvent` (Task 3). `FunnelRow` fields (`visits/downloads/opens/visitToDownloadPct/downloadToOpenPct/visitToOpenPct`) match across `statsService` (Task 6), the route (Task 7), and `StatisticsView` (Task 8). `getLandingIdByHost(host): Promise<string|null>` (Task 2) is consumed only by the route in the same task. `presetToRange`/`RangePreset` (Task 8) are self-contained. Cookie name `vid` is consistent (Task 2). ✓

## Out of scope
Rollup tables; real-time streaming; bot filtering beyond the `vid` cookie; geo/device/UTM breakdowns; CSV export; the Facebook Graph API source.
