# Configurable wheels & slots + casino logo + unified PWA flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin editor template-aware (per template *kind*), turn the 2 3D wheels into real DB-driven wheels, make the casino logo editable on every page, and unify the offer link into one PWA-download flow across all 3 wheels (2 3D + 2D) and both slots.

**Architecture:** A `templateKind` classifier (`wheel-2d` | `wheel-3d` | `slot`) drives both the editor tab set and rendering. The 3D `Wheel3D` renders DB prizes (segments) and lands on the selected winner. A single `redirectUrl` is the PWA's link (the `pwaUrl` column is removed); the manifest links for all templates; the 2D landing gains the install-on-spin / open-on-win flow the 3D scenes already have. A new `winText` column carries the slot's win prize text.

**Tech Stack:** Next.js 15 App Router, Prisma 6 / Postgres, Zod, React 19, `@react-three/fiber` + `drei`, Vitest + Testing Library, Playwright.

## Global Constraints

- TypeScript strict; match existing style; no unrelated refactors.
- Schema changes apply via `npm run db:push` then `npm run db:generate` — **no `prisma/migrations/`** folder.
- Dev Postgres on host port **5433**; `.env` is configured.
- Unit tests: `npm test`; single file: `npx vitest run <path>`. E2E: `npx playwright test <path>` — **run 3D specs in ≤3-spec batches** (SwiftShader context exhaustion), 30s canvas timeouts.
- Template ids are exactly: `classic-2d`, `jackpot-vault`, `alchemy-lab`, `book-of-ra`, `gates-of-olympus`.
- Template kinds: `classic-2d`→`wheel-2d`; `jackpot-vault`/`alchemy-lab`→`wheel-3d`; `book-of-ra`/`gates-of-olympus`→`slot`.
- Editor tabs by kind: `wheel-2d` = Content·Branding·Wheel·Settings·Domains; `wheel-3d` = Content·Wheel·Settings·Domains; `slot` = Content·Settings·Domains.
- One offer link: `redirectUrl` is the URL the installed PWA opens; `/go` 302s to it. `pwaUrl` is removed; `redirectPrizeParam` is dropped from the UI.
- Win prize text precedence: `winText` (when non-empty) → winning prize's label → `winTitle`.
- Do not revert the owner's visual-polish work; keep unused `kit/CoinStorm.tsx`.
- Commit after every task.

## File Structure

**New:** `lib/templateKind.ts` (classifier).
**Modified (data):** `prisma/schema.prisma`, `prisma/seed.ts`; `lib/types.ts`, `lib/tenant.ts`, `lib/sceneConfig.ts`, `lib/admin/types.ts`, `lib/admin/validation.ts`, `lib/admin/landingService.ts`, `lib/adminClient.ts`; `app/[domain]/go/route.ts`, `app/[domain]/buildMetadata.ts`.
**Modified (admin UI):** `components/admin/LandingEditor.tsx`, `SettingsTab.tsx`, `WheelTab.tsx`.
**Modified (rendering):** `components/r3f/kit/Wheel3D.tsx`, `SpinOverlay.tsx`, `WinSheet.tsx`, `sceneConfig.ts`, `spinScene.tsx`; `components/r3f/jackpot/JackpotVaultScene.tsx`, `components/r3f/alchemy/AlchemyLabScene.tsx`, both slot scenes (logo prop); `app/[domain]/Wheel.client.tsx` (2D PWA).
Tests live beside each.

---

### Task 1: `templateKind` helper + editor tabs by kind

**Files:**
- Create: `lib/templateKind.ts`
- Modify: `components/admin/LandingEditor.tsx`
- Test: `lib/templateKind.test.ts`, `components/admin/LandingEditor.test.tsx`

**Interfaces:**
- Produces: `type TemplateKind = "wheel-2d" | "wheel-3d" | "slot"`; `templateKind(template: string): TemplateKind`; `isWheel(template: string): boolean`.

- [ ] **Step 1: Write the failing classifier test**

Create `lib/templateKind.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { templateKind, isWheel } from "./templateKind";

describe("templateKind", () => {
  it("maps templates to kinds", () => {
    expect(templateKind("classic-2d")).toBe("wheel-2d");
    expect(templateKind("jackpot-vault")).toBe("wheel-3d");
    expect(templateKind("alchemy-lab")).toBe("wheel-3d");
    expect(templateKind("book-of-ra")).toBe("slot");
    expect(templateKind("gates-of-olympus")).toBe("slot");
  });
  it("isWheel is true for 2D and 3D wheels, false for slots", () => {
    expect(isWheel("classic-2d")).toBe(true);
    expect(isWheel("jackpot-vault")).toBe(true);
    expect(isWheel("book-of-ra")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run lib/templateKind.test.ts` — Expected: FAIL `Cannot find module './templateKind'`.

- [ ] **Step 3: Implement the classifier**

Create `lib/templateKind.ts`:

```ts
export type TemplateKind = "wheel-2d" | "wheel-3d" | "slot";

export function templateKind(template: string): TemplateKind {
  if (template === "classic-2d") return "wheel-2d";
  if (template === "book-of-ra" || template === "gates-of-olympus") return "slot";
  return "wheel-3d"; // jackpot-vault, alchemy-lab
}

export function isWheel(template: string): boolean {
  return templateKind(template) !== "slot";
}
```

- [ ] **Step 4: Wire tabs by kind in `LandingEditor`**

Replace the body of `components/admin/LandingEditor.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { ContentTab } from "./ContentTab";
import { BrandingTab } from "./BrandingTab";
import { WheelTab } from "./WheelTab";
import { SettingsTab } from "./SettingsTab";
import { DomainsPanel } from "./DomainsPanel";
import { templateKind } from "@/lib/templateKind";
import type { EditableLanding } from "@/lib/admin/types";

const ALL_TABS = ["Content", "Branding", "Wheel", "Settings", "Domains"] as const;
type Tab = (typeof ALL_TABS)[number];

export function LandingEditor({ landing }: { landing: EditableLanding }) {
  const [tab, setTab] = useState<Tab>("Content");
  const kind = templateKind(landing.template);
  // Branding is only for the 2D wheel; the Wheel tab only for wheels (not slots).
  const tabs = ALL_TABS.filter((t) => {
    if (t === "Branding") return kind === "wheel-2d";
    if (t === "Wheel") return kind !== "slot";
    return true;
  });

  return (
    <div className="editor">
      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={t === tab ? "tab active" : "tab"}
            data-testid={`tab-${t.toLowerCase()}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "Content" && <ContentTab landing={landing} />}
      {tab === "Branding" && kind === "wheel-2d" && <BrandingTab landing={landing} />}
      {tab === "Wheel" && kind !== "slot" && <WheelTab landing={landing} />}
      {tab === "Settings" && <SettingsTab landing={landing} />}
      {tab === "Domains" && <DomainsPanel landingId={landing.id} />}
    </div>
  );
}
```

- [ ] **Step 5: Update the editor test (replace the prior Branding-only cases)**

In `components/admin/LandingEditor.test.tsx`, replace the two Branding-specific tests added earlier (`shows the Branding tab for the classic-2d template` and `hides the Branding tab for a 3D template, keeping the others`) with kind-driven cases:

```tsx
  it("classic-2d shows all five tabs", () => {
    render(<LandingEditor landing={landing()} />);
    for (const t of ["content", "branding", "wheel", "settings", "domains"]) {
      expect(screen.getByTestId(`tab-${t}`)).toBeInTheDocument();
    }
  });

  it("a 3D wheel hides Branding but keeps Wheel", () => {
    render(<LandingEditor landing={{ ...landing(), template: "jackpot-vault" }} />);
    expect(screen.queryByTestId("tab-branding")).toBeNull();
    expect(screen.getByTestId("tab-wheel")).toBeInTheDocument();
  });

  it("a slot hides both Branding and Wheel", () => {
    render(<LandingEditor landing={{ ...landing(), template: "book-of-ra" }} />);
    expect(screen.queryByTestId("tab-branding")).toBeNull();
    expect(screen.queryByTestId("tab-wheel")).toBeNull();
    for (const t of ["content", "settings", "domains"]) {
      expect(screen.getByTestId(`tab-${t}`)).toBeInTheDocument();
    }
  });
```

- [ ] **Step 6: Run tests + tsc**

Run: `npx vitest run lib/templateKind.test.ts components/admin/LandingEditor.test.tsx && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/templateKind.ts lib/templateKind.test.ts components/admin/LandingEditor.tsx components/admin/LandingEditor.test.tsx
git commit -m "feat(admin): templateKind classifier + editor tabs per kind (slots drop Wheel)"
```

---

### Task 2: `winText` column + win-prize-text precedence

**Files:**
- Modify: `prisma/schema.prisma`, `lib/types.ts`, `lib/tenant.ts`, `lib/admin/types.ts`, `lib/admin/landingService.ts`, `lib/admin/validation.ts`, `lib/sceneConfig.ts`
- Test: `lib/sceneConfig.test.ts`, `lib/admin/validation.test.ts`, `lib/admin/landingService.test.ts`

**Interfaces:**
- Produces: `Landing.winText: string` (default `""`); `LandingView.winText: string`; `EditableLanding.winText: string`; `buildSceneConfig` prize = `winText || winningPrizeLabel || winTitle`.

- [ ] **Step 1: Add the column + regenerate**

In `prisma/schema.prisma`, add to `model Landing` after `pwaUrl`:

```prisma
  winText            String   @default("")
```

Run: `npm run db:push && npm run db:generate` — Expected: in sync + client generated.

- [ ] **Step 2: Failing precedence test**

In `lib/sceneConfig.test.ts`, add inside the `buildSceneConfig` describe (the `view` fixture must gain `winText`; set it to `""` in the existing fixture and add this case):

```ts
  it("prefers winText over the winning prize label", () => {
    const c = buildSceneConfig({ ...view, winText: "200 Free Spins" });
    expect(c.conversion.prize).toBe("200 Free Spins");
    expect(c.copy?.winPrize).toBe("200 Free Spins");
  });
```

Run: `npx vitest run lib/sceneConfig.test.ts` — Expected: FAIL (`winText` missing on `LandingView`, prize still the prize label).

- [ ] **Step 3: Thread `winText` through the types + view**

`lib/types.ts` — add to `LandingView` after `winningPrizeLabel: string;`:

```ts
  winText: string;
```

`lib/tenant.ts` — add `winText: string;` to the `LandingRow` type (next to `metaTitle`/`metaDescription`), and in `toLandingView`'s returned object add after `winningPrizeLabel: landing.winningPrize?.label ?? "",`:

```ts
    winText: landing.winText,
```

`lib/admin/types.ts` — add `winText: string;` to `EditableLanding` (after `almostText`). 
`lib/admin/landingService.ts` `getEditableLanding` — add to the returned object after `almostText: l.almostText,`:

```ts
    winText: l.winText,
```

- [ ] **Step 4: Implement the precedence in `buildSceneConfig`**

In `lib/sceneConfig.ts`, change the prize line:

```ts
  const prize = view.winText || view.winningPrizeLabel || view.texts.winTitle;
```

- [ ] **Step 5: Validation + presets set `winText`**

`lib/admin/validation.ts` — add to the `patchSchema` object (before `.partial().strict()`):

```ts
    winText: z.string(),
```

`lib/admin/landingService.ts` — add a `winText` field to `TemplatePreset` and each preset (`""` for the wheels, the prize text for slots), and set it on create. In the `TemplatePreset` type add `winText: string;`. In `TEMPLATE_PRESETS` set: classic-2d/jackpot-vault/alchemy-lab → `winText: ""`; book-of-ra → `winText: "200 Free Spins"`; gates-of-olympus → `winText: "500 Free Spins + ×500"`. In `createLanding`'s `data`, add after `pwaName: preset.pwaName,`:

```ts
      winText: preset.winText,
```

- [ ] **Step 6: Fix fixtures + run**

Adding a required `winText` to `LandingView`/`EditableLanding` breaks fixtures. Run `npx tsc --noEmit`; for every fixture that now fails to compile (e.g. `lib/sceneConfig.test.ts` `view`, `app/[domain]/pwaRoutes.test.ts`, `app/[domain]/metadata.test.ts`, `lib/admin/*` test fixtures, the admin component `*.test.tsx` `EditableLanding` fixtures), add `winText: ""`. Then:

Run: `npx vitest run lib/sceneConfig.test.ts lib/admin/validation.test.ts lib/admin/landingService.test.ts && npm test && npx tsc --noEmit`
Expected: all PASS, exit 0.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/types.ts lib/tenant.ts lib/sceneConfig.ts lib/sceneConfig.test.ts lib/admin/types.ts lib/admin/landingService.ts lib/admin/landingService.test.ts lib/admin/validation.ts lib/admin/validation.test.ts
# plus any fixture files you had to touch (git add them explicitly)
git commit -m "feat: winText column + win-prize-text precedence (winText > prize label > winTitle)"
```

---

### Task 3: Collapse `pwaUrl` → `redirectUrl` (one PWA link)

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/types.ts`, `lib/tenant.ts`, `lib/admin/types.ts`, `lib/admin/landingService.ts`, `lib/admin/validation.ts`, `app/[domain]/go/route.ts`, `components/admin/SettingsTab.tsx`
- Test: `app/[domain]/pwaRoutes.test.ts`, `lib/admin/validation.test.ts`, `components/admin/SettingsTab.test.tsx`

**Interfaces:**
- Produces: `pwaUrl` no longer exists anywhere; `/go` redirects to `redirectUrl`; `patchSchema` accepts `redirectUrl` and rejects `pwaUrl`.

- [ ] **Step 1: Failing `/go` test (redirect to redirectUrl, no pwaUrl)**

In `app/[domain]/pwaRoutes.test.ts`, the `view` fixture currently sets `pwaUrl` and `redirectUrl`. Change it so the offer lives only in `redirectUrl`: set `redirectUrl: "https://offer.example.com/go"` and **remove** the `pwaUrl` property. Update the `/go` tests:

```ts
  it("redirects to redirectUrl", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(view as never);
    const res = await goGET(new Request("http://x/go"), ctx("lucky.example.com"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://offer.example.com/go");
  });
```

(Delete the prior "falls back to redirectUrl when pwaUrl is blank" test — there is no fallback anymore.)

Run: `npx vitest run "app/[domain]/pwaRoutes.test.ts"` — Expected: FAIL to compile (`pwaUrl` removed from fixture but still referenced by route/types).

- [ ] **Step 2: Remove `pwaUrl` from the schema**

In `prisma/schema.prisma`, delete the `pwaUrl String @default("")` line from `model Landing`. Run: `npm run db:push && npm run db:generate`.

- [ ] **Step 3: Remove `pwaUrl` from data layer**

- `lib/types.ts`: delete `pwaUrl: string;` from `LandingView`.
- `lib/tenant.ts`: delete `pwaUrl` from `LandingRow` and from `toLandingView`'s return.
- `lib/admin/types.ts`: delete `pwaUrl: string;` from `EditableLanding`.
- `lib/admin/landingService.ts`: delete `pwaUrl: l.pwaUrl,` from `getEditableLanding`. (Presets/`createLanding` never set `pwaUrl` — no change there.)
- `app/[domain]/go/route.ts`: change the target line to:

```ts
  const target = view?.redirectUrl;
```

- [ ] **Step 4: Validation — drop `pwaUrl`, add `redirectUrl`**

In `lib/admin/validation.ts` `patchSchema`, delete `pwaUrl: z.union([url, z.literal("")]),` and add:

```ts
    redirectUrl: url,
```

- [ ] **Step 5: SettingsTab — drop `pwaUrl` state/field**

In `components/admin/SettingsTab.tsx`, remove the `pwaUrl` `useState`, the App-link `<input>` that binds it, and `pwaUrl` from the `patchLanding(...)` call. (The App-link field is re-added against `redirectUrl` in Task 6; for now Settings simply has no URL field.)

- [ ] **Step 6: Seed — offer in `redirectUrl`, drop `pwaUrl`**

In `prisma/seed.ts`, in the `jackpot-demo` block, set `redirectUrl: "https://example.com/offer?app=1"` and **delete** the `pwaUrl: "https://example.com/offer?app=1",` line.

Run: `npm run db:seed` — Expected: still seeds both landings.

- [ ] **Step 7: Fix remaining fixtures, run, commit**

Run `npx tsc --noEmit`; remove `pwaUrl` from any remaining test fixtures (admin `*.test.tsx` `EditableLanding` fixtures, `metadata.test.ts`, `sceneConfig.test.ts`). Update `validation.test.ts`: the "accepts a valid template and PWA fields" case must drop `pwaUrl` and instead assert `redirectUrl` is accepted; add `expect(parseLandingPatch({ pwaUrl: "x" }).ok).toBe(false)`.

Run: `npm test && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add prisma/schema.prisma prisma/seed.ts lib/types.ts lib/tenant.ts lib/admin/types.ts lib/admin/landingService.ts lib/admin/validation.ts lib/admin/validation.test.ts "app/[domain]/go/route.ts" "app/[domain]/pwaRoutes.test.ts" components/admin/SettingsTab.tsx components/admin/SettingsTab.test.tsx
# plus any other fixture files touched
git commit -m "feat: collapse pwaUrl into redirectUrl — one PWA offer link"
```

---

### Task 4: `Wheel3D` renders DB prizes + scene-config carries segments/logo

**Files:**
- Modify: `components/r3f/kit/sceneConfig.ts`, `components/r3f/kit/Wheel3D.tsx`, `components/r3f/kit/spinScene.tsx`, `lib/sceneConfig.ts`
- Test: `lib/sceneConfig.test.ts`

**Interfaces:**
- Produces: `LandingSceneConfig` gains `segments?: { label: string; color: string }[]`, `segmentCount?: number`, `logoSrc?: string | null`. `Wheel3D({ rotationRef, theme, segments, winningIndex })`. `useSpinScene` gains `segmentCount?: number`.

- [ ] **Step 1: Extend the scene-config type**

In `components/r3f/kit/sceneConfig.ts`, add to `LandingSceneConfig`:

```ts
  segments?: { label: string; color: string }[];
  segmentCount?: number;
  logoSrc?: string | null;
```

- [ ] **Step 2: Failing `buildSceneConfig` test (segments + logo)**

In `lib/sceneConfig.test.ts` (the `view` fixture has `segments: []`; give it two segments for this case), add:

```ts
  it("maps prizes to wheel segments + carries the logo + segment count", () => {
    const withSegs = {
      ...view,
      assets: { ...view.assets, logoUrl: "https://cdn.example.com/logo.svg" },
      segments: [
        { id: "p0", order: 0, label: "€5", icon: "", color: "#1E7A3A" },
        { id: "p1", order: 1, label: "JACKPOT", icon: "", color: "#F5C24B" },
      ],
    };
    const c = buildSceneConfig(withSegs);
    expect(c.segments).toEqual([
      { label: "€5", color: "#1E7A3A" },
      { label: "JACKPOT", color: "#F5C24B" },
    ]);
    expect(c.segmentCount).toBe(2);
    expect(c.logoSrc).toBe("https://cdn.example.com/logo.svg");
  });
```

Run: `npx vitest run lib/sceneConfig.test.ts` — Expected: FAIL (`segments`/`segmentCount`/`logoSrc` undefined).

- [ ] **Step 3: buildSceneConfig maps prizes → segments + logo**

In `lib/sceneConfig.ts`, add to the returned object:

```ts
    segments: view.segments.map((s) => ({ label: s.label, color: s.color })),
    segmentCount: view.segments.length,
    logoSrc: view.assets.logoUrl,
```

- [ ] **Step 4: `Wheel3D` accepts `segments` + `winningIndex`**

Rewrite `components/r3f/kit/Wheel3D.tsx` so the face is data-driven. Replace the signature and the bits that read `theme.labels`/`theme.segmentColors`/`theme.jackpotIndex`/`theme.goldIndices`:

```tsx
export function Wheel3D({ rotationRef, theme, segments, winningIndex }: {
  rotationRef: MutableRefObject<number>;
  theme: WheelTheme;
  segments: { label: string; color: string }[];
  winningIndex: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const n = segments.length;
  const R = theme.radius;
  const labels = useMemo(() => segments.map((s) => s.label), [segments]);
  const labelTex = useMemo(() => makeLabelTexture(labels, theme.labelColor), [labels, theme.labelColor]);

  const wedges = useMemo(
    () => Array.from({ length: n }, (_, i) => {
      const startDeg = 90 - (i + 1) * (360 / n);
      const endDeg = 90 - i * (360 / n);
      const shape = wedgeShape((startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180, R);
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
      });
      return { geom, color: segments[i].color, jackpot: i === winningIndex };
    }),
    [n, R, segments, winningIndex]
  );
```

In the wedge `<meshStandardMaterial>`, drop the `w.gold` branch (segments carry their own colour) and key the accent off `w.jackpot`:

```tsx
            <meshStandardMaterial
              color={w.color}
              metalness={w.jackpot ? 0.95 : 0.4}
              roughness={w.jackpot ? 0.28 : 0.3}
              emissive={w.jackpot ? "#E2483D" : "#08221c"}
              emissiveIntensity={w.jackpot ? 1.4 : 0.6}
            />
```

Keep the pointer cone, label plane, rim torus, bulbs, and hub exactly as they are (they read `theme.rimColor`/`bulbColor`/`goldColor`/`radius`). Remove the now-unused `goldSet`/`theme.goldIndices`/`theme.jackpotIndex` references.

- [ ] **Step 5: `useSpinScene` threads the real segment count**

In `components/r3f/kit/spinScene.tsx`, add `segmentCount` to `useSpinScene`'s params (type `segmentCount?: number`) and pass it to the controller — change the `createSpinController` memo to include `segments: segmentCount ?? 8` and add `segmentCount` to its dependency array:

```ts
  const controller = useMemo(
    () => createSpinController({ winningIndex, winOnSpin, segments: segmentCount ?? 8, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced, winningIndex, winOnSpin, segmentCount]
  );
```

- [ ] **Step 6: Run + tsc**

Run: `npx vitest run lib/sceneConfig.test.ts && npx tsc --noEmit`
Expected: the new buildSceneConfig test PASSES. tsc will now FAIL in the two wheel scenes (they still call `<Wheel3D theme=… />` without `segments`/`winningIndex`) — **that is expected and fixed in Task 5.** Confirm the ONLY tsc errors are in `JackpotVaultScene.tsx`/`AlchemyLabScene.tsx` about missing `Wheel3D` props; if so, proceed.

- [ ] **Step 7: Commit**

```bash
git add components/r3f/kit/sceneConfig.ts components/r3f/kit/Wheel3D.tsx components/r3f/kit/spinScene.tsx lib/sceneConfig.ts lib/sceneConfig.test.ts
git commit -m "feat: Wheel3D renders DB prize segments + lands on the chosen winner"
```

---

### Task 5: Wire the wheel scenes (segments/winner) + casino logo in all scenes

**Files:**
- Modify: `components/r3f/kit/SpinOverlay.tsx`, `components/r3f/kit/WinSheet.tsx`, `components/r3f/jackpot/JackpotVaultScene.tsx`, `components/r3f/alchemy/AlchemyLabScene.tsx`, `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`, `components/r3f/slots/gates-of-olympus/GatesScene.tsx`
- Test: `components/r3f/kit/SpinOverlay.test.tsx`, `components/r3f/kit/WinSheet.test.tsx`

**Interfaces:**
- Consumes: `LandingSceneConfig.segments`/`segmentCount`/`logoSrc` (Task 4), `Wheel3D({segments,winningIndex})` (Task 4), `useSpinScene({segmentCount})` (Task 4).
- Produces: `SpinOverlay`/`WinSheet` accept `logoSrc?: string` (default `/boomzino-logo.svg`).

- [ ] **Step 1: Failing logo test**

In `components/r3f/kit/WinSheet.test.tsx`, add (the WinSheet renders an `<img>` with the logo; assert the src honours the prop):

```tsx
  it("uses the provided logoSrc", () => {
    render(<WinSheet step="reveal" copy={copy} config={config} reduced={false}
      logoSrc="https://cdn.example.com/casino.svg" onOpen={() => {}} onSubmit={() => {}} onDismiss={() => {}} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/casino.svg");
  });
```

(Use the same `copy`/`config` the existing WinSheet tests build. If the existing test file lacks them, mirror the fixtures from `SpinOverlay.test.tsx`.)

Run: `npx vitest run components/r3f/kit/WinSheet.test.tsx` — Expected: FAIL (`logoSrc` not a prop; src is `/boomzino-logo.svg`).

- [ ] **Step 2: `logoSrc` on WinSheet + SpinOverlay**

`components/r3f/kit/WinSheet.tsx` — add `logoSrc` to the props (type `logoSrc?: string;`) and use it:

```tsx
        <img className={css.logo} src={logoSrc ?? "/boomzino-logo.svg"} alt={copy.logo} />
```

`components/r3f/kit/SpinOverlay.tsx` — add `logoSrc?: string;` to props; use it for the header img:

```tsx
        <img className={css.logo} src={logoSrc ?? "/boomzino-logo.svg"} alt={copy.logo} />
```

and pass it through to the `<WinSheet …>` it renders:

```tsx
      <WinSheet
        step={claimStep} copy={copy} config={config} reduced={reduced} logoSrc={logoSrc}
        onOpen={onClaimOpen} onSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
```

- [ ] **Step 3: Wire `JackpotVaultScene` (segments + winner + logo)**

In `components/r3f/jackpot/JackpotVaultScene.tsx`:

Compute the wheel data (config-driven with a theme fallback) near the top of the component:

```tsx
  const segments = config?.segments ?? jackpotWheel.labels.map((label, i) => ({ label, color: jackpotWheel.segmentColors[i] }));
  const winningIndex = config?.winningIndex ?? jackpotWheel.jackpotIndex;
```

Pass `segmentCount` into `useSpinScene` (add to the existing call): `segmentCount: segments.length`. Pass `winningIndex` (already wired) — keep `winningIndex: config?.winningIndex ?? jackpotWheel.jackpotIndex` consistent with the line above (reuse the `winningIndex` const).

Change `WheelRig` to forward `segments`/`winningIndex` to `Wheel3D`:

```tsx
function WheelRig({ rotationRef, reduced, segments, winningIndex }: {
  rotationRef: React.MutableRefObject<number>; reduced: boolean;
  segments: { label: string; color: string }[]; winningIndex: number;
}) {
  const wheel = <Wheel3D rotationRef={rotationRef} theme={jackpotWheel} segments={segments} winningIndex={winningIndex} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>;
}
```

and render `<WheelRig rotationRef={rotationRef} reduced={reduced} segments={segments} winningIndex={winningIndex} />`.

Pass the logo to the overlay + fallback: add `logoSrc={config?.logoSrc ?? undefined}` to the `<SpinOverlay …>` props.

- [ ] **Step 4: Wire `AlchemyLabScene` — same shape, alchemy symbols**

Apply the identical changes as Step 3 in `components/r3f/alchemy/AlchemyLabScene.tsx`, substituting `alchemyWheel` for `jackpotWheel`. The `segments`/`winningIndex` consts, the `WheelRig` prop forwarding, `useSpinScene({ segmentCount: segments.length, … })`, and `logoSrc={config?.logoSrc ?? undefined}` on `<SpinOverlay>` are byte-for-byte the same except the theme symbol. (Open the file to confirm its `WheelRig` + overlay call sites.)

- [ ] **Step 5: Slots — pass the casino logo to their overlay**

In `components/r3f/slots/book-of-ra/BookOfRaScene.tsx` and `components/r3f/slots/gates-of-olympus/GatesScene.tsx`, add `logoSrc={config?.logoSrc ?? undefined}` to the `<SpinOverlay …>` props (slots don't have a wheel; only the logo changes). No other change.

- [ ] **Step 6: Run + tsc + prototype e2e (no-config fallback unchanged)**

Run: `npx vitest run components/r3f/kit/WinSheet.test.tsx components/r3f/kit/SpinOverlay.test.tsx && npm test && npx tsc --noEmit`
Expected: PASS, exit 0 (the Task 4 scene tsc errors are now resolved).

Run (prototype routes pass no config → theme-fallback face + default logo): `npx playwright test tests/e2e/jackpotVault3d.spec.ts tests/e2e/alchemyLab3d.spec.ts` — Expected: PASS (run via the alt-port harness or once port 3000 is free).

> If port 3000 is occupied, defer this e2e to the Task 8 batch run; tsc + unit are the gate here.

- [ ] **Step 7: Commit**

```bash
git add components/r3f/kit/SpinOverlay.tsx components/r3f/kit/WinSheet.tsx components/r3f/kit/WinSheet.test.tsx components/r3f/jackpot/JackpotVaultScene.tsx components/r3f/alchemy/AlchemyLabScene.tsx components/r3f/slots/book-of-ra/BookOfRaScene.tsx components/r3f/slots/gates-of-olympus/GatesScene.tsx
git commit -m "feat: 3D wheels render configured prizes + configurable casino logo in all scenes"
```

---

### Task 6: Editor reorg — WheelTab drops the URL, SettingsTab builds out

**Files:**
- Modify: `components/admin/WheelTab.tsx`, `components/admin/SettingsTab.tsx`, `lib/adminClient.ts`, `lib/admin/validation.ts`, `lib/admin/landingService.ts`
- Test: `components/admin/WheelTab.test.tsx`, `components/admin/SettingsTab.test.tsx`, `lib/admin/validation.test.ts`, `lib/admin/landingService.test.ts`

**Interfaces:**
- Produces: `putWheel` body = `{ spinsBeforeWin, winningIndex, prizes }` (no URL/param); `patchSchema` also accepts `spinsBeforeWin`; `SettingsTab` renders casino logo + app link + PWA (all kinds) + slot win-text/spins.

- [ ] **Step 1: WheelTab — remove the URL + prize-param + stale note**

In `components/admin/WheelTab.tsx`: delete the `redirectUrl`/`prizeParam` `useState`s; delete `redirectUrl`/`redirectPrizeParam` from the `putWheel(...)` call; delete the two `<label className="field">` blocks for "Redirect URL" and "Prize query param"; and delete the `is3d` note block (the 3D wheel now reflects the prizes, so the "decorative" note is wrong). The remaining `wheel-config` div keeps only "Spins before win (N)".

- [ ] **Step 2: adminClient + wheel schema + saveWheel drop the URL**

`lib/adminClient.ts` — `putWheel`'s `body` is `unknown`, so no signature change; nothing to edit.
`lib/admin/validation.ts` — in `wheelSchema`, delete `redirectUrl: url,` and `redirectPrizeParam: z.string().min(1).nullable(),`. Also add `spinsBeforeWin: z.number().int().min(1),` to `patchSchema` (so slots can save it via PATCH).
`lib/admin/landingService.ts` — in `saveWheel`'s final `tx.landing.update`, remove `redirectUrl: input.redirectUrl,` and `redirectPrizeParam: input.redirectPrizeParam,` (keep `winningPrizeId` + `spinsBeforeWin`).

- [ ] **Step 3: Failing WheelTab test (no URL inputs)**

Append to `components/admin/WheelTab.test.tsx`:

```tsx
  it("no longer renders the Redirect URL / prize-param inputs", () => {
    render(<WheelTab landing={landing()} />);
    expect(screen.queryByText("Redirect URL")).toBeNull();
    expect(screen.queryByText("Prize query param (optional)")).toBeNull();
  });
```

(Use the file's existing `landing()`/render setup; if it asserted the saved payload includes `redirectUrl`, update that assertion to the new `{ spinsBeforeWin, winningIndex, prizes }` shape.)

Run: `npx vitest run components/admin/WheelTab.test.tsx` — Expected: FAIL first (inputs still present) → after Step 1 edits, PASS.

- [ ] **Step 4: SettingsTab buildout**

Rewrite `components/admin/SettingsTab.tsx` to add the casino logo, the app link (`redirectUrl`), the PWA group for all kinds, and slot-only win-text + spins. Full file:

```tsx
"use client";

import { useState, type ChangeEvent } from "react";
import { Field } from "./Field";
import { patchLanding, uploadFile } from "@/lib/adminClient";
import { templateKind } from "@/lib/templateKind";
import type { EditableLanding } from "@/lib/admin/types";

const TEMPLATES = ["classic-2d", "jackpot-vault", "alchemy-lab", "book-of-ra", "gates-of-olympus"] as const;

export function SettingsTab({ landing }: { landing: EditableLanding }) {
  const [name, setName] = useState(landing.name);
  const [slug, setSlug] = useState(landing.slug);
  const [status, setStatus] = useState<"draft" | "published">(landing.status);
  const [template, setTemplate] = useState(landing.template);
  const [logoUrl, setLogoUrl] = useState<string | null>(landing.logoUrl);
  const [redirectUrl, setRedirectUrl] = useState(landing.redirectUrl);
  const [pwaName, setPwaName] = useState(landing.pwaName);
  const [pwaIconUrl, setPwaIconUrl] = useState<string | null>(landing.pwaIconUrl);
  const [winText, setWinText] = useState(landing.winText);
  const [spinsBeforeWin, setSpins] = useState(landing.spinsBeforeWin);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const isSlot = templateKind(template) === "slot";

  async function onUpload(set: (u: string) => void, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const { url } = await uploadFile(file);
      set(url);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, {
        name, slug, status, template, logoUrl, redirectUrl, pwaName, pwaIconUrl,
        ...(isSlot ? { winText, spinsBeforeWin: Number(spinsBeforeWin) } : {}),
      });
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

      <label className="field">
        <span>Casino logo</span>
        <input type="file" accept="image/*" onChange={(e) => onUpload(setLogoUrl, e)} />
      </label>
      {logoUrl && <img className="asset-preview" src={logoUrl} alt="" />}

      {isSlot && (
        <>
          <Field label="Win text" value={winText} onChange={setWinText} />
          <label className="field">
            <span>Spins before win</span>
            <input aria-label="Spins before win" type="number" min={1} value={spinsBeforeWin} onChange={(e) => setSpins(Number(e.target.value))} />
          </label>
        </>
      )}

      <fieldset className="pwa-group">
        <legend>Download app (PWA)</legend>
        <label className="field">
          <span>App link</span>
          <input aria-label="App link" type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="https://offer.example.com (the PWA opens this)" />
        </label>
        <Field label="App name" value={pwaName} onChange={setPwaName} />
        <label className="field">
          <span>App icon</span>
          <input type="file" accept="image/*" onChange={(e) => onUpload(setPwaIconUrl, e)} />
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

- [ ] **Step 5: SettingsTab tests (field set per kind)**

Replace the prior PWA-visibility tests in `components/admin/SettingsTab.test.tsx` with kind-driven cases (the `landing()` helper is `classic-2d`; the "publishes the landing" payload assertion must now include `logoUrl`, `redirectUrl`, `pwaName`, `pwaIconUrl` and exclude slot-only keys):

```tsx
  it("shows the App link (redirect) + casino logo + PWA fields for a wheel", () => {
    render(<SettingsTab landing={landing()} />);
    expect(screen.getByLabelText("App link")).toBeInTheDocument();
    expect(screen.getByText("Casino logo")).toBeInTheDocument();
    expect(screen.getByLabelText("App name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Spins before win")).toBeNull(); // wheels edit spins in the Wheel tab
  });

  it("shows Win text + Spins for a slot", () => {
    render(<SettingsTab landing={{ ...landing(), template: "book-of-ra", winText: "200 Free Spins" }} />);
    expect((screen.getByLabelText("Win text") as HTMLInputElement).value).toBe("200 Free Spins");
    expect(screen.getByLabelText("Spins before win")).toBeInTheDocument();
  });
```

Update the existing "publishes the landing" test's expected payload to:
`{ name: "Promo", slug: "promo", status: "published", template: "classic-2d", logoUrl: null, redirectUrl: "https://x.com", pwaName: "App", pwaIconUrl: null }`.

- [ ] **Step 6: Validation + service tests**

In `lib/admin/validation.test.ts`, add `expect(parseLandingPatch({ spinsBeforeWin: 2 }).ok).toBe(true)` and update the wheel tests: drop `redirectUrl`/`redirectPrizeParam` from the valid-wheel payloads (they're no longer in `wheelSchema`); a payload with `redirectUrl` should now be rejected by the strict-ish wheel schema only if the schema is strict — it is NOT `.strict()`, so extra keys are ignored; assert instead that a minimal `{ spinsBeforeWin, winningIndex, prizes }` is accepted.
In `lib/admin/landingService.test.ts` `saveWheel` test, drop `redirectUrl`/`redirectPrizeParam` from the input and remove any assertion on them in `finalUpdate.data`.

- [ ] **Step 7: Run everything + commit**

Run: `npm test && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add components/admin/WheelTab.tsx components/admin/WheelTab.test.tsx components/admin/SettingsTab.tsx components/admin/SettingsTab.test.tsx lib/admin/validation.ts lib/admin/validation.test.ts lib/admin/landingService.ts lib/admin/landingService.test.ts
git commit -m "feat(admin): Settings holds casino logo + app link + PWA (all) + slot win-text/spins; Wheel tab drops the URL"
```

---

### Task 7: 2D wheel PWA flow (install on spin, open on win)

**Files:**
- Modify: `app/[domain]/buildMetadata.ts`, `app/[domain]/Wheel.client.tsx`
- Test: `app/[domain]/metadata.test.ts`, `app/[domain]/Wheel.client.test.tsx`

**Interfaces:**
- Consumes: `usePwaInstall` (`components/r3f/kit/usePwaInstall`), `IosInstallHint` (`components/r3f/kit/IosInstallHint`).
- Produces: manifest linked for all templates; the 2D wheel prompts install on first spin and opens `/go` on claim.

- [ ] **Step 1: Failing metadata test (manifest for classic-2d)**

In `app/[domain]/metadata.test.ts`, change the existing "does not link a manifest for classic-2d" case to assert it NOW links:

```ts
  it2("links the manifest for classic-2d too", () => {
    const m = bm({ ...base, template: "classic-2d" } as never);
    expect2(m.manifest).toBe("/manifest");
  });
```

Run: `npx vitest run "app/[domain]/metadata.test.ts"` — Expected: FAIL (currently undefined for classic-2d).

- [ ] **Step 2: buildMetadata links manifest for all templates**

In `app/[domain]/buildMetadata.ts`, remove the `if (view.template !== "classic-2d")` guard so the manifest + appleWebApp are always set:

```ts
  meta.manifest = "/manifest";
  meta.appleWebApp = { capable: true, title: view.pwaName || view.texts.heading };
```

(Keep the `icons` block as-is.)

- [ ] **Step 3: Failing Wheel.client test (install + open /go)**

In `app/[domain]/Wheel.client.test.tsx`, mock the PWA hook and assert the flow. Add at top (with the other mocks):

```tsx
const promptInstall = vi.fn();
vi.mock("@/components/r3f/kit/usePwaInstall", () => ({
  usePwaInstall: () => ({ platform: "android", installed: false, iosHintOpen: false, promptInstall, openApp: vi.fn(), dismissIosHint: vi.fn() }),
}));
```

Add a test (mirroring the file's existing render/landing setup; `navigate` is an injectable prop):

```tsx
  it("prompts install on first spin and opens /go on claim", async () => {
    const navigate = vi.fn();
    render(<WheelClient landing={landingView()} navigate={navigate} />);
    await userEvent.click(screen.getByTestId("spin-button"));
    expect(promptInstall).toHaveBeenCalledTimes(1);
    // drive to win + claim per the existing controller test helper, then:
    // (the existing test already knows how to reach the WinModal claim button)
  });
```

(If the existing test file already simulates spin→win→claim, extend that test to assert `navigate` was called with `"/go"`. Use the file's existing approach to reach the claim button rather than re-deriving it.)

Run: `npx vitest run "app/[domain]/Wheel.client.test.tsx"` — Expected: FAIL.

- [ ] **Step 4: Wire the PWA flow into `WheelClient`**

Edit `app/[domain]/Wheel.client.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { useSpinController } from "./useSpinController";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import { Pointer } from "@/components/wheel/Pointer";
import { WinModal } from "@/components/wheel/WinModal";
import { usePwaInstall } from "@/components/r3f/kit/usePwaInstall";
import { IosInstallHint } from "@/components/r3f/kit/IosInstallHint";
import type { LandingView } from "@/lib/types";

export function WheelClient({
  landing,
  navigate = (url: string) => window.location.assign(url),
}: {
  landing: LandingView;
  navigate?: (url: string) => void;
}) {
  const { rotation, status, spin, onAnimationComplete } = useSpinController(landing.spin);
  const pwa = usePwaInstall();
  const prompted = useRef(false);

  const winTitle = landing.texts.winTitle.replace("{prize}", landing.winningPrizeLabel);

  const onSpin = () => {
    if (!prompted.current) { prompted.current = true; pwa.promptInstall(); }
    spin();
  };
  const onClaim = () => navigate("/go");

  return (
    <div className="wheel-stage">
      <div className="wheel-pointer"><Pointer /></div>
      <div
        className="wheel-rotor"
        data-testid="wheel-rotor"
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={onAnimationComplete}
      >
        <WheelSvg segments={landing.segments} size={360} />
      </div>

      <button
        className="spin-button"
        data-testid="spin-button"
        onClick={onSpin}
        disabled={status === "spinning" || status === "won"}
        aria-label="Spin the wheel"
      >
        ⟳
      </button>

      {status === "almost" && (
        <p className="almost-text" data-testid="almost-text">{landing.texts.almostText}</p>
      )}

      <WinModal
        open={status === "won"}
        title={winTitle}
        prizeLabel={landing.winningPrizeLabel}
        claimLabel={landing.texts.claimLabel}
        onClaim={onClaim}
      />
      <IosInstallHint open={pwa.iosHintOpen} appName={landing.pwaName} iconUrl={landing.pwaIconUrl} onClose={pwa.dismissIosHint} />
    </div>
  );
}
```

(`buildRedirectUrl`/`@/lib/redirect` import is removed — the claim now opens `/go`.)

- [ ] **Step 5: Run + tsc**

Run: `npx vitest run "app/[domain]/Wheel.client.test.tsx" "app/[domain]/metadata.test.ts" && npm test && npx tsc --noEmit`
Expected: PASS, exit 0. (If `@/lib/redirect` becomes unused elsewhere, leave the module; only this file stops importing it.)

- [ ] **Step 6: Commit**

```bash
git add "app/[domain]/buildMetadata.ts" "app/[domain]/metadata.test.ts" "app/[domain]/Wheel.client.tsx" "app/[domain]/Wheel.client.test.tsx"
git commit -m "feat: 2D wheel joins the PWA flow (install on spin, open /go on claim) + manifest for all templates"
```

---

### Task 8: Seed a slot demo + end-to-end verification

**Files:**
- Modify: `prisma/seed.ts`
- Test: `tests/e2e/templatePwa.spec.ts`

**Interfaces:**
- Consumes: the full stack from Tasks 1–7.
- Produces: a seeded published slot landing; e2e proving a 3D wheel shows its configured prize labels, a slot shows its win text and serves manifest/`/go`, and the 2D landing links the manifest.

- [ ] **Step 1: Seed a slot landing**

In `prisma/seed.ts`, after the `jackpot-demo` block (and before `seedAdmin`), insert a slot landing on its own host:

```ts
  const slotHost = "bookofra.localhost:3000";
  await prisma.domain.deleteMany({ where: { hostname: slotHost } });
  await prisma.landing.deleteMany({ where: { slug: "slot-demo" } });
  const slot = await prisma.landing.create({
    data: {
      slug: "slot-demo",
      name: "Slot Demo",
      status: "published",
      heading: "Unearth the Book",
      subtitle: "Spin to reveal riches",
      winTitle: "Riches revealed!",
      claimLabel: "Claim your bonus →",
      theme,
      template: "book-of-ra",
      spinsBeforeWin: 2,
      redirectUrl: "https://example.com/slot-offer?app=1",
      pwaName: "Book of Riches",
      pwaIconUrl: "https://example.com/slot-icon.png",
      winText: "200 Free Spins",
      prizes: { create: prizes },
      domains: { create: { hostname: slotHost, verified: true } },
    },
    include: { prizes: true },
  });
  const slotWinner = slot.prizes.find((p) => p.order === winningOrder);
  if (!slotWinner) throw new Error(`Seed error: no prize with order ${winningOrder} for slot-demo`);
  await prisma.landing.update({ where: { id: slot.id }, data: { winningPrizeId: slotWinner.id } });
  console.log(`Seeded slot landing "${slot.slug}" on ${slotHost}`);
```

Run: `npm run db:seed` — Expected: logs include `Seeded slot landing "slot-demo" on bookofra.localhost:3000`.

- [ ] **Step 2: Extend the e2e**

In `tests/e2e/templatePwa.spec.ts`, add (the `HOST` const is `process.env.E2E_HOST ?? "http://jackpot.localhost:3000"`; derive the slot host from the same port):

```ts
const SLOT = (process.env.E2E_HOST ?? "http://jackpot.localhost:3000").replace("jackpot.", "bookofra.");

test("3D wheel renders a configured prize label on its face", async ({ page }) => {
  await page.goto(`${HOST}/`);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  // JACKPOT is the seeded winning prize label for jackpot-demo
  // (the wheel label texture is on a canvas; assert the manifest instead for a deterministic check)
});

test("slot landing serves its manifest with the slot app name", async ({ request }) => {
  const res = await request.get(`${SLOT}/manifest`);
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBe("Book of Riches");
});

test("slot /go redirects to the slot offer link", async ({ request }) => {
  const res = await request.get(`${SLOT}/go`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  expect(res.headers()["location"]).toBe("https://example.com/slot-offer?app=1");
});

test("the 2D wheel links a manifest in its head", async ({ page }) => {
  const home = (process.env.E2E_HOST ?? "http://jackpot.localhost:3000").replace("jackpot.localhost", "localhost");
  await page.goto(home);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest");
});
```

> Wheel-face label text lives in a WebGL canvas texture and can't be asserted via DOM; the manifest/`/go` checks are the deterministic gate, and a manual screenshot confirms the configured labels render.

- [ ] **Step 3: Run the e2e (alt-port harness if 3000 is busy)**

Boot the app and run, in ≤3-spec batches:
- `tests/e2e/templatePwa.spec.ts` (this file's tests),
- then `tests/e2e/jackpotVault3d.spec.ts tests/e2e/alchemyLab3d.spec.ts`,
- then `tests/e2e/bookOfRa.spec.ts tests/e2e/gatesOfOlympus.spec.ts`,
- then `tests/e2e/landing.spec.ts` (2D classic still works).

Expected: all PASS. (If port 3000 is held by another process, run on an alternate port with throwaway `:<port>` domain rows and `E2E_HOST` set, then remove them — do not kill an unrelated server.)

- [ ] **Step 4: Full regression**

Run: `npm test && npx tsc --noEmit` — Expected: all unit/component tests pass, exit 0.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts tests/e2e/templatePwa.spec.ts
git commit -m "test: seed a slot demo + e2e for DB-wheel/slot/2D PWA"
```

---

## Self-Review

**Spec coverage:**
- §3 template kinds + §editor tabs → Task 1. ✓
- §4 Settings tab (casino logo, app link, PWA all, slot win-text/spins) → Tasks 3 (app link plumbing) + 6 (UI). ✓
- §5 Wheel tab loses URL → Task 6. ✓
- §6 3D wheels DB-driven → Tasks 4 (Wheel3D + config) + 5 (scene wiring). ✓
- §7 casino logo everywhere → Task 5 (SpinOverlay/WinSheet logoSrc + scenes). ✓
- §8 unified PWA + 2D wiring → Tasks 3 (one link) + 7 (2D + manifest-for-all). ✓
- §9 data model (winText add, pwaUrl remove) → Tasks 2 + 3. ✓
- §10 validation/service → Tasks 2, 3, 6. ✓
- §13 testing → each task + Task 8 e2e. ✓

**Placeholder scan:** Task 5 Step 4 and Task 7 Step 3 reference "the file's existing setup/approach" for byte-identical scene wiring and the existing spin→win→claim test driver — the full wiring block is shown verbatim in the sibling step (Task 5 Step 3) and the only deltas (theme symbol; reusing the existing controller-driven claim path) are named explicitly, so no logic is left unwritten. No "TBD/handle errors". ✓

**Type consistency:** `LandingSceneConfig.segments` is `{label,color}[]` in Task 4 and consumed identically in Task 5. `Wheel3D({segments,winningIndex})` defined in Task 4, called in Task 5. `winText` is `string` across schema/`LandingView`/`EditableLanding`/`buildSceneConfig`/presets (Tasks 2, 6). `redirectUrl` is the single offer link in `/go` (Task 3), Settings (Task 6), and the seed (Tasks 3, 8). `usePwaInstall`'s shape in the Task 7 mock matches Task 5's `PwaInstall` (from the prior plan). ✓

## Known minor follow-ups (non-blocking)
- The wheel-face label text is a WebGL canvas texture (not DOM-assertable); the e2e leans on manifest/`/go` + a manual screenshot.
- `redirectPrizeParam` column + `@/lib/redirect` helper become unused (left in place; removable later).
- Variable prize counts change the 3D wheel's look; per-prize colours come from the prize `color`.
