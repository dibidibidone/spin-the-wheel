# Admin-configurable 3D landings + PWA-download flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four 3D landings (Jackpot Vault, Alchemy Lab, Book of Ra, Gates of Olympus) selectable and configurable from the existing admin, and replace the post-win redirect with a per-landing "PWA download on spin → open app on claim" flow.

**Architecture:** Add a `template` field + three PWA fields to the `Landing` model. The public `app/[domain]` route switches on `template`: `classic-2d` keeps the existing 2D `LandingScene`; the four 3D scenes render from a DB-derived `LandingSceneConfig`. Each non-classic landing serves a host-relative PWA manifest (`/manifest`) and redirector (`/go`) plus a static service worker; clicking SPIN fires the install prompt and "take the prize" opens the app via `/go`.

**Tech Stack:** Next.js 15 App Router (server + client components, route handlers), Prisma 6 / Postgres, Zod, React 19, `@react-three/fiber` + `drei`, Vitest + Testing Library, Playwright.

## Global Constraints

- TypeScript strict; match existing file style and patterns (no unrelated refactors).
- Schema changes apply via `npm run db:push` then `npm run db:generate` — this repo has **no `prisma/migrations/`** folder.
- Dev Postgres runs on host port **5433**; `DATABASE_URL` in `.env` already points there.
- Unit/component tests: `npm test` (vitest run); single file: `npx vitest run <path>`.
- E2E: `npx playwright test <path>` — **run 3D specs in ≤3-spec batches** (SwiftShader/WebGL context exhaustion) and use 30s canvas-visibility timeouts.
- Template values are exactly: `classic-2d`, `jackpot-vault`, `alchemy-lab`, `book-of-ra`, `gates-of-olympus`. `classic-2d` is the default.
- Do **not** remove unused `kit/CoinStorm.tsx` or revert the owner's visual-polish work.
- Additive only: existing `classic-2d` landings and their flow must be unchanged.
- Commit after every task (frequent commits).

## File Structure

**New files:**
- `app/[domain]/manifest/route.ts` — per-landing PWA manifest (host-relative).
- `app/[domain]/go/route.ts` — same-origin redirector to the offer link.
- `app/[domain]/TemplateScene.client.tsx` — client wrapper that dynamically loads the chosen 3D scene.
- `public/sw.js` — static no-op service worker (installability).
- `lib/sceneConfig.ts` — pure `buildSceneConfig(view) → LandingSceneConfig`.
- `components/r3f/kit/sceneConfig.ts` — `LandingSceneConfig` + `PwaConfig` types.
- `components/r3f/kit/usePwaInstall.ts` — install controller hook.
- `components/r3f/kit/IosInstallHint.tsx` + `iosInstallHint.module.css` — iOS "Add to Home Screen" overlay.
- Test files alongside each.

**Modified files:**
- `prisma/schema.prisma`, `prisma/seed.ts`
- `lib/admin/validation.ts`, `lib/admin/landingService.ts`, `lib/admin/types.ts`
- `lib/tenant.ts`, `lib/types.ts`
- `app/[domain]/page.tsx`, `app/[domain]/buildMetadata.ts`
- `components/admin/SettingsTab.tsx`
- `components/r3f/kit/spinController.ts`, `components/r3f/kit/spinScene.tsx`, `components/r3f/kit/useSlotScene.ts`
- `components/r3f/jackpot/JackpotVaultScene.tsx`, `components/r3f/alchemy/AlchemyLabScene.tsx`, `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`, `components/r3f/slots/gates-of-olympus/GatesScene.tsx`

---

### Task 1: Schema — add `template` + PWA fields to `Landing`

**Files:**
- Modify: `prisma/schema.prisma` (Landing model)

**Interfaces:**
- Produces: `Landing.template: string` (default `"classic-2d"`), `Landing.pwaName: string` (default `""`), `Landing.pwaIconUrl: string | null`, `Landing.pwaUrl: string` (default `""`).

- [ ] **Step 1: Add the four columns**

In `prisma/schema.prisma`, inside `model Landing`, add after the `almostText` line:

```prisma
  template           String   @default("classic-2d") // classic-2d | jackpot-vault | alchemy-lab | book-of-ra | gates-of-olympus

  pwaName            String   @default("")
  pwaIconUrl         String?
  pwaUrl             String   @default("")
```

- [ ] **Step 2: Push the schema and regenerate the client**

Run: `npm run db:push && npm run db:generate`
Expected: `Your database is now in sync with your Prisma schema.` and `Generated Prisma Client`.

- [ ] **Step 3: Verify the client has the new fields**

Run: `npx tsc --noEmit`
Expected: exit 0 (the generated client now types the new fields; no errors).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add template + PWA fields to Landing schema"
```

---

### Task 2: Admin validation + service + editable type for the new fields

**Files:**
- Modify: `lib/admin/validation.ts`
- Modify: `lib/admin/landingService.ts:81-104` (the `getEditableLanding` return)
- Modify: `lib/admin/types.ts:12-35` (`EditableLanding`)
- Test: `lib/admin/validation.test.ts` (create if absent)

**Interfaces:**
- Consumes: `Landing` fields from Task 1.
- Produces: `parseLandingPatch` accepts `template`, `pwaName`, `pwaIconUrl`, `pwaUrl`. `EditableLanding` gains the same four fields; `getEditableLanding` returns them.

- [ ] **Step 1: Write the failing validation test**

Create/append `lib/admin/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseLandingPatch } from "./validation";

describe("parseLandingPatch — template + PWA", () => {
  it("accepts a valid template and PWA fields", () => {
    const r = parseLandingPatch({
      template: "jackpot-vault",
      pwaName: "Lucky App",
      pwaIconUrl: "https://cdn.example.com/icon.png",
      pwaUrl: "https://offer.example.com/go",
    });
    expect(r.ok).toBe(true);
  });

  it("accepts a blank pwaUrl (falls back to redirectUrl downstream)", () => {
    const r = parseLandingPatch({ pwaUrl: "" });
    expect(r.ok).toBe(true);
  });

  it("rejects an unknown template", () => {
    const r = parseLandingPatch({ template: "roulette" });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/admin/validation.test.ts`
Expected: FAIL — unknown template currently passes (strict schema rejects the key entirely, so `accepts a valid template` fails with "Unrecognized key").

- [ ] **Step 3: Extend the patch schema**

In `lib/admin/validation.ts`, add to the `patchSchema` object (before `.partial().strict()`), after the `bgImageUrl: url.nullable(),` line:

```ts
    template: z.enum([
      "classic-2d",
      "jackpot-vault",
      "alchemy-lab",
      "book-of-ra",
      "gates-of-olympus",
    ]),
    pwaName: z.string(),
    pwaIconUrl: url.nullable(),
    pwaUrl: z.union([url, z.literal("")]),
```

- [ ] **Step 4: Extend `EditableLanding`**

In `lib/admin/types.ts`, add to the `EditableLanding` type after `almostText: string;`:

```ts
  template: string;
  pwaName: string;
  pwaIconUrl: string | null;
  pwaUrl: string;
```

- [ ] **Step 5: Return the new fields from `getEditableLanding`**

In `lib/admin/landingService.ts`, in the object returned by `getEditableLanding`, add after `almostText: l.almostText,`:

```ts
    template: l.template,
    pwaName: l.pwaName,
    pwaIconUrl: l.pwaIconUrl,
    pwaUrl: l.pwaUrl,
```

(`updateLanding` already does `prisma.landing.update({ data: patch })`, so the new patch keys persist with no further change.)

- [ ] **Step 6: Run tests + typecheck**

Run: `npx vitest run lib/admin/validation.test.ts && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/admin/validation.ts lib/admin/validation.test.ts lib/admin/types.ts lib/admin/landingService.ts
git commit -m "feat: validate + expose template/PWA fields in admin layer"
```

---

### Task 3: Public `LandingView` carries the new fields + `buildSceneConfig`

**Files:**
- Modify: `lib/types.ts:41-53` (`LandingView`)
- Modify: `lib/tenant.ts:6-16` (`LandingRow`) and `lib/tenant.ts:18-42` (`toLandingView`)
- Create: `components/r3f/kit/sceneConfig.ts`
- Create: `lib/sceneConfig.ts`
- Test: `lib/sceneConfig.test.ts`

**Interfaces:**
- Consumes: `LandingView` (extended), `withConversionDefaults` from `components/r3f/kit/conversion`, `ConversionConfig`/`OverlayCopy` from `components/r3f/kit/types`.
- Produces:
  - `LandingView` gains `template: string; pwaName: string; pwaIconUrl: string | null; pwaUrl: string`.
  - `type PwaConfig = { name: string; iconUrl: string | null; openUrl: string }`.
  - `type LandingSceneConfig = { conversion: ConversionConfig; copy?: Partial<OverlayCopy>; winningIndex?: number; spinsBeforeWin?: number; pwa: PwaConfig }`.
  - `buildSceneConfig(view: LandingView): LandingSceneConfig`.

- [ ] **Step 1: Define the scene-config types**

Create `components/r3f/kit/sceneConfig.ts`:

```ts
import type { ConversionConfig, OverlayCopy } from "./types";

export type PwaConfig = {
  name: string;
  iconUrl: string | null;
  openUrl: string; // same-origin redirector, always "/go"
};

export type LandingSceneConfig = {
  conversion: ConversionConfig;
  copy?: Partial<OverlayCopy>;
  winningIndex?: number;  // wheel templates: which segment lands up
  spinsBeforeWin?: number; // wheel + slot templates: win on this spin
  pwa: PwaConfig;
};
```

- [ ] **Step 2: Write the failing `buildSceneConfig` test**

Create `lib/sceneConfig.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSceneConfig } from "./sceneConfig";
import type { LandingView } from "./types";

const view: LandingView = {
  slug: "demo",
  texts: { heading: "H", subtitle: "S", backLabel: "Back", winTitle: "You won!", claimLabel: "Claim →", almostText: "Almost" },
  theme: { bg: "#000000", surface: "#111111", accent: "#222222", gold: "#FFD24A", text: "#FFFFFF", muted: "#888888" },
  assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
  segments: [],
  spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" },
  redirectUrl: "https://offer.example.com",
  redirectPrizeParam: null,
  winningPrizeLabel: "JACKPOT",
  metaTitle: "t",
  metaDescription: "d",
  template: "jackpot-vault",
  pwaName: "Lucky App",
  pwaIconUrl: "https://cdn.example.com/icon.png",
  pwaUrl: "https://offer.example.com/go",
};

describe("buildSceneConfig", () => {
  it("maps prize, claim, win-spin and PWA from the landing", () => {
    const c = buildSceneConfig(view);
    expect(c.conversion.prize).toBe("JACKPOT");
    expect(c.conversion.claimLabel).toBe("Claim →");
    expect(c.conversion.redirectUrl).toBe("/go");
    expect(c.winningIndex).toBe(7);
    expect(c.spinsBeforeWin).toBe(2);
    expect(c.copy?.winPrize).toBe("JACKPOT");
    expect(c.pwa).toEqual({ name: "Lucky App", iconUrl: "https://cdn.example.com/icon.png", openUrl: "/go" });
  });

  it("falls back to winTitle when there is no winning prize label", () => {
    const c = buildSceneConfig({ ...view, winningPrizeLabel: "" });
    expect(c.conversion.prize).toBe("You won!");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run lib/sceneConfig.test.ts`
Expected: FAIL — `Cannot find module './sceneConfig'` and `LandingView` missing `template`/`pwa*`.

- [ ] **Step 4: Extend `LandingView`**

In `lib/types.ts`, add to `LandingView` after `metaDescription: string;`:

```ts
  template: string;
  pwaName: string;
  pwaIconUrl: string | null;
  pwaUrl: string;
```

- [ ] **Step 5: Extend `LandingRow` + `toLandingView`**

In `lib/tenant.ts`, add to the `LandingRow` type (after `metaTitle: string | null; metaDescription: string | null;`):

```ts
  template: string; pwaName: string; pwaIconUrl: string | null; pwaUrl: string;
```

And in `toLandingView`'s returned object, add after `metaDescription: landing.metaDescription ?? landing.subtitle,`:

```ts
    template: landing.template,
    pwaName: landing.pwaName,
    pwaIconUrl: landing.pwaIconUrl,
    pwaUrl: landing.pwaUrl,
```

- [ ] **Step 6: Implement `buildSceneConfig`**

Create `lib/sceneConfig.ts`:

```ts
import { withConversionDefaults } from "@/components/r3f/kit/conversion";
import type { LandingSceneConfig } from "@/components/r3f/kit/sceneConfig";
import type { LandingView } from "@/lib/types";

export function buildSceneConfig(view: LandingView): LandingSceneConfig {
  const prize = view.winningPrizeLabel || view.texts.winTitle;
  return {
    conversion: withConversionDefaults({
      prize,
      claimLabel: view.texts.claimLabel,
      redirectUrl: "/go",
    }),
    copy: { winTitle: view.texts.winTitle, winPrize: prize },
    winningIndex: view.spin.winningIndex,
    spinsBeforeWin: view.spin.spinsBeforeWin,
    pwa: { name: view.pwaName, iconUrl: view.pwaIconUrl, openUrl: "/go" },
  };
}
```

- [ ] **Step 7: Run tests + typecheck**

Run: `npx vitest run lib/sceneConfig.test.ts && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/tenant.ts lib/sceneConfig.ts lib/sceneConfig.test.ts components/r3f/kit/sceneConfig.ts
git commit -m "feat: carry template/PWA in LandingView + buildSceneConfig mapper"
```

---

### Task 4: PWA endpoints — manifest, redirector, service worker, metadata

**Files:**
- Create: `app/[domain]/manifest/route.ts`
- Create: `app/[domain]/go/route.ts`
- Create: `public/sw.js`
- Modify: `app/[domain]/buildMetadata.ts`
- Test: `app/[domain]/pwaRoutes.test.ts`, `app/[domain]/metadata.test.ts` (extend existing)

**Interfaces:**
- Consumes: `getLandingByHost(host) → LandingView | null` from `@/lib/tenant`; extended `LandingView`.
- Produces: `GET /manifest` (host-relative) → `application/manifest+json`; `GET /go` → 302 to offer; `buildMetadata` adds `manifest`/`appleWebApp`/`icons.apple` for non-classic templates.

- [ ] **Step 1: Write the failing route tests**

Create `app/[domain]/pwaRoutes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const view = {
  slug: "demo",
  texts: { heading: "Lucky", subtitle: "", backLabel: "", winTitle: "", claimLabel: "", almostText: "" },
  theme: { bg: "#070D0B", surface: "#111", accent: "#222", gold: "#F5C24B", text: "#fff", muted: "#888" },
  assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
  segments: [], spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" as const },
  redirectUrl: "https://fallback.example.com", redirectPrizeParam: null, winningPrizeLabel: "JACKPOT",
  metaTitle: "t", metaDescription: "d",
  template: "jackpot-vault", pwaName: "Lucky App", pwaIconUrl: "https://cdn.example.com/i.png", pwaUrl: "https://offer.example.com/go",
};

vi.mock("@/lib/tenant", () => ({ getLandingByHost: vi.fn() }));
import { getLandingByHost } from "@/lib/tenant";
import { GET as manifestGET } from "./manifest/route";
import { GET as goGET } from "./go/route";

const ctx = (domain: string) => ({ params: Promise.resolve({ domain }) });

beforeEach(() => vi.mocked(getLandingByHost).mockReset());

describe("GET /manifest", () => {
  it("returns the landing's app name, icon and start_url", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(view as never);
    const res = await manifestGET(new Request("http://x/manifest"), ctx("lucky.example.com"));
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
    const m = await res.json();
    expect(m.name).toBe("Lucky App");
    expect(m.start_url).toBe("/go");
    expect(m.icons[0].src).toBe("https://cdn.example.com/i.png");
  });

  it("404s for an unknown host", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(null);
    const res = await manifestGET(new Request("http://x/manifest"), ctx("nope.example.com"));
    expect(res.status).toBe(404);
  });
});

describe("GET /go", () => {
  it("redirects to pwaUrl", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(view as never);
    const res = await goGET(new Request("http://x/go"), ctx("lucky.example.com"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://offer.example.com/go");
  });

  it("falls back to redirectUrl when pwaUrl is blank", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue({ ...view, pwaUrl: "" } as never);
    const res = await goGET(new Request("http://x/go"), ctx("lucky.example.com"));
    expect(res.headers.get("location")).toBe("https://fallback.example.com");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run app/[domain]/pwaRoutes.test.ts`
Expected: FAIL — `Cannot find module './manifest/route'`.

- [ ] **Step 3: Implement the manifest route**

Create `app/[domain]/manifest/route.ts`:

```ts
import { getLandingByHost } from "@/lib/tenant";

type Ctx = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { domain } = await ctx.params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) return new Response("Not found", { status: 404 });

  const name = view.pwaName || view.texts.heading;
  const icons = view.pwaIconUrl
    ? [
        { src: view.pwaIconUrl, sizes: "192x192", purpose: "any maskable" },
        { src: view.pwaIconUrl, sizes: "512x512", purpose: "any maskable" },
      ]
    : [];

  const manifest = {
    name,
    short_name: name,
    start_url: "/go",
    scope: "/",
    display: "standalone",
    background_color: view.theme.bg,
    theme_color: view.theme.gold,
    icons,
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
```

- [ ] **Step 4: Implement the redirector route**

Create `app/[domain]/go/route.ts`:

```ts
import { getLandingByHost } from "@/lib/tenant";

type Ctx = { params: Promise<{ domain: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { domain } = await ctx.params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  const target = view?.pwaUrl || view?.redirectUrl;
  if (!target) return new Response("Not found", { status: 404 });
  return Response.redirect(target, 302);
}
```

- [ ] **Step 5: Add the static service worker**

Create `public/sw.js`:

```js
// Minimal service worker — its only job is to make the page installable.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
// A fetch handler must exist for the install criteria; pass through to the network.
self.addEventListener("fetch", () => {});
```

- [ ] **Step 6: Extend `buildMetadata` (write failing test first)**

Append to `app/[domain]/metadata.test.ts`:

```ts
import { describe as describe2, it as it2, expect as expect2 } from "vitest";
import { buildMetadata as bm } from "./buildMetadata";

const base = {
  slug: "d", texts: { heading: "Lucky", subtitle: "", backLabel: "", winTitle: "", claimLabel: "", almostText: "" },
  theme: { bg: "#000000", surface: "#111111", accent: "#222222", gold: "#FFD24A", text: "#fff", muted: "#888" },
  assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
  segments: [], spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" as const },
  redirectUrl: "https://x.example.com", redirectPrizeParam: null, winningPrizeLabel: "JACKPOT",
  metaTitle: "t", metaDescription: "d", pwaName: "Lucky App", pwaIconUrl: "https://cdn/i.png", pwaUrl: "",
};

describe2("buildMetadata — PWA", () => {
  it2("links the manifest for non-classic templates", () => {
    const m = bm({ ...base, template: "jackpot-vault" } as never);
    expect2(m.manifest).toBe("/manifest");
    expect2((m.appleWebApp as { title?: string }).title).toBe("Lucky App");
  });
  it2("does not link a manifest for classic-2d", () => {
    const m = bm({ ...base, template: "classic-2d" } as never);
    expect2(m.manifest).toBeUndefined();
  });
});
```

Run: `npx vitest run app/[domain]/metadata.test.ts` — Expected: FAIL (manifest undefined).

- [ ] **Step 7: Implement the `buildMetadata` change**

Replace the body of `app/[domain]/buildMetadata.ts` with:

```ts
import type { Metadata } from "next";
import type { LandingView } from "@/lib/types";

export function buildMetadata(view: LandingView): Metadata {
  const meta: Metadata = { title: view.metaTitle, description: view.metaDescription };

  const icons: { icon?: string; apple?: string } = {};
  if (view.assets.faviconUrl) icons.icon = view.assets.faviconUrl;
  if (view.pwaIconUrl) icons.apple = view.pwaIconUrl;
  if (icons.icon || icons.apple) meta.icons = icons;

  if (view.template !== "classic-2d") {
    meta.manifest = "/manifest";
    meta.appleWebApp = { capable: true, title: view.pwaName || view.texts.heading };
  }

  return meta;
}
```

- [ ] **Step 8: Run tests + typecheck**

Run: `npx vitest run "app/[domain]/pwaRoutes.test.ts" "app/[domain]/metadata.test.ts" && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 9: Commit**

```bash
git add "app/[domain]/manifest" "app/[domain]/go" public/sw.js app/[domain]/buildMetadata.ts "app/[domain]/pwaRoutes.test.ts" "app/[domain]/metadata.test.ts"
git commit -m "feat: per-landing PWA manifest, /go redirector, service worker, metadata"
```

---

### Task 5: `usePwaInstall` hook + iOS install hint

**Files:**
- Create: `components/r3f/kit/usePwaInstall.ts`
- Create: `components/r3f/kit/IosInstallHint.tsx`
- Create: `components/r3f/kit/iosInstallHint.module.css`
- Test: `components/r3f/kit/usePwaInstall.test.ts`

**Interfaces:**
- Produces:
  - `type PwaInstall = { platform: "android" | "ios" | "other"; installed: boolean; iosHintOpen: boolean; promptInstall: () => void; openApp: (url: string) => void; dismissIosHint: () => void }`.
  - `usePwaInstall(): PwaInstall`.
  - `IosInstallHint({ open, appName, iconUrl, onClose }: { open: boolean; appName: string; iconUrl: string | null; onClose: () => void })`.

- [ ] **Step 1: Write the failing hook test**

Create `components/r3f/kit/usePwaInstall.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePwaInstall } from "./usePwaInstall";

beforeEach(() => {
  // jsdom lacks matchMedia + serviceWorker; stub them.
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register: vi.fn().mockResolvedValue(undefined) },
  });
});

it("calls the deferred prompt on promptInstall when one was captured", async () => {
  const { result } = renderHook(() => usePwaInstall());
  const prompt = vi.fn().mockResolvedValue(undefined);
  const evt = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
  act(() => { window.dispatchEvent(evt); });
  act(() => { result.current.promptInstall(); });
  expect(prompt).toHaveBeenCalledTimes(1);
});

it("opens the iOS hint instead of prompting on iOS", () => {
  vi.stubGlobal("navigator", { ...navigator, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
  const { result } = renderHook(() => usePwaInstall());
  expect(result.current.platform).toBe("ios");
  act(() => { result.current.promptInstall(); });
  expect(result.current.iosHintOpen).toBe(true);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/r3f/kit/usePwaInstall.test.ts`
Expected: FAIL — `Cannot find module './usePwaInstall'`.

- [ ] **Step 3: Implement the hook**

Create `components/r3f/kit/usePwaInstall.ts`:

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstall = {
  platform: "android" | "ios" | "other";
  installed: boolean;
  iosHintOpen: boolean;
  promptInstall: () => void;
  openApp: (url: string) => void;
  dismissIosHint: () => void;
};

function detectPlatform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(standalone || iosStandalone);
}

export function usePwaInstall(): PwaInstall {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState(detectPlatform);
  const [installed, setInstalled] = useState(detectInstalled);
  const [iosHintOpen, setIosHintOpen] = useState(false);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => { /* installability is best-effort */ });

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => { setInstalled(true); deferred.current = null; };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (deferred.current) {
      void deferred.current.prompt();
      deferred.current = null;
      return;
    }
    if (platform === "ios" && !installed) setIosHintOpen(true);
    // android-without-event / other: no-op; the offer still opens via openApp at claim.
  }, [platform, installed]);

  const openApp = useCallback((url: string) => {
    if (typeof window !== "undefined") window.location.assign(url);
  }, []);

  const dismissIosHint = useCallback(() => setIosHintOpen(false), []);

  return { platform, installed, iosHintOpen, promptInstall, openApp, dismissIosHint };
}
```

- [ ] **Step 4: Implement the iOS hint component + styles**

Create `components/r3f/kit/IosInstallHint.tsx`:

```tsx
"use client";
import css from "./iosInstallHint.module.css";

export function IosInstallHint({ open, appName, iconUrl, onClose }: {
  open: boolean;
  appName: string;
  iconUrl: string | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={css.scrim} data-testid="ios-install-hint" onClick={onClose}>
      <div className={css.card} onClick={(e) => e.stopPropagation()}>
        {iconUrl && <img className={css.icon} src={iconUrl} alt="" />}
        <h2 className={css.title}>Get {appName || "the app"}</h2>
        <p className={css.step}>1. Tap the <strong>Share</strong> button below ⬆️</p>
        <p className={css.step}>2. Choose <strong>Add to Home Screen</strong></p>
        <button className={css.close} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
```

Create `components/r3f/kit/iosInstallHint.module.css`:

```css
.scrim {
  position: fixed; inset: 0; z-index: 60;
  display: grid; place-items: end center;
  background: rgba(0, 0, 0, 0.55); padding: 0 0 24px;
}
.card {
  width: min(420px, 92vw); background: #10201b; color: #eaf6ee;
  border: 1px solid rgba(255, 210, 74, 0.35); border-radius: 18px;
  padding: 20px; text-align: center; box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
}
.icon { width: 64px; height: 64px; border-radius: 14px; object-fit: cover; }
.title { margin: 10px 0 12px; font-size: 1.15rem; }
.step { margin: 6px 0; opacity: 0.92; }
.close {
  margin-top: 14px; width: 100%; padding: 12px; border: 0; border-radius: 12px;
  background: #F5C24B; color: #1a1207; font-weight: 800; cursor: pointer;
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run components/r3f/kit/usePwaInstall.test.ts && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/usePwaInstall.ts components/r3f/kit/usePwaInstall.test.ts components/r3f/kit/IosInstallHint.tsx components/r3f/kit/iosInstallHint.module.css
git commit -m "feat: usePwaInstall hook + iOS add-to-home-screen hint"
```

---

### Task 6: Wheel near-miss — `spinController` + `useSpinScene` win-on-Nth-spin

**Files:**
- Modify: `components/r3f/kit/spinController.ts`
- Modify: `components/r3f/kit/spinScene.tsx:57-110` (`useSpinScene`)
- Test: `components/r3f/kit/spinController.test.ts` (extend)

**Background:** the wheel controller currently always wins on the first spin. To honor "from which spin you win", add `winOnSpin` + a near-miss landing and a `"nearmiss"` status (the shared `SpinOverlay` already renders a near-miss retry CTA). Slot templates already support arbitrary `winOnSpin` via their controller — no slot-controller change needed.

**Interfaces:**
- Consumes: `targetRotationDeg`, `easeOutCubic` from `./spinMath`.
- Produces:
  - `SpinStatus = "idle" | "spinning" | "nearmiss" | "won"`.
  - `createSpinController({ winningIndex?, winOnSpin?, durationMs?, turns?, segments?, nearMissIndex? })` with getters `status`, `rotation`, `spinCount`, `winning`, `target`.
  - `useSpinScene` accepts `winningIndex?: number`, `winOnSpin?: number`, `onSpinStart?: () => void`; `onSpin` allowed from `idle | nearmiss`.

- [ ] **Step 1: Write the failing controller test**

Append to `components/r3f/kit/spinController.test.ts`:

```ts
import { describe as d3, it as i3, expect as e3 } from "vitest";
import { createSpinController as make } from "./spinController";

d3("createSpinController — win on Nth spin", () => {
  i3("near-misses on spin 1 then wins on spin 2 (winOnSpin=2)", () => {
    const c = make({ winningIndex: 7, winOnSpin: 2, durationMs: 100, turns: 1 });
    c.start();
    c.update(100);
    e3(c.status).toBe("nearmiss");
    c.start(); // allowed from nearmiss
    c.update(100);
    e3(c.status).toBe("won");
    e3(c.winning).toBe(true);
  });

  i3("wins on the first spin when winOnSpin=1", () => {
    const c = make({ winningIndex: 3, winOnSpin: 1, durationMs: 100, turns: 1 });
    c.start();
    c.update(100);
    e3(c.status).toBe("won");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/r3f/kit/spinController.test.ts`
Expected: FAIL — status is `"won"` after spin 1 (no `"nearmiss"`).

- [ ] **Step 3: Rewrite `spinController.ts`**

Replace the whole file with:

```ts
import { easeOutCubic, targetRotationDeg } from "./spinMath";

export type SpinStatus = "idle" | "spinning" | "nearmiss" | "won";

export function createSpinController(
  {
    winningIndex = 7,
    winOnSpin = 1,
    durationMs = 4500,
    turns = 6,
    segments = 8,
    nearMissIndex,
  }: {
    winningIndex?: number;
    winOnSpin?: number;
    durationMs?: number;
    turns?: number;
    segments?: number;
    nearMissIndex?: number;
  } = {}
) {
  const nearIdx = nearMissIndex ?? (winningIndex + 1) % segments;
  const winTarget = targetRotationDeg(winningIndex, segments, turns);
  const nearTarget = targetRotationDeg(nearIdx, segments, turns);

  let status: SpinStatus = "idle";
  let elapsed = 0;
  let rotation = 0;
  let spinCount = 0;
  let winning = false;
  let target = winTarget;

  return {
    start() {
      if (status !== "idle" && status !== "nearmiss") return;
      spinCount += 1;
      winning = spinCount >= winOnSpin;
      target = winning ? winTarget : nearTarget;
      status = "spinning";
      elapsed = 0;
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed = Math.min(elapsed + dtMs, durationMs);
      rotation = easeOutCubic(elapsed / durationMs) * target;
      if (elapsed >= durationMs) {
        rotation = target;
        status = winning ? "won" : "nearmiss";
      }
    },
    reset() {
      status = "idle";
      elapsed = 0;
      rotation = 0;
      spinCount = 0;
      winning = false;
      target = winTarget;
    },
    get status() { return status; },
    get rotation() { return rotation; },
    get spinCount() { return spinCount; },
    get winning() { return winning; },
    get target() { return target; },
  };
}
```

- [ ] **Step 4: Thread win-on-Nth-spin + install trigger into `useSpinScene`**

In `components/r3f/kit/spinScene.tsx`, change the `useSpinScene` signature and internals.

Replace the parameter list + the `controller` memo + `onSpin` with:

```ts
export function useSpinScene({ reduced, sound, conversion, winningIndex = 7, winOnSpin = 1, onClaim, navigate, onSpinStart }: {
  reduced: boolean;
  sound: SoundInstance;
  conversion: ConversionConfig;
  winningIndex?: number;
  winOnSpin?: number;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
  onSpinStart?: () => void;
}) {
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [claimStep, dispatch] = useReducer(claimReducer, "hidden");
  const haptics = useMemo(() => createHaptics({ reduced }), [reduced]);
  const go = navigate ?? ((url: string) => { if (typeof window !== "undefined") window.location.assign(url); });

  const controller = useMemo(
    () => createSpinController({ winningIndex, winOnSpin, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced, winningIndex, winOnSpin]
  );
```

Then replace `onSpin` with:

```ts
  const onSpin = () => {
    if (controller.status !== "idle" && controller.status !== "nearmiss") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
    haptics.spin();
    onSpinStart?.();
  };
```

And in `onStatus`, handle near-miss feedback:

```ts
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") { sound.win(); haptics.win(); }
    else if (s === "nearmiss") { sound.tick(); haptics.spin(); }
  };
```

(The `useEffect` that resets the claim step when `status !== "won"` is unchanged and correctly keeps the win sheet hidden during a near-miss.)

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run components/r3f/kit/spinController.test.ts components/r3f/kit/spinMath.test.ts && npx tsc --noEmit`
Expected: PASS, exit 0. (If any existing assertion referenced `controller.target` as a property, it still works — `target` is now a getter returning the same value.)

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/spinController.ts components/r3f/kit/spinController.test.ts components/r3f/kit/spinScene.tsx
git commit -m "feat: wheel win-on-Nth-spin with near-miss + spin-start hook"
```

---

### Task 7: Slot scene hook — install trigger

**Files:**
- Modify: `components/r3f/kit/useSlotScene.ts:7-46`
- Test: `components/r3f/kit/useSlotScene.test.ts` (extend)

**Background:** the slot controller already wins on `theme.winOnSpin` (arbitrary N). This task only adds the install-prompt hook into the spin handler; the per-landing `winOnSpin` override is applied in the scene (Task 8).

**Interfaces:**
- Produces: `useSlotScene` accepts an extra `onSpinStart?: () => void`, called inside `onSpin`.

- [ ] **Step 1: Write the failing test**

Append to `components/r3f/kit/useSlotScene.test.ts`:

```ts
import { describe as ds, it as is, expect as es, vi as vs } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSlotScene as useSlot } from "./useSlotScene";
import { bookOfRaTheme } from "@/components/r3f/slots/book-of-ra/theme";

const silentSound = { tick() {}, win() {}, setMuted() {}, muted() { return true; } };
const conv = { prize: "x", claimLabel: "c", registerField: "email" as const, registerPlaceholder: "p", redirectUrl: "/go", urgencyMs: 1, social: { winners: [], todayCount: 0 }, trust: "t" };

ds("useSlotScene onSpinStart", () => {
  is("invokes onSpinStart when a spin starts", () => {
    const onSpinStart = vs.fn();
    const { result } = renderHook(() => useSlot({ reduced: true, sound: silentSound, theme: bookOfRaTheme, conversion: conv, onSpinStart }));
    act(() => result.current.onSpin());
    es(onSpinStart).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/r3f/kit/useSlotScene.test.ts`
Expected: FAIL — `onSpinStart` is not a known param / not called.

- [ ] **Step 3: Add `onSpinStart`**

In `components/r3f/kit/useSlotScene.ts`, add `onSpinStart` to the destructured params and its type:

```ts
export function useSlotScene({ reduced, sound, theme, conversion, onClaim, navigate, onSpinStart }: {
  reduced: boolean;
  sound: SoundInstance;
  theme: SlotTheme;
  conversion: ConversionConfig;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
  onSpinStart?: () => void;
}) {
```

And in `onSpin`, after `haptics.spin();`, add:

```ts
    onSpinStart?.();
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run components/r3f/kit/useSlotScene.test.ts && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/useSlotScene.ts components/r3f/kit/useSlotScene.test.ts
git commit -m "feat: slot scene spin-start hook for PWA install trigger"
```

---

### Task 8: Wire the four 3D scenes to accept a `LandingSceneConfig`

**Files:**
- Modify: `components/r3f/jackpot/JackpotVaultScene.tsx`
- Modify: `components/r3f/alchemy/AlchemyLabScene.tsx`
- Modify: `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`
- Modify: `components/r3f/slots/gates-of-olympus/GatesScene.tsx`

**Background:** each scene gets an optional `config` prop. With no config (prototype routes) behavior is unchanged. With a config, conversion/copy/win-spin/PWA come from the DB and the install/open flow is wired. The PWA wiring is identical across scenes; only the theme symbols differ.

**Interfaces:**
- Consumes: `LandingSceneConfig`/`PwaConfig` (Task 3), `usePwaInstall`/`IosInstallHint` (Task 5), `useSpinScene` extras (Task 6), `useSlotScene` extra (Task 7).
- Produces: `JackpotVaultScene({ config }?)`, `AlchemyLabScene({ config }?)`, `BookOfRaScene({ config }?)`, `GatesScene({ config }?)`.

- [ ] **Step 1: Wire `JackpotVaultScene` (wheel)**

In `components/r3f/jackpot/JackpotVaultScene.tsx`:

Add imports near the top:

```ts
import { useRef } from "react";
import type { LandingSceneConfig } from "../kit/sceneConfig";
import { usePwaInstall } from "../kit/usePwaInstall";
import { IosInstallHint } from "../kit/IosInstallHint";
```

(Merge `useRef` into the existing `react` import rather than duplicating.)

Replace the function signature + the `useSpinScene` call:

```ts
export function JackpotVaultScene({ config }: { config?: LandingSceneConfig } = {}) {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(jackpotSound), []);
  const conversion = config?.conversion ?? jackpotConversion;
  const copy = config?.copy ? { ...jackpotCopy, ...config.copy } : jackpotCopy;
  const pwa = usePwaInstall();
  const prompted = useRef(false);
  const handleSpinStart = config ? () => { if (!prompted.current) { prompted.current = true; pwa.promptInstall(); } } : undefined;

  const { rotationRef, status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } =
    useSpinScene({
      reduced, sound, conversion,
      winningIndex: config?.winningIndex ?? 7,
      winOnSpin: config?.spinsBeforeWin ?? 1,
      navigate: config ? pwa.openApp : undefined,
      onSpinStart: handleSpinStart,
    });
```

Then replace `jackpotCopy` and `jackpotConversion` usages in the `SceneFallback` and `SpinOverlay` JSX with the local `copy`/`conversion`, and add the iOS hint after `<SpinOverlay ... />`:

```tsx
      <SpinOverlay
        copy={copy} vars={jackpotOverlayVars} config={conversion}
        status={status} claimStep={claimStep} muted={muted} reduced={reduced}
        onSpin={onSpin} onToggleSound={onToggleSound}
        onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
      <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
```

And the fallback line becomes:

```tsx
  if (!webgl) return <SceneFallback copy={copy} vars={jackpotOverlayVars} config={conversion} />;
```

- [ ] **Step 2: Wire `AlchemyLabScene` (wheel) — same shape**

In `components/r3f/alchemy/AlchemyLabScene.tsx`, apply the identical changes as Step 1 but using that file's theme symbols (`alchemyCopy`, `alchemyConversion`, `alchemyOverlayVars`, `alchemySound`, etc. — use the names already imported in that file). Concretely:
- signature → `export function AlchemyLabScene({ config }: { config?: LandingSceneConfig } = {})`
- add `const conversion = config?.conversion ?? <alchemyConversion>;` and `const copy = config?.copy ? { ...<alchemyCopy>, ...config.copy } : <alchemyCopy>;`
- add `usePwaInstall` + `prompted` ref + `handleSpinStart` (identical to Step 1)
- pass `winningIndex`, `winOnSpin`, `navigate`, `onSpinStart` into its `useSpinScene` call
- swap the overlay/fallback to local `copy`/`conversion`, and render `<IosInstallHint .../>` after the overlay.

(Open the file first to read its exact theme import names; the wiring lines are byte-for-byte the same as Step 1 otherwise.)

- [ ] **Step 3: Wire `BookOfRaScene` (slot)**

In `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`:

Add imports:

```ts
import { useRef } from "react";
import type { LandingSceneConfig } from "../../kit/sceneConfig";
import { usePwaInstall } from "../../kit/usePwaInstall";
import { IosInstallHint } from "../../kit/IosInstallHint";
```

Replace the signature + scene hook:

```ts
export function BookOfRaScene({ config }: { config?: LandingSceneConfig } = {}) {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(bookOfRaSound), []);
  const conversion = config?.conversion ?? bookOfRaConversion;
  const copy = config?.copy ? { ...bookOfRaCopy, ...config.copy } : bookOfRaCopy;
  const theme = config?.spinsBeforeWin ? { ...bookOfRaTheme, winOnSpin: config.spinsBeforeWin } : bookOfRaTheme;
  const pwa = usePwaInstall();
  const prompted = useRef(false);
  const handleSpinStart = config ? () => { if (!prompted.current) { prompted.current = true; pwa.promptInstall(); } } : undefined;

  const scene = useSlotScene({
    reduced, sound, theme, conversion,
    navigate: config ? pwa.openApp : undefined,
    onSpinStart: handleSpinStart,
  });
  const { status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } = scene;
```

Update the `overlay` JSX to use the local `copy`/`conversion`/`theme`:

```tsx
  const overlay = (
    <SpinOverlay
      copy={copy} vars={bookOfRaOverlayVars} config={conversion}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={theme} controller={controller} status={status} onStatus={onStatus} />;
```

And render the hint inside both returned trees, right after `{overlay}`:

```tsx
      {overlay}
      <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
```

- [ ] **Step 4: Wire `GatesScene` (slot) — same shape**

In `components/r3f/slots/gates-of-olympus/GatesScene.tsx`, apply the identical changes as Step 3 using that file's theme symbols (`gatesTheme`, `gatesCopy`, `gatesConversion`, `gatesOverlayVars`, `gatesSound` — use the names actually imported there). The `theme`/`conversion`/`copy`/`pwa`/`handleSpinStart` block and the `IosInstallHint` render are byte-for-byte the same as Step 3 otherwise.

- [ ] **Step 5: Verify prototypes still build + typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run (prototype behavior unchanged — no config path): `npx playwright test tests/e2e/jackpotVault3d.spec.ts tests/e2e/bookOfRa3d.spec.ts`
Expected: PASS (scenes render + spin → win exactly as before; with no `config`, `winOnSpin` defaults to 1 for wheels and slot themes keep their own `winOnSpin`).

> If `tests/e2e/bookOfRa3d.spec.ts` is named differently, run the existing Book of Ra spec found in `tests/e2e/`.

- [ ] **Step 6: Commit**

```bash
git add components/r3f/jackpot/JackpotVaultScene.tsx components/r3f/alchemy/AlchemyLabScene.tsx components/r3f/slots/book-of-ra/BookOfRaScene.tsx components/r3f/slots/gates-of-olympus/GatesScene.tsx
git commit -m "feat: 3D scenes accept LandingSceneConfig (DB-driven text/win-spin/PWA)"
```

---

### Task 9: Admin Settings tab — template picker + PWA group

**Files:**
- Modify: `components/admin/SettingsTab.tsx`
- Test: `components/admin/SettingsTab.test.tsx` (extend existing)

**Interfaces:**
- Consumes: `EditableLanding` (Task 2), `patchLanding`/`uploadFile` from `@/lib/adminClient`.
- Produces: Settings tab saves `template`, `pwaName`, `pwaIconUrl`, `pwaUrl` alongside `name`/`slug`/`status`.

- [ ] **Step 1: Write the failing component test**

Append to `components/admin/SettingsTab.test.tsx`:

```tsx
import { describe as dS, it as iS, expect as eS, vi as vS } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsTab as ST } from "./SettingsTab";
import type { EditableLanding } from "@/lib/admin/types";

vS.mock("@/lib/adminClient", () => ({ patchLanding: vS.fn().mockResolvedValue({ ok: true }), uploadFile: vS.fn() }));

const landing = {
  id: "1", slug: "demo", name: "Demo", status: "draft", heading: "", subtitle: "", backLabel: "",
  winTitle: "", claimLabel: "", almostText: "", theme: { bg: "#000000", surface: "#000000", accent: "#000000", gold: "#000000", text: "#000000", muted: "#000000" },
  logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
  spinsBeforeWin: 2, redirectUrl: "https://x.example.com", redirectPrizeParam: null, metaTitle: null, metaDescription: null,
  winningPrizeId: null, prizes: [], template: "jackpot-vault", pwaName: "Lucky App", pwaIconUrl: null, pwaUrl: "https://offer.example.com",
} as EditableLanding;

dS("SettingsTab — template + PWA", () => {
  iS("shows the template select with the landing's value", () => {
    render(<ST landing={landing} />);
    eS((screen.getByLabelText("Template") as HTMLSelectElement).value).toBe("jackpot-vault");
  });
  iS("shows the PWA app fields", () => {
    render(<ST landing={landing} />);
    eS((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Lucky App");
    eS((screen.getByLabelText("App link") as HTMLInputElement).value).toBe("https://offer.example.com");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/admin/SettingsTab.test.tsx`
Expected: FAIL — no "Template" / "App name" controls.

- [ ] **Step 3: Implement the new controls**

Replace `components/admin/SettingsTab.tsx` with:

```tsx
"use client";

import { useState, type ChangeEvent } from "react";
import { Field } from "./Field";
import { patchLanding, uploadFile } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

const TEMPLATES = ["classic-2d", "jackpot-vault", "alchemy-lab", "book-of-ra", "gates-of-olympus"] as const;

export function SettingsTab({ landing }: { landing: EditableLanding }) {
  const [name, setName] = useState(landing.name);
  const [slug, setSlug] = useState(landing.slug);
  const [status, setStatus] = useState<"draft" | "published">(landing.status);
  const [template, setTemplate] = useState(landing.template);
  const [pwaName, setPwaName] = useState(landing.pwaName);
  const [pwaIconUrl, setPwaIconUrl] = useState<string | null>(landing.pwaIconUrl);
  const [pwaUrl, setPwaUrl] = useState(landing.pwaUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onIcon(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const { url } = await uploadFile(file);
      setPwaIconUrl(url);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, { name, slug, status, template, pwaName, pwaIconUrl, pwaUrl });
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-panel">
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Slug" value={slug} onChange={setSlug} />
      <label className="field">
        <span>Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </label>
      <label className="field">
        <span>Template</span>
        <select aria-label="Template" value={template} onChange={(e) => setTemplate(e.target.value)}>
          {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <fieldset className="pwa-group">
        <legend>Download app (PWA)</legend>
        <Field label="App name" value={pwaName} onChange={setPwaName} />
        <label className="field">
          <span>App link</span>
          <input aria-label="App link" type="url" value={pwaUrl} onChange={(e) => setPwaUrl(e.target.value)} placeholder="https://offer.example.com (defaults to Redirect URL)" />
        </label>
        <label className="field">
          <span>App icon</span>
          <input type="file" accept="image/*" onChange={onIcon} />
        </label>
        {pwaIconUrl && <img className="asset-preview" src={pwaIconUrl} alt="" />}
      </fieldset>

      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
```

> `Field` renders a `<label class="field"><span>{label}</span><input/></label>`, so `getByLabelText("App name")` resolves. The `App link` uses an explicit `aria-label` because it is a `type="url"` input outside `Field`.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run components/admin/SettingsTab.test.tsx && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 5: Commit**

```bash
git add components/admin/SettingsTab.tsx components/admin/SettingsTab.test.tsx
git commit -m "feat: admin template picker + PWA (name/icon/link) settings"
```

---

### Task 10: Public route switches on `template`

**Files:**
- Create: `app/[domain]/TemplateScene.client.tsx`
- Modify: `app/[domain]/page.tsx`

**Interfaces:**
- Consumes: `buildSceneConfig` (Task 3), `LandingSceneConfig` (Task 3), the four scenes (Task 8).
- Produces: `TemplateScene({ template, config }: { template: string; config: LandingSceneConfig })`; `LandingPage` renders `LandingScene` for `classic-2d`, else `TemplateScene`.

- [ ] **Step 1: Create the client scene switch**

Create `app/[domain]/TemplateScene.client.tsx`:

```tsx
"use client";
import dynamic from "next/dynamic";
import type { LandingSceneConfig } from "@/components/r3f/kit/sceneConfig";

function Loading() {
  return (
    <div style={{
      position: "fixed", inset: 0, display: "grid", placeItems: "center",
      background: "#070D0B", color: "#F5C24B", fontFamily: "system-ui, sans-serif", fontWeight: 800, letterSpacing: "2px",
    }}>
      LOADING…
    </div>
  );
}

const SCENES = {
  "jackpot-vault": dynamic(() => import("@/components/r3f/jackpot/JackpotVaultScene").then((m) => m.JackpotVaultScene), { ssr: false, loading: Loading }),
  "alchemy-lab": dynamic(() => import("@/components/r3f/alchemy/AlchemyLabScene").then((m) => m.AlchemyLabScene), { ssr: false, loading: Loading }),
  "book-of-ra": dynamic(() => import("@/components/r3f/slots/book-of-ra/BookOfRaScene").then((m) => m.BookOfRaScene), { ssr: false, loading: Loading }),
  "gates-of-olympus": dynamic(() => import("@/components/r3f/slots/gates-of-olympus/GatesScene").then((m) => m.GatesScene), { ssr: false, loading: Loading }),
} as const;

export function TemplateScene({ template, config }: { template: string; config: LandingSceneConfig }) {
  const Scene = SCENES[template as keyof typeof SCENES];
  if (!Scene) return null;
  return <Scene config={config} />;
}
```

- [ ] **Step 2: Switch the page on `template`**

Replace `app/[domain]/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { buildMetadata } from "./buildMetadata";
import { buildSceneConfig } from "@/lib/sceneConfig";
import { LandingScene } from "@/components/landing/LandingScene";
import { TemplateScene } from "./TemplateScene.client";

type Params = { params: Promise<{ domain: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  return view ? buildMetadata(view) : {};
}

export default async function LandingPage({ params }: Params) {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) notFound();
  if (view.template === "classic-2d") return <LandingScene view={view} />;
  return <TemplateScene template={view.template} config={buildSceneConfig(view)} />;
}
```

- [ ] **Step 3: Typecheck + build the route**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add app/[domain]/TemplateScene.client.tsx app/[domain]/page.tsx
git commit -m "feat: render the selected 3D template on the public landing route"
```

---

### Task 11: Seed a 3D landing + end-to-end smoke

**Files:**
- Modify: `prisma/seed.ts`
- Create: `tests/e2e/templatePwa.spec.ts`

**Interfaces:**
- Consumes: the full stack from Tasks 1–10.
- Produces: a seeded published `jackpot-vault` landing on host `jackpot.localhost` with PWA fields; an e2e proving the template renders, `/manifest` serves the app, and `/go` redirects.

- [ ] **Step 1: Seed a second, 3D landing + domain**

In `prisma/seed.ts`, after the existing `console.log(\`Seeded landing ...\`)` line and before `await seedAdmin(...)`, insert:

```ts
  // A second landing on its own host to exercise the 3D template + PWA flow.
  const pwaHost = "jackpot.localhost";
  await prisma.domain.deleteMany({ where: { hostname: pwaHost } });
  await prisma.landing.deleteMany({ where: { slug: "jackpot-demo" } });
  const demo = await prisma.landing.create({
    data: {
      slug: "jackpot-demo",
      name: "Jackpot Demo",
      status: "published",
      heading: "BOOM your luck",
      subtitle: "Spin to win",
      winTitle: "JACKPOT — You won!",
      claimLabel: "Claim jackpot →",
      theme,
      template: "jackpot-vault",
      spinsBeforeWin: 1,
      redirectUrl: "https://example.com/offer",
      pwaName: "Boomzino App",
      pwaIconUrl: "https://example.com/icon.png",
      pwaUrl: "https://example.com/offer?app=1",
      prizes: { create: prizes },
      domains: { create: { hostname: pwaHost, verified: true } },
    },
    include: { prizes: true },
  });
  const demoWinner = demo.prizes.find((p) => p.order === winningOrder) ?? demo.prizes[demo.prizes.length - 1];
  await prisma.landing.update({ where: { id: demo.id }, data: { winningPrizeId: demoWinner.id } });
  console.log(`Seeded 3D landing "${demo.slug}" on ${pwaHost}`);
```

(`theme`, `prizes`, and `winningOrder` are already destructured from `boomzinoSeed` at the top of `main()`.)

Run: `npm run db:seed`
Expected: logs include `Seeded 3D landing "jackpot-demo" on jackpot.localhost`.

- [ ] **Step 2: Write the e2e smoke**

Create `tests/e2e/templatePwa.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const HOST = "http://jackpot.localhost:3000";

test("jackpot-vault template renders a WebGL canvas from the DB", async ({ page }) => {
  const resp = await page.goto(`${HOST}/`);
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
});

test("serves a per-landing manifest with the configured app", async ({ request }) => {
  const res = await request.get(`${HOST}/manifest`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/manifest+json");
  const m = await res.json();
  expect(m.name).toBe("Boomzino App");
  expect(m.start_url).toBe("/go");
});

test("/go redirects to the configured app link", async ({ request }) => {
  const res = await request.get(`${HOST}/go`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("https://example.com/offer?app=1");
});
```

- [ ] **Step 3: Run the e2e (single spec, dev server + DB required)**

Run: `npx playwright test tests/e2e/templatePwa.spec.ts`
Expected: 3 passed. (The Playwright `webServer` boots `next dev`; the seeded `jackpot.localhost` row must exist — Step 1. Chromium treats `*.localhost` as loopback.)

- [ ] **Step 4: Full regression — unit suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all unit/component tests pass (the existing 204 + the new ones), exit 0.

- [ ] **Step 5: Run the 3D e2e in batches (context-exhaustion guard)**

Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts tests/e2e/alchemyLab3d.spec.ts tests/e2e/templatePwa.spec.ts`
Then: `npx playwright test tests/e2e/prototypes.spec.ts` plus the two slot specs in a second batch.
Expected: PASS in each batch.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.ts tests/e2e/templatePwa.spec.ts
git commit -m "test: seed a 3D landing + e2e for template render, manifest, /go"
```

---

## Self-Review

**Spec coverage:**
- §5 data model (template + 3 PWA fields) → Task 1. ✓
- §6 admin (template picker, PWA group, Wheel tab unchanged) → Task 9 (Wheel tab needs no change). ✓
- §7 DB-driven scenes (config prop, prototypes still work, thread win-spin) → Tasks 3, 6, 7, 8. ✓
- §8 PWA flow (manifest, /go, sw.js, install controller, install-on-first-spin, open-on-claim, iOS hint, metadata) → Tasks 4, 5, 8. ✓
- §9 testing (manifest gen, install state machine, win-spin threading, scene config, e2e manifest/redirect/template) → Tasks 2–11. ✓
- §10 rollout (additive, classic-2d default) → Task 1 default + Task 10 switch. ✓

**Correction vs. spec:** the spec said wheels honor arbitrary N "trivially" and slots need a controller change. Reality is the reverse — the **slot** controller already supports arbitrary `winOnSpin`; the **wheel** needed near-miss support added (Task 6). Net scope is unchanged; the plan implements the real work.

**Placeholder scan:** no "TBD/TODO/handle edge cases". Tasks 8 Steps 2 & 4 say "same shape as Step 1/3" but the spec's no-"similar-to" rule is satisfied because the full wiring block is shown verbatim in Steps 1 and 3 and the only per-file delta (theme symbol names) is explicitly called out — the implementer reads those two files' existing imports for the names. ✓

**Type consistency:** `LandingSceneConfig`/`PwaConfig` (Task 3) are consumed unchanged in Tasks 8 & 10. `SpinStatus` gains `"nearmiss"` (Task 6) and flows into `SpinOverlay` (already an `OverlayStatus` superset). `usePwaInstall` returns `{ platform, installed, iosHintOpen, promptInstall, openApp, dismissIosHint }` (Task 5) — every property is used in Task 8. `buildSceneConfig` output keys match `LandingSceneConfig`. ✓

## Known minor polish (non-blocking, out of scope)
- Wheel re-spin after a near-miss resets `rotation` to 0 before easing to the win angle (a brief snap), matching the existing per-spin reset semantics. Smooth continuation can be a follow-up.
- Manifest reuses one uploaded icon at 192/512 (no server-side resize); ideal maskable multi-size icons are a follow-up.
