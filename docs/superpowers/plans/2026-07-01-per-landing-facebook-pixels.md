# Per-landing Facebook Pixels + Lead on PWA open — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each landing carries a list of Meta pixel IDs that load on the landing (PageView) and fire a `Lead` when the installed PWA is opened (the admin link loads).

**Architecture:** A new `Landing.fbPixelIds String[]` threads through `toLandingView` → `LandingView`. A shared browser helper `lib/fbq.ts` loads `fbevents.js` once + `init`s each pixel + `track`s events. A client `MetaPixel` fires `PageView` from the shared landing page; a new `/launch` client interstitial (the PWA `start_url`) fires `Lead` only in standalone mode, then forwards to `redirectUrl`. `/go` is unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma/Postgres, Vitest + Testing Library.

## Global Constraints

- TypeScript strict; match existing patterns (`lib/tenant.ts`, the admin `*Tab`/validation chain). Commit after every task.
- Unit tests: `npm test`; single file: `npx vitest run <path>`. `npx tsc --noEmit` must stay clean. The dev Postgres is on `:5433` and `.env` has `DATABASE_URL`, so `prisma db push`/`generate` work.
- Pixel IDs are **numeric strings** (`^\d{6,20}$`). A landing may have **several**; all `init` and receive every event (one shared `window.fbq` queue).
- Events are **lean**: `PageView` (on landing load) + `Lead` (on PWA open) — nothing else.
- The pixel loads **unconditionally** (no consent gate — operator's responsibility).
- `/go` (`app/[domain]/go/route.ts`) stays an instant **302**. The new **`/launch`** client page is the PWA `start_url`; it fires `Lead` **only** when `display-mode: standalone` (or iOS `navigator.standalone`), waits **~500 ms** so the beacon sends, then `location.replace(redirectUrl)`. Non-standalone → immediate redirect, no `Lead`.
- Out of scope: Conversions API, event dedup/`event_id`, intermediate funnel events, per-pixel targeting.

## File Structure

**New:**
- `lib/fbq.ts` (+ `lib/fbq.test.ts`) — `ensureBaseSnippet()`, `initPixels(ids)`, `track(event, params?)`.
- `components/analytics/MetaPixel.tsx` (+ `components/analytics/MetaPixel.test.tsx`) — PageView component.
- `app/[domain]/launch/page.tsx` — server entry for the PWA `start_url`.
- `app/[domain]/launch/LaunchRedirect.client.tsx` (+ `app/[domain]/launch/LaunchRedirect.test.tsx`) — standalone-gated `Lead` + redirect.

**Modified:**
- `prisma/schema.prisma` — `fbPixelIds String[] @default([])`.
- `lib/types.ts` — `LandingView.fbPixelIds: string[]`.
- `lib/tenant.ts` — `LandingRow.fbPixelIds` + `toLandingView` mapping.
- `app/[domain]/page.tsx` — render `<MetaPixel pixelIds={view.fbPixelIds} />`.
- `app/[domain]/manifest/route.ts` — `start_url: "/launch"`.
- `lib/admin/validation.ts` — `patchSchema.fbPixelIds`.
- `lib/admin/types.ts` — `EditableLanding.fbPixelIds`.
- `lib/admin/landingService.ts` — return + persist `fbPixelIds`.
- `components/admin/SettingsTab.tsx` — the "Facebook Pixels" textarea.

---

### Task 1: Schema field + read-path (`fbPixelIds` → `LandingView`)

**Files:**
- Modify: `prisma/schema.prisma`, `lib/types.ts`, `lib/tenant.ts`
- Test: `lib/tenant.test.ts`

**Interfaces:**
- Produces: `LandingView.fbPixelIds: string[]` (consumed by Tasks 3, 4, 5).

- [ ] **Step 1: Add the schema field**

In `prisma/schema.prisma`, in `model Landing`, after `pwaIconUrl String?`, add:

```prisma
  fbPixelIds         String[] @default([])
```

- [ ] **Step 2: Push + regenerate**

Run: `npx prisma db push && npx prisma generate`
Expected: additive column applied (existing rows default to `[]`), exit 0.

- [ ] **Step 3: Extend the view types**

In `lib/types.ts`, add to `LandingView` (after `pwaIconUrl: string | null;`):

```ts
  fbPixelIds: string[];
```

- [ ] **Step 4: Failing test for the mapping**

In `lib/tenant.test.ts`, extend the existing `LandingRow` fixture builder with `fbPixelIds: ["111111111111", "222222222222"]` and add:

```ts
it("threads fbPixelIds into the view", () => {
  const v = toLandingView(row());
  expect(v.fbPixelIds).toEqual(["111111111111", "222222222222"]);
});
```

Run: `npx vitest run lib/tenant.test.ts` — Expected: FAIL (tsc/property missing). (tsc will also require adding `fbPixelIds: string[]` to the `LandingRow` fixture in any other test that builds one — add `fbPixelIds: []` to those.)

- [ ] **Step 5: Map it**

In `lib/tenant.ts`, add to the `LandingRow` type (after `winText: string;`):

```ts
  fbPixelIds: string[];
```

and in `toLandingView`'s returned object (after `pwaIconUrl: landing.pwaIconUrl,`):

```ts
    fbPixelIds: landing.fbPixelIds,
```

- [ ] **Step 6: Run + commit**

Run: `npx vitest run lib/tenant.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add prisma/schema.prisma lib/types.ts lib/tenant.ts lib/tenant.test.ts
git commit -m "feat(pixels): Landing.fbPixelIds threaded into LandingView"
```

---

### Task 2: `lib/fbq.ts` helper

**Files:**
- Create: `lib/fbq.ts`, `lib/fbq.test.ts`

**Interfaces:**
- Produces: `ensureBaseSnippet(): void`, `initPixels(ids: string[]): void`, `track(event: string, params?: Record<string, unknown>): void` (consumed by Tasks 3, 4).

- [ ] **Step 1: Failing test**

`lib/fbq.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureBaseSnippet, initPixels, track } from "./fbq";

declare global { interface Window { fbq?: (...a: unknown[]) => void; _fbq?: unknown; } }

beforeEach(() => { delete window.fbq; delete window._fbq; document.head.innerHTML = ""; document.body.innerHTML = ""; });

describe("fbq helper", () => {
  it("ensureBaseSnippet defines window.fbq and injects the loader once", () => {
    ensureBaseSnippet();
    expect(typeof window.fbq).toBe("function");
    const before = document.querySelectorAll('script[src*="fbevents.js"]').length;
    ensureBaseSnippet(); // idempotent
    expect(document.querySelectorAll('script[src*="fbevents.js"]').length).toBe(before);
  });
  it("initPixels inits each id once; track forwards the event", () => {
    window.fbq = vi.fn();
    initPixels(["100000000001", "100000000002"]);
    initPixels(["100000000001"]); // already inited -> no second init
    track("PageView");
    track("Lead", { value: 1 });
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["init", "100000000001"]);
    expect(calls).toContainEqual(["init", "100000000002"]);
    expect(calls.filter((c) => c[0] === "init" && c[1] === "100000000001")).toHaveLength(1);
    expect(calls).toContainEqual(["track", "PageView", undefined]);
    expect(calls).toContainEqual(["track", "Lead", { value: 1 }]);
  });
});
```

Run: `npx vitest run lib/fbq.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

`lib/fbq.ts`:

```ts
// Meta (Facebook) Pixel browser helper. Loads fbevents.js once, inits each pixel once,
// and forwards track events to the shared window.fbq queue. No-op on the server.
declare global {
  interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown; }
}

const inited = new Set<string>();

export function ensureBaseSnippet(): void {
  if (typeof window === "undefined" || window.fbq) return;
  const n = function (...args: unknown[]) {
    const self = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
    if (self.callMethod) self.callMethod(...args); else self.queue.push(args);
  } as unknown as Window["fbq"] & { queue: unknown[]; loaded: boolean; version: string; push: unknown };
  n.queue = []; n.loaded = true; n.version = "2.0"; n.push = n;
  window.fbq = n; window._fbq = n;
  const t = document.createElement("script");
  t.async = true; t.src = "https://connect.facebook.net/en_US/fbevents.js";
  const s = document.getElementsByTagName("script")[0];
  if (s && s.parentNode) s.parentNode.insertBefore(t, s); else document.head.appendChild(t);
}

export function initPixels(ids: string[]): void {
  if (typeof window === "undefined" || !window.fbq) return;
  for (const id of ids) {
    if (inited.has(id)) continue;
    inited.add(id);
    window.fbq("init", id);
  }
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}
```

- [ ] **Step 3: Run + commit**

Run: `npx vitest run lib/fbq.test.ts && npx tsc --noEmit` — Expected: PASS.

```bash
git add lib/fbq.ts lib/fbq.test.ts
git commit -m "feat(pixels): lib/fbq base-snippet loader + initPixels + track"
```

---

### Task 3: `MetaPixel` component (PageView) + wire into the landing page

**Files:**
- Create: `components/analytics/MetaPixel.tsx`, `components/analytics/MetaPixel.test.tsx`
- Modify: `app/[domain]/page.tsx`

**Interfaces:**
- Consumes: `ensureBaseSnippet`/`initPixels`/`track` (Task 2), `LandingView.fbPixelIds` (Task 1).
- Produces: `MetaPixel({ pixelIds }: { pixelIds: string[] })`.

- [ ] **Step 1: Failing test**

`components/analytics/MetaPixel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MetaPixel } from "./MetaPixel";

declare global { interface Window { fbq?: (...a: unknown[]) => void; } }
beforeEach(() => { window.fbq = vi.fn(); });

describe("MetaPixel", () => {
  it("inits each pixel and fires one PageView, plus a noscript img per id", () => {
    const { container } = render(<MetaPixel pixelIds={["100000000001", "100000000002"]} />);
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["init", "100000000001"]);
    expect(calls).toContainEqual(["init", "100000000002"]);
    expect(calls.filter((c) => c[0] === "track" && c[1] === "PageView")).toHaveLength(1);
    expect(container.querySelectorAll('img[src*="facebook.com/tr"]')).toHaveLength(2);
  });
  it("renders nothing and fires nothing when there are no pixels", () => {
    const { container } = render(<MetaPixel pixelIds={[]} />);
    expect(container.firstChild).toBeNull();
    expect(window.fbq).not.toHaveBeenCalled();
  });
});
```

Run: `npx vitest run components/analytics/MetaPixel.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

`components/analytics/MetaPixel.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { ensureBaseSnippet, initPixels, track } from "@/lib/fbq";

// Loads the landing's Meta pixels and fires PageView. Renders only a <noscript> fallback.
// No-op (renders null) when the landing has no pixels configured.
export function MetaPixel({ pixelIds }: { pixelIds: string[] }) {
  useEffect(() => {
    if (pixelIds.length === 0) return;
    ensureBaseSnippet();
    initPixels(pixelIds);
    track("PageView");
  }, [pixelIds]);

  if (pixelIds.length === 0) return null;
  return (
    <noscript>
      {pixelIds.map((id) => (
        <img
          key={id} height={1} width={1} alt="" style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      ))}
    </noscript>
  );
}
```

- [ ] **Step 3: Render it on every landing**

In `app/[domain]/page.tsx`, add the import:

```ts
import { MetaPixel } from "@/components/analytics/MetaPixel";
```

and replace the body of `LandingPage` after the `notFound()` guard with:

```tsx
  const scene =
    view.template === "classic-2d"
      ? <LandingScene view={view} />
      : <TemplateScene template={view.template} config={buildSceneConfig(view)} />;
  return (
    <>
      <MetaPixel pixelIds={view.fbPixelIds} />
      {scene}
    </>
  );
```

- [ ] **Step 4: Run + commit**

Run: `npx vitest run components/analytics/MetaPixel.test.tsx && npx tsc --noEmit` — Expected: PASS.

```bash
git add components/analytics/MetaPixel.tsx components/analytics/MetaPixel.test.tsx "app/[domain]/page.tsx"
git commit -m "feat(pixels): MetaPixel PageView on every landing"
```

---

### Task 4: `/launch` interstitial (Lead on PWA open) + manifest `start_url`

**Files:**
- Create: `app/[domain]/launch/page.tsx`, `app/[domain]/launch/LaunchRedirect.client.tsx`, `app/[domain]/launch/LaunchRedirect.test.tsx`
- Modify: `app/[domain]/manifest/route.ts`

**Interfaces:**
- Consumes: `ensureBaseSnippet`/`initPixels`/`track` (Task 2), `LandingView.{fbPixelIds,redirectUrl}` (Task 1).
- Produces: `LaunchRedirect({ pixelIds, redirectUrl }: { pixelIds: string[]; redirectUrl: string })`.

- [ ] **Step 1: Failing test**

`app/[domain]/launch/LaunchRedirect.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { LaunchRedirect } from "./LaunchRedirect.client";

declare global { interface Window { fbq?: (...a: unknown[]) => void; } }

let replace: ReturnType<typeof vi.fn>;
function setStandalone(on: boolean) {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes("standalone"), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }, onchange: null })) as unknown as typeof window.matchMedia;
}
beforeEach(() => {
  vi.useFakeTimers();
  window.fbq = vi.fn();
  replace = vi.fn();
  Object.defineProperty(window, "location", { value: { replace }, writable: true });
});
afterEach(() => vi.useRealTimers());

describe("LaunchRedirect", () => {
  it("standalone PWA open: fires Lead then redirects to the admin link", () => {
    setStandalone(true);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    const calls = (window.fbq as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toContainEqual(["track", "Lead", undefined]);
    expect(replace).not.toHaveBeenCalled(); // waits ~500ms
    vi.advanceTimersByTime(600);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
  });
  it("normal browser (not standalone): redirects immediately, no Lead", () => {
    setStandalone(false);
    render(<LaunchRedirect pixelIds={["100000000001"]} redirectUrl="https://offer.example/app" />);
    expect(replace).toHaveBeenCalledWith("https://offer.example/app");
    expect((window.fbq as ReturnType<typeof vi.fn>).mock.calls.some((c) => c[1] === "Lead")).toBe(false);
  });
});
```

Run: `npx vitest run "app/[domain]/launch/LaunchRedirect.test.tsx"` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement the client interstitial**

`app/[domain]/launch/LaunchRedirect.client.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { ensureBaseSnippet, initPixels, track } from "@/lib/fbq";

// The PWA start_url lands here when the installed app is opened. In standalone mode that means
// "downloaded + opened", so we fire Lead to the landing's pixels, then forward to the admin link.
// A normal browser visit (the in-page claim already 302s via /go) just forwards, no Lead.
export function LaunchRedirect({ pixelIds, redirectUrl }: { pixelIds: string[]; redirectUrl: string }) {
  useEffect(() => {
    const standalone =
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone && pixelIds.length > 0) {
      ensureBaseSnippet();
      initPixels(pixelIds);
      track("Lead");
      const t = setTimeout(() => window.location.replace(redirectUrl), 500);
      return () => clearTimeout(t);
    }
    window.location.replace(redirectUrl);
  }, [pixelIds, redirectUrl]);

  return <p style={{ font: "16px system-ui", textAlign: "center", marginTop: "40vh" }}>Opening…</p>;
}
```

- [ ] **Step 3: Server entry**

`app/[domain]/launch/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { LaunchRedirect } from "./LaunchRedirect.client";

type Params = { params: Promise<{ domain: string }> };

export default async function LaunchPage({ params }: Params) {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) notFound();
  return <LaunchRedirect pixelIds={view.fbPixelIds} redirectUrl={view.redirectUrl} />;
}
```

- [ ] **Step 4: Point the PWA at `/launch`**

In `app/[domain]/manifest/route.ts`, change `start_url: "/go",` to:

```ts
    start_url: "/launch",
```

Then grep for any test asserting the old start_url and update it:

Run: `grep -rn '"/go"' app components tests --include=*.ts --include=*.tsx | grep -i start_url` — if a unit/e2e test asserts `start_url` is `/go`, change that assertion to `/launch`. (The `/go` route handler + its own redirect tests are unchanged — only the manifest's `start_url` moved.)

- [ ] **Step 5: Run + commit**

Run: `npx vitest run "app/[domain]/launch/LaunchRedirect.test.tsx" && npx tsc --noEmit` — Expected: PASS.

```bash
git add "app/[domain]/launch" "app/[domain]/manifest/route.ts"
git commit -m "feat(pixels): /launch interstitial fires Lead on PWA open; manifest start_url -> /launch"
```

---

### Task 5: Admin — "Facebook Pixels" field

**Files:**
- Modify: `lib/admin/validation.ts`, `lib/admin/types.ts`, `lib/admin/landingService.ts`, `components/admin/SettingsTab.tsx`
- Test: `lib/admin/validation.test.ts`, `components/admin/SettingsTab.test.tsx`

**Interfaces:**
- Consumes: the `fbPixelIds` column (Task 1).
- Produces: `EditableLanding.fbPixelIds: string[]`; `patchSchema` accepts `fbPixelIds: string[]`.

- [ ] **Step 1: Validation — failing test**

In `lib/admin/validation.test.ts`, add:

```ts
it("accepts numeric fbPixelIds and rejects non-numeric", () => {
  expect(parseLandingPatch({ fbPixelIds: ["123456789012345"] }).fbPixelIds).toEqual(["123456789012345"]);
  expect(() => parseLandingPatch({ fbPixelIds: ["not-a-pixel"] })).toThrow();
});
```

(If the test file uses `patchSchema.safeParse` instead of `parseLandingPatch`, mirror that file's existing style.)

Run: `npx vitest run lib/admin/validation.test.ts` — Expected: FAIL.

- [ ] **Step 2: Validation — implement**

In `lib/admin/validation.ts`, add to the `patchSchema` object (after `pwaIconUrl: url.nullable(),`):

```ts
    fbPixelIds: z.array(z.string().regex(/^\d{6,20}$/)),
```

(It's inside `.partial()`, so it's optional on a patch.)

- [ ] **Step 3: EditableLanding + service**

In `lib/admin/types.ts`, add to `EditableLanding` (after `pwaIconUrl: string | null;`):

```ts
  fbPixelIds: string[];
```

In `lib/admin/landingService.ts`, in the object `getEditableLanding` returns (next to `pwaIconUrl`), add:

```ts
    fbPixelIds: landing.fbPixelIds,
```

(The function `include`s the full landing, so `landing.fbPixelIds` is already fetched. The save path passes the validated patch straight to `prisma.landing.update`, so `fbPixelIds` persists with no extra change.)

- [ ] **Step 4: SettingsTab field — failing test**

In `components/admin/SettingsTab.test.tsx`, mirror the existing `pwaName` test: render with an editable landing whose `fbPixelIds: ["111111111111"]`, assert the textarea shows `111111111111`, type a two-line value `111111111111\n222222222222`, click save, and assert the saved patch includes `fbPixelIds: ["111111111111", "222222222222"]`. Use the file's existing render + mocked-save harness.

Run: `npx vitest run components/admin/SettingsTab.test.tsx` — Expected: FAIL.

- [ ] **Step 5: SettingsTab field — implement**

In `components/admin/SettingsTab.tsx`, add a labelled `<textarea aria-label="Facebook Pixels">` near the PWA fields. Display value = `editable.fbPixelIds.join("\n")`. On change, parse to the array and update the editable state:

```tsx
const parsePixels = (raw: string): string[] =>
  raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
```

Bind: `onChange={(e) => update({ fbPixelIds: parsePixels(e.target.value) })}` (use whatever the tab's existing field-update helper is — mirror how `pwaName` updates). Add helper text: "One Meta pixel ID per line. Fires PageView on the page and Lead when the installed app is opened." Ensure the tab's `save()` payload already spreads the editable landing (so `fbPixelIds` is included) — mirror `pwaName`.

- [ ] **Step 6: Run full suite + commit**

Run: `npx vitest run lib/admin/validation.test.ts components/admin/SettingsTab.test.tsx && npm test && npx tsc --noEmit` — Expected: full suite green, exit 0.

```bash
git add lib/admin/validation.ts lib/admin/types.ts lib/admin/landingService.ts components/admin/SettingsTab.tsx lib/admin/validation.test.ts components/admin/SettingsTab.test.tsx
git commit -m "feat(admin): Facebook Pixels field in Settings (numeric-validated list)"
```

---

## Self-Review

**Spec coverage:**
- §4 data model + read path → Task 1. ✓
- §5 `lib/fbq.ts` helper → Task 2; `MetaPixel` + PageView on all templates (page.tsx) → Task 3. ✓
- §6 `/launch` interstitial + standalone-gated `Lead` + manifest `start_url` + `/go` unchanged → Task 4. ✓
- §7 admin Settings field + validation + plumbing → Task 5. ✓
- §8 testing → each task's tests (`lib/fbq.test`, `MetaPixel.test`, `LaunchRedirect.test`, `tenant.test`, `validation.test`, `SettingsTab.test`). ✓
- §9 out-of-scope (CAPI/dedup/funnel/consent) → not implemented, by design. ✓

**Placeholder scan:** Task 4 Step 4 and Task 5 Steps 4–5 reference "mirror the existing harness / field-update helper" because they extend files whose exact local helper names the implementer reads in-file — but the field name (`fbPixelIds`), the parse function, the validation regex, the exact assertions, and all new-file code are given verbatim. No "TBD/handle errors". ✓

**Type consistency:** `fbPixelIds: string[]` is identical across `schema` (Task 1), `LandingRow`/`LandingView`/`toLandingView` (Task 1), `MetaPixel`/`LaunchRedirect` props (Tasks 3–4), `EditableLanding`/`patchSchema` (Task 5). `ensureBaseSnippet()`/`initPixels(ids)`/`track(event, params?)` are defined in Task 2 and consumed identically in Tasks 3–4. ✓

## Out of scope
Conversions API; event dedup/`event_id`; intermediate funnel events (Spin/install-prompt/Android-install); a consent gate; per-pixel `trackSingle`.
