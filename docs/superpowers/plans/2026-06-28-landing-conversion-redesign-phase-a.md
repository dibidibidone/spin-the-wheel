# Landing conversion redesign — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the above-the-fold of all five landings (Variant A) — a bold admin-configurable **offer headline**, a **scarcity** line, and the **countdown fused onto the SPIN button** — plus focal-flow tightening and a first-load "tap to spin" coachmark, so the prize and urgency are unmissable and the eye flows game → proof → CTA.

**Architecture:** New per-landing DB fields (`offerHeadline`, `offerSubline`, `bonusesTotal`, `countdownMinutes`) thread through the existing read path (`Landing → toLandingView → buildSceneConfig`) into `OverlayCopy`/`ConversionConfig`, then render in the shared `SpinOverlay` (so all 4 R3F landings inherit it) and the 2D `WheelClient`. Two small new presentational components (`OfferBanner`, `ScarcityLine`) + a coachmark; `Countdown` is repositioned, not rewritten. Themes supply fallbacks so the no-config prototype routes stay fully designed.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma/Postgres, CSS Modules + `app/globals.css`, Vitest + Testing Library.

## Global Constraints

- TypeScript strict; match existing style (`lib/vercel.ts`-era patterns, the kit component conventions); no unrelated refactors. Commit after every task.
- Unit tests: `npm test`; single file: `npx vitest run <path>`. `npx tsc --noEmit` must stay clean.
- New fields are **admin-configurable** and additive/backward-compatible: `offerHeadline`/`offerSubline` default `""`, `bonusesTotal` default `0` (0 ⇒ scarcity hidden), `countdownMinutes` default `10`.
- New visual motion (CTA pulse, coachmark) is **hidden/static under `@media (prefers-reduced-motion: reduce)`**, exactly like `WinBurst`/`LossBurst`.
- `OfferBanner` renders nothing when `headline` is empty; `ScarcityLine` renders nothing when `total <= 0`. Do not break the no-config prototype routes — themes set the fallbacks.
- FOMO numbers are fabricated but **stable within a visit** (session-seeded), and **deterministically testable** (pure function takes the random input).
- Do not change the win celebration, the claim flow, `LossBurst`/`WinBurst`, or the spins-left/loss-burst behavior from the prior feature.

## File Structure

**New:** `components/r3f/kit/OfferBanner.tsx` (+ `offerBanner.module.css` + test), `components/r3f/kit/ScarcityLine.tsx` (+ `scarcityLine.module.css` + test), `components/r3f/kit/scarcity.ts` (+ test, pure), `components/r3f/kit/SpinCoach.tsx` (+ `spinCoach.module.css` + test).
**Modified:** `prisma/schema.prisma`, `lib/types.ts` (`LandingTexts`/`LandingView`), `lib/tenant.ts` (`LandingRow` + `toLandingView`), `components/r3f/kit/types.ts` (`OverlayCopy`/`ConversionConfig`), `lib/sceneConfig.ts` (`buildSceneConfig` + test), `components/r3f/kit/SpinOverlay.tsx` + `spinOverlay.module.css` (+ test), the 4 theme files (`components/r3f/{jackpot,alchemy}/theme.ts`, `components/r3f/slots/{book-of-ra,gates-of-olympus}/theme.ts`) + the 2D default, `app/[domain]/Wheel.client.tsx` + `app/globals.css` (+ test), the editor chain (`lib/admin/types.ts`, `lib/admin/landingService.ts`, `lib/admin/validation.ts`, `components/admin/ContentTab.tsx` + test).

---

### Task 1: DB fields + read-path plumbing + overlay types

**Files:**
- Modify: `prisma/schema.prisma`, `lib/types.ts`, `lib/tenant.ts`, `components/r3f/kit/types.ts`
- Test: `lib/tenant.test.ts` (or create if absent)

**Interfaces:**
- Produces: `LandingTexts.offerHeadline: string` + `offerSubline: string`; `LandingView.bonusesTotal: number` + `countdownMinutes: number`; `OverlayCopy.offerHeadline?: string` + `offerSubline?: string`; `ConversionConfig.scarcity?: { total: number }`.

- [ ] **Step 1: Add the Prisma fields**

In `prisma/schema.prisma`, in `model Landing`, after `winText String @default("")`, add:

```prisma
  offerHeadline    String  @default("")
  offerSubline     String  @default("")
  bonusesTotal     Int     @default(0)
  countdownMinutes Int     @default(10)
```

- [ ] **Step 2: Push schema + regenerate**

Run: `npx prisma db push && npx prisma generate` — Expected: additive columns applied (existing rows get defaults), exit 0.

- [ ] **Step 3: Extend the view types**

In `lib/types.ts`, add to `LandingTexts` (after `almostText`):

```ts
  offerHeadline: string;
  offerSubline: string;
```

and to `LandingView` (after `winText: string;`):

```ts
  bonusesTotal: number;
  countdownMinutes: number;
```

- [ ] **Step 4: Extend the overlay contract types**

In `components/r3f/kit/types.ts`, add to `OverlayCopy` (after `subBanner?: string;`):

```ts
  offerHeadline?: string;  // bold prize headline above the game (Variant A)
  offerSubline?: string;   // gold sub-line under the headline (e.g. "+ 200 Free Spins")
```

and to `ConversionConfig` (after `urgencyMs: number;`):

```ts
  scarcity?: { total: number };  // "X of {total} bonuses left"; omit/0 hides the line
```

- [ ] **Step 5: Map the fields in `toLandingView`**

In `lib/tenant.ts`, add the four fields to the `LandingRow` type (after `winText: string;`):

```ts
  offerHeadline: string; offerSubline: string; bonusesTotal: number; countdownMinutes: number;
```

In `toLandingView`, add to the `texts` object (after `almostText: landing.almostText,`):

```ts
      offerHeadline: landing.offerHeadline, offerSubline: landing.offerSubline,
```

and after `winText: landing.winText,` in the returned object:

```ts
    bonusesTotal: landing.bonusesTotal,
    countdownMinutes: landing.countdownMinutes,
```

- [ ] **Step 6: Failing then passing test**

Create/append `lib/tenant.test.ts` — a `toLandingView` test asserting the new fields thread through. Build a minimal `LandingRow` fixture (include the four new fields + the existing required ones) and assert:

```ts
import { describe, it, expect } from "vitest";
import { toLandingView } from "./tenant";

const row = () => ({
  slug: "s", status: "published",
  heading: "H", subtitle: "S", backLabel: "Back", winTitle: "W", claimLabel: "C", almostText: "A",
  offerHeadline: "Win up to €500", offerSubline: "+ 200 Free Spins", bonusesTotal: 50, countdownMinutes: 7,
  theme: { bg: "#000", surface: "#111", accent: "#0f0", gold: "#fc0", text: "#fff", muted: "#999" },
  logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
  spinsBeforeWin: 2, redirectUrl: "/go", redirectPrizeParam: null,
  metaTitle: null, metaDescription: null, template: "classic-2d", pwaName: "", pwaIconUrl: null, winText: "",
  winningPrizeId: null, winningPrize: null, prizes: [],
});

describe("toLandingView conversion fields", () => {
  it("threads offer + scarcity + countdown fields", () => {
    const v = toLandingView(row());
    expect(v.texts.offerHeadline).toBe("Win up to €500");
    expect(v.texts.offerSubline).toBe("+ 200 Free Spins");
    expect(v.bonusesTotal).toBe(50);
    expect(v.countdownMinutes).toBe(7);
  });
});
```

Run: `npx vitest run lib/tenant.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0. (tsc will also force you to update any other `LandingRow`/`LandingView`/`OverlayCopy` fixtures that now lack the fields — add the new keys to them; do not weaken assertions.)

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/types.ts lib/tenant.ts components/r3f/kit/types.ts lib/tenant.test.ts
git commit -m "feat(landing): offer/scarcity/countdown fields threaded into LandingView + overlay types"
```

---

### Task 2: `buildSceneConfig` maps the new fields

**Files:**
- Modify: `lib/sceneConfig.ts`
- Test: `lib/sceneConfig.test.ts`

**Interfaces:**
- Consumes: `LandingView.{texts.offerHeadline,texts.offerSubline,bonusesTotal,countdownMinutes}` (Task 1).
- Produces: `config.copy.offerHeadline`/`offerSubline`; `config.conversion.scarcity` + `urgencyMs` derived from the landing.

- [ ] **Step 1: Failing test**

In `lib/sceneConfig.test.ts`, extend the primary `buildSceneConfig` fixture's `view.texts` with `offerHeadline: "Win up to €500"`, `offerSubline: "+ 200 FS"` and the view with `bonusesTotal: 40`, `countdownMinutes: 5` (add these to the existing fixture builder). Then add:

```ts
    expect(c.copy?.offerHeadline).toBe("Win up to €500");
    expect(c.copy?.offerSubline).toBe("+ 200 FS");
    expect(c.conversion.scarcity).toEqual({ total: 40 });
    expect(c.conversion.urgencyMs).toBe(5 * 60_000);
```

Also add a case asserting `bonusesTotal: 0` ⇒ `scarcity` is `undefined`.

Run: `npx vitest run lib/sceneConfig.test.ts` — Expected: FAIL (fields not mapped).

- [ ] **Step 2: Map them**

In `lib/sceneConfig.ts`, update `buildSceneConfig`. Add to the `copy` object (after `subtitle: view.texts.subtitle` if present, else alongside `heading`):

```ts
      offerHeadline: view.texts.offerHeadline,
      offerSubline: view.texts.offerSubline,
```

and change the `conversion` call to derive urgency + scarcity from the landing:

```ts
    conversion: withConversionDefaults({
      prize,
      claimLabel: view.texts.claimLabel,
      redirectUrl: "/go",
      urgencyMs: view.countdownMinutes * 60_000,
      scarcity: view.bonusesTotal > 0 ? { total: view.bonusesTotal } : undefined,
    }),
```

(`withConversionDefaults` shallow-merges, so passing `scarcity: undefined` keeps it unset — confirm the default has no `scarcity` key, which it doesn't.)

- [ ] **Step 3: Run + commit**

Run: `npx vitest run lib/sceneConfig.test.ts && npx tsc --noEmit` — Expected: PASS, exit 0.

```bash
git add lib/sceneConfig.ts lib/sceneConfig.test.ts
git commit -m "feat(landing): buildSceneConfig maps offer headline + scarcity + countdown"
```

---

### Task 3: `OfferBanner` component

**Files:**
- Create: `components/r3f/kit/OfferBanner.tsx`, `components/r3f/kit/offerBanner.module.css`, `components/r3f/kit/OfferBanner.test.tsx`

**Interfaces:**
- Produces: `OfferBanner({ headline, subline }: { headline?: string; subline?: string })` — `data-testid="offer-banner"`; renders `null` when `headline` is empty.

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfferBanner } from "./OfferBanner";

describe("OfferBanner", () => {
  it("shows the headline and subline", () => {
    render(<OfferBanner headline="Win up to €500" subline="+ 200 Free Spins" />);
    expect(screen.getByTestId("offer-banner")).toBeInTheDocument();
    expect(screen.getByText("Win up to €500")).toBeInTheDocument();
    expect(screen.getByText("+ 200 Free Spins")).toBeInTheDocument();
  });
  it("renders nothing without a headline", () => {
    const { container } = render(<OfferBanner subline="+ 200 FS" />);
    expect(container.firstChild).toBeNull();
  });
});
```

Run: `npx vitest run components/r3f/kit/OfferBanner.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

`components/r3f/kit/OfferBanner.tsx`:

```tsx
import css from "./offerBanner.module.css";

// The prize-forward headline that leads the page (Variant A). Hidden when there's no
// configured/themed offer, so non-offer landings degrade cleanly.
export function OfferBanner({ headline, subline }: { headline?: string; subline?: string }) {
  if (!headline) return null;
  return (
    <div className={css.wrap} data-testid="offer-banner">
      <div className={css.headline}>{headline}</div>
      {subline && <div className={css.subline}>{subline}</div>}
    </div>
  );
}
```

`components/r3f/kit/offerBanner.module.css`:

```css
.wrap { text-align: center; padding: 2px 16px 0; }
.headline {
  font-weight: 900; font-size: clamp(26px, 7.5vw, 40px); line-height: 1.05; letter-spacing: -0.5px;
  color: var(--text); text-shadow: 0 0 22px color-mix(in srgb, var(--accent) 60%, transparent);
}
.subline {
  margin-top: 4px; font-weight: 800; font-size: clamp(15px, 4.5vw, 20px); letter-spacing: 0.3px;
  color: var(--gold); text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 45%, transparent);
}
```

- [ ] **Step 3: Run + commit**

Run: `npx vitest run components/r3f/kit/OfferBanner.test.tsx && npx tsc --noEmit` — Expected: PASS.

```bash
git add components/r3f/kit/OfferBanner.tsx components/r3f/kit/offerBanner.module.css components/r3f/kit/OfferBanner.test.tsx
git commit -m "feat(overlay): OfferBanner prize headline"
```

---

### Task 4: `ScarcityLine` + pure `scarcity` helper

**Files:**
- Create: `components/r3f/kit/scarcity.ts`, `components/r3f/kit/scarcity.test.ts`, `components/r3f/kit/ScarcityLine.tsx`, `components/r3f/kit/scarcityLine.module.css`, `components/r3f/kit/ScarcityLine.test.tsx`

**Interfaces:**
- Produces: `scarcityLeft(total: number, rand: number): number` (pure; `rand` in [0,1)); `ScarcityLine({ total }: { total: number })` — `data-testid="scarcity-line"`, renders `null` when `total <= 0`.

- [ ] **Step 1: Failing test for the pure helper**

`components/r3f/kit/scarcity.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { scarcityLeft } from "./scarcity";

describe("scarcityLeft", () => {
  it("returns a believable remaining count between 5% and 30% gone", () => {
    expect(scarcityLeft(50, 0)).toBe(48);   // min 5% gone -> 47.5 -> ceil-ish 48
    expect(scarcityLeft(50, 0.999)).toBe(35); // max 30% gone -> 35
  });
  it("never returns below 1 for a positive total", () => {
    expect(scarcityLeft(2, 0.999)).toBeGreaterThanOrEqual(1);
  });
  it("returns 0 for a non-positive total", () => {
    expect(scarcityLeft(0, 0.5)).toBe(0);
  });
});
```

Run: `npx vitest run components/r3f/kit/scarcity.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 2: Implement the helper**

`components/r3f/kit/scarcity.ts`:

```ts
// How many "bonuses" remain — a believable 5%–30% of `total` already gone. Pure: the caller
// supplies `rand` (a stable per-session value), so it is deterministic in tests.
export function scarcityLeft(total: number, rand: number): number {
  if (total <= 0) return 0;
  const goneFraction = 0.05 + rand * 0.25; // 5%..30%
  const left = Math.round(total * (1 - goneFraction));
  return Math.max(1, left);
}
```

Run: `npx vitest run components/r3f/kit/scarcity.test.ts` — Expected: PASS. (If the exact rounding in the test's first two assertions differs, adjust the expected numbers to the implementation's output — the *ranges* are the contract, the exact endpoints are whatever `Math.round` yields.)

- [ ] **Step 3: Failing test for the component**

`components/r3f/kit/ScarcityLine.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScarcityLine } from "./ScarcityLine";

describe("ScarcityLine", () => {
  it("shows 'X of total bonuses left' for a positive total", () => {
    render(<ScarcityLine total={50} />);
    const el = screen.getByTestId("scarcity-line");
    expect(el).toHaveTextContent(/of 50 bonuses left/i);
  });
  it("renders nothing when total is 0", () => {
    const { container } = render(<ScarcityLine total={0} />);
    expect(container.firstChild).toBeNull();
  });
});
```

Run: `npx vitest run components/r3f/kit/ScarcityLine.test.tsx` — Expected: FAIL (module missing).

- [ ] **Step 4: Implement the component**

`components/r3f/kit/ScarcityLine.tsx`:

```tsx
"use client";
import { useRef } from "react";
import css from "./scarcityLine.module.css";
import { scarcityLeft } from "./scarcity";

// "🔥 X of {total} bonuses left" — fabricated FOMO, stable within a visit (the random is
// seeded once per mount). Hidden when there's no scarcity configured.
export function ScarcityLine({ total }: { total: number }) {
  const rand = useRef(Math.random());
  if (total <= 0) return null;
  const left = scarcityLeft(total, rand.current);
  return (
    <p className={css.line} data-testid="scarcity-line">
      🔥 <b>{left}</b> of {total} bonuses left
    </p>
  );
}
```

`components/r3f/kit/scarcityLine.module.css`:

```css
.line {
  margin: 2px 0 0; text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 0.3px;
  color: color-mix(in srgb, var(--gold) 88%, white 12%);
}
.line b { color: #fff; }
```

- [ ] **Step 5: Run + commit**

Run: `npx vitest run components/r3f/kit/scarcity.test.ts components/r3f/kit/ScarcityLine.test.tsx && npx tsc --noEmit` — Expected: PASS.

```bash
git add components/r3f/kit/scarcity.ts components/r3f/kit/scarcity.test.ts components/r3f/kit/ScarcityLine.tsx components/r3f/kit/scarcityLine.module.css components/r3f/kit/ScarcityLine.test.tsx
git commit -m "feat(overlay): ScarcityLine + pure scarcityLeft helper"
```

---

### Task 5: `SpinOverlay` restructure (Variant A)

**Files:**
- Modify: `components/r3f/kit/SpinOverlay.tsx`, `components/r3f/kit/spinOverlay.module.css`
- Test: `components/r3f/kit/SpinOverlay.test.tsx`

**Interfaces:**
- Consumes: `OfferBanner` (Task 3), `ScarcityLine` (Task 4), `copy.offerHeadline/offerSubline` + `config.scarcity` (Tasks 1–2).
- Produces: SpinOverlay renders `OfferBanner` at the top (heading demoted to a subhead), `ScarcityLine` in the dock, and the `Countdown` on the CTA row.

- [ ] **Step 1: Failing test**

Append to `components/r3f/kit/SpinOverlay.test.tsx` (extend the existing `copy` fixture with `offerHeadline: "Win up to €500"`, `offerSubline: "+ 200 FS"`, and the `config` fixture with `scarcity: { total: 30 }`):

```tsx
describe("SpinOverlay conversion redesign", () => {
  it("renders the offer banner above the game and the scarcity line", () => {
    renderAt("idle", 2);
    expect(screen.getByTestId("offer-banner")).toHaveTextContent("Win up to €500");
    expect(screen.getByTestId("scarcity-line")).toHaveTextContent(/of 30 bonuses left/i);
  });
  it("keeps the countdown present (now on the CTA row)", () => {
    renderAt("idle", 2);
    expect(screen.getByTestId("countdown")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run components/r3f/kit/SpinOverlay.test.tsx` — Expected: FAIL (offer-banner/scarcity-line not present).

- [ ] **Step 2: Restructure the JSX**

In `components/r3f/kit/SpinOverlay.tsx`, add imports:

```ts
import { OfferBanner } from "./OfferBanner";
import { ScarcityLine } from "./ScarcityLine";
```

Replace the `hero` block with offer-led copy (the old heading demotes to a subhead under the offer):

```tsx
      <div className={css.hero}>
        <OfferBanner headline={copy.offerHeadline} subline={copy.offerSubline} />
        <h1 className={css.subhead}>{copy.heading}</h1>
        {copy.subtitle && <p className={css.subtitle}>{copy.subtitle}</p>}
        {copy.subBanner && <div className={css.banner}>{copy.subBanner}</div>}
      </div>
```

In the `dock`, add the `ScarcityLine` right after the SocialProof strip:

```tsx
        <div className={css.strip}>
          <SocialProof winners={config.social.winners} todayCount={config.social.todayCount} reduced={reduced} />
        </div>
        {config.scarcity && <ScarcityLine total={config.scarcity.total} />}
```

Move the `Countdown` from its own strip onto the CTA row: delete the `<div className={css.strip}><Countdown … /></div>` block, and wrap the CTA + countdown together. Replace the spins-left `<p>` + `<button …>` region with:

```tsx
        {spinsLeft != null && (status === "idle" || status === "nearmiss") && (
          <p className={css.spinsLeft} data-testid="spins-left">
            🎯 <b>{spinsLeft}</b> {spinsLeft === 1 ? "spin" : "spins"} left
          </p>
        )}
        <div className={css.ctaRow}>
          <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status === "spinning" || status === "won"}>
            {status === "spinning" ? copy.spinningLabel : status === "nearmiss" ? (copy.retryLabel ?? copy.ctaLabel) : copy.ctaLabel}
          </button>
          <div className={css.ctaTimer}><Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" /></div>
        </div>
        {status === "nearmiss" && copy.nearMissLine && <p className={css.retryHint} data-pe>{copy.nearMissLine}</p>}
        <TrustBar text={config.trust} />
```

- [ ] **Step 3: Focal-flow CSS**

In `components/r3f/kit/spinOverlay.module.css`:
- Add `.subhead` (the demoted heading): `{ margin: 4px 0 0; font-size: 16px; font-weight: 700; opacity: 0.85; }` and shrink the old `.hero h1` rule if it set a large size (the offer is now the big element).
- Tighten the dock: reduce the top gap so the game → strip → CTA read as one block (e.g. trim `.dock` top padding / `.strip` margins by ~8–12px). Keep the existing safe-area bottom.
- Add the CTA row + welded timer:

```css
.ctaRow { display: flex; flex-direction: column; align-items: stretch; }
.ctaTimer { margin-top: 0; }
.ctaTimer :global([data-testid="countdown"]) { border-top-left-radius: 0; border-top-right-radius: 0; }
```

(Keep the existing `.spinsLeft + .cta` top-squaring; the spins-left bar still welds onto `.cta`.)

- [ ] **Step 4: Run tests + tsc**

Run: `npx vitest run components/r3f/kit/SpinOverlay.test.tsx && npx tsc --noEmit` — Expected: PASS (existing spins-left/loss-burst tests still green; testids preserved).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/SpinOverlay.tsx components/r3f/kit/spinOverlay.module.css components/r3f/kit/SpinOverlay.test.tsx
git commit -m "feat(overlay): Variant A — offer-led hero, scarcity line, countdown on the CTA"
```

---

### Task 6: First-load "tap to spin" coachmark

**Files:**
- Create: `components/r3f/kit/SpinCoach.tsx`, `components/r3f/kit/spinCoach.module.css`, `components/r3f/kit/SpinCoach.test.tsx`
- Modify: `components/r3f/kit/SpinOverlay.tsx`

**Interfaces:**
- Produces: `SpinCoach({ show }: { show: boolean })` — `data-testid="spin-coach"`, a `pointer-events:none` "👆 Tap to spin" nudge; renders `null` when `show` is false. Reduced-motion handled in CSS.

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpinCoach } from "./SpinCoach";

describe("SpinCoach", () => {
  it("shows the nudge when show is true", () => {
    render(<SpinCoach show />);
    expect(screen.getByTestId("spin-coach")).toHaveTextContent(/tap to spin/i);
  });
  it("renders nothing when show is false", () => {
    const { container } = render(<SpinCoach show={false} />);
    expect(container.firstChild).toBeNull();
  });
});
```

Run: `npx vitest run components/r3f/kit/SpinCoach.test.tsx` — Expected: FAIL.

- [ ] **Step 2: Implement**

`components/r3f/kit/SpinCoach.tsx`:

```tsx
import css from "./spinCoach.module.css";

// One-shot "tap to spin" nudge over the CTA on first idle load. Decoration only
// (aria-hidden, pointer-events:none); the parent decides when to stop showing it.
export function SpinCoach({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className={css.coach} data-testid="spin-coach" aria-hidden>
      <span className={css.finger}>👆</span>
      <span className={css.text}>Tap to spin</span>
    </div>
  );
}
```

`components/r3f/kit/spinCoach.module.css`:

```css
.coach { position: relative; pointer-events: none; display: flex; align-items: center; justify-content: center;
  gap: 6px; margin-top: 6px; font-weight: 800; font-size: 13px; letter-spacing: 0.5px; color: var(--gold);
  animation: coachpulse 1.4s ease-in-out infinite; }
.finger { font-size: 18px; display: inline-block; animation: coachtap 1.4s ease-in-out infinite; }
@keyframes coachpulse { 0%,100% { opacity: 0.65; } 50% { opacity: 1; } }
@keyframes coachtap { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@media (prefers-reduced-motion: reduce) { .coach, .finger { animation: none; } .coach { opacity: 0.9; } }
```

- [ ] **Step 3: Wire it into SpinOverlay (show once per session, until first spin)**

In `components/r3f/kit/SpinOverlay.tsx`: add `import { useState } from "react";` and `import { SpinCoach } from "./SpinCoach";`. Inside the component, seed the show-state from sessionStorage and hide it on first spin:

```tsx
  const [coach, setCoach] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setCoach(window.sessionStorage.getItem("stw-coach-done") !== "1");
  }, []);
  const handleSpin = () => {
    if (coach) { window.sessionStorage.setItem("stw-coach-done", "1"); setCoach(false); }
    onSpin();
  };
```

(add `import { useEffect } from "react";` too). Change the CTA `onClick` from `onSpin` to `handleSpin`, and render the coach under the CTA row, only when `status === "idle"`:

```tsx
        {status === "idle" && <SpinCoach show={coach} />}
```

- [ ] **Step 4: Run tests + tsc**

Run: `npx vitest run components/r3f/kit/SpinCoach.test.tsx components/r3f/kit/SpinOverlay.test.tsx && npx tsc --noEmit` — Expected: PASS (the SpinOverlay spin-button test still triggers `onSpin` — `handleSpin` calls it).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/SpinCoach.tsx components/r3f/kit/spinCoach.module.css components/r3f/kit/SpinCoach.test.tsx components/r3f/kit/SpinOverlay.tsx
git commit -m "feat(overlay): first-load 'tap to spin' coachmark (session-guarded, reduced-motion safe)"
```

---

### Task 7: Theme fallbacks (+ fix Alchemy's generic copy)

**Files:**
- Modify: `components/r3f/jackpot/theme.ts`, `components/r3f/alchemy/theme.ts`, `components/r3f/slots/book-of-ra/theme.ts`, `components/r3f/slots/gates-of-olympus/theme.ts`
- Test: `components/r3f/slots/themes.test.ts` (or a new `components/r3f/themesCopy.test.ts`)

**Interfaces:**
- Consumes: `OverlayCopy.offerHeadline/offerSubline` + `ConversionConfig.scarcity` (Task 1).
- Produces: each theme's `*Copy` has `offerHeadline`/`offerSubline`; each `*Conversion` has `scarcity`.

- [ ] **Step 1: Add offer copy + scarcity to each theme**

For each theme's `OverlayCopy` object add `offerHeadline`/`offerSubline`, and to its `withConversionDefaults({...})` add `scarcity`. Exact values:

- `jackpot/theme.ts` — `jackpotCopy`: `offerHeadline: "Win up to €1,000", offerSubline: "+ 200 Free Spins"`. `jackpotConversion`: `scarcity: { total: 50 }`. Also set `heading` to a short theme line if it reads as a title (keep `"BOOM your luck"`).
- `alchemy/theme.ts` — its copy currently falls back to the generic default; give it real themed copy: `heading: "Brew your fortune"`, `subtitle: "Mix the potion, win the bonus"`, `offerHeadline: "Win up to €500", offerSubline: "+ 150 Free Spins"`, and `scarcity: { total: 40 }` on its conversion. (If alchemy has no dedicated `*Copy`/`*Conversion` export and reuses jackpot's, create proper alchemy ones mirroring jackpot's shape — check the alchemy scene's imports first.)
- `slots/book-of-ra/theme.ts` — copy: `offerHeadline: "Win up to €500", offerSubline: "+ 200 Free Spins"`; conversion: `scarcity: { total: 45 }`.
- `slots/gates-of-olympus/theme.ts` — copy: `offerHeadline: "Win up to €1,000", offerSubline: "+ 500 Free Spins + ×500"`; conversion: `scarcity: { total: 60 }`.

- [ ] **Step 2: Data-validation test**

Create `components/r3f/themesCopy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { jackpotCopy, jackpotConversion } from "./jackpot/theme";
import { bookOfRaCopy, bookOfRaConversion } from "./slots/book-of-ra/theme";
import { gatesCopy, gatesConversion } from "./slots/gates-of-olympus/theme";
// import alchemy copy/conversion using its actual export names

describe("theme offer copy", () => {
  it("every theme has an offer headline + scarcity total", () => {
    for (const [copy, conv] of [
      [jackpotCopy, jackpotConversion],
      [bookOfRaCopy, bookOfRaConversion],
      [gatesCopy, gatesConversion],
    ] as const) {
      expect(copy.offerHeadline && copy.offerHeadline.length).toBeTruthy();
      expect(conv.scarcity?.total).toBeGreaterThan(0);
    }
  });
});
```

(Adjust the import names to the real exports; add the alchemy pair once you've confirmed its export names.)

Run: `npx vitest run components/r3f/themesCopy.test.ts && npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/r3f/jackpot/theme.ts components/r3f/alchemy/theme.ts "components/r3f/slots/book-of-ra/theme.ts" "components/r3f/slots/gates-of-olympus/theme.ts" components/r3f/themesCopy.test.ts
git commit -m "feat(themes): offer copy + scarcity fallbacks; real Alchemy copy"
```

---

### Task 8: 2D `WheelClient` mirrors the redesign

**Files:**
- Modify: `app/[domain]/Wheel.client.tsx`, `app/globals.css`
- Test: `app/[domain]/Wheel.client.test.tsx`

**Interfaces:**
- Consumes: `OfferBanner` (Task 3), `ScarcityLine` (Task 4), `landing.texts.offerHeadline/offerSubline` + `landing.bonusesTotal` (Task 1).
- Produces: the 2D wheel shows the offer banner + scarcity line (the 2D keeps its own DOM countdown/trust as-is; just add offer + scarcity for parity).

- [ ] **Step 1: Failing test**

In `app/[domain]/Wheel.client.test.tsx`, extend `view()` with `texts.offerHeadline: "Win up to €500"`, `texts.offerSubline: "+ 200 FS"`, and `bonusesTotal: 30` (top-level). Add:

```tsx
  it("shows the offer banner and scarcity line", () => {
    render(<WheelClient landing={view()} navigate={() => {}} />);
    expect(screen.getByTestId("offer-banner")).toHaveTextContent("Win up to €500");
    expect(screen.getByTestId("scarcity-line")).toHaveTextContent(/of 30 bonuses left/i);
  });
```

Run: `npx vitest run "app/[domain]/Wheel.client.test.tsx"` — Expected: FAIL.

- [ ] **Step 2: Wire it**

In `app/[domain]/Wheel.client.tsx`, add imports:

```ts
import { OfferBanner } from "@/components/r3f/kit/OfferBanner";
import { ScarcityLine } from "@/components/r3f/kit/ScarcityLine";
```

Render the offer banner above the `.wheel-stage` (as a fragment sibling, like the LossBurst fix) and the scarcity line near the spins-left bar. At the top of the returned fragment (before `<div className="wheel-stage …">`):

```tsx
      <OfferBanner headline={landing.texts.offerHeadline} subline={landing.texts.offerSubline} />
```

and right after the existing `spins-left` `<p>` block:

```tsx
      {landing.bonusesTotal > 0 && <ScarcityLine total={landing.bonusesTotal} />}
```

- [ ] **Step 3: Minimal CSS**

In `app/globals.css`, add a small wrapper rule if needed so the offer banner sits centered above the wheel stage (the `.landing` flex column already centers; ensure the banner has `width: 100%`). Add:

```css
.landing [data-testid="offer-banner"] { width: 100%; }
```

- [ ] **Step 4: Run tests + tsc**

Run: `npx vitest run "app/[domain]/Wheel.client.test.tsx" && npm test && npx tsc --noEmit` — Expected: PASS; full suite green.

- [ ] **Step 5: Commit**

```bash
git add "app/[domain]/Wheel.client.tsx" "app/[domain]/Wheel.client.test.tsx" app/globals.css
git commit -m "feat(2d): offer banner + scarcity line on the classic wheel"
```

---

### Task 9: Editor — Conversion field group

**Files:**
- Modify: `lib/admin/types.ts`, `lib/admin/landingService.ts`, `lib/admin/validation.ts`, `components/admin/ContentTab.tsx`
- Test: `components/admin/ContentTab.test.tsx`, `lib/admin/validation.test.ts`

**Interfaces:**
- Consumes: the DB fields (Task 1).
- Produces: `EditableLanding` carries `offerHeadline`/`offerSubline`/`bonusesTotal`/`countdownMinutes`; the Content tab edits them and the save payload + `patchSchema` include them.

- [ ] **Step 1: Extend `EditableLanding` + `getEditableLanding`**

In `lib/admin/types.ts`, add to `EditableLanding` (after `winText: string;`):

```ts
  offerHeadline: string; offerSubline: string; bonusesTotal: number; countdownMinutes: number;
```

In `lib/admin/landingService.ts`, add the four fields to the `getEditableLanding` Prisma `select` (next to `winText: true`) and to the returned object (they map 1:1).

- [ ] **Step 2: Extend `patchSchema`**

In `lib/admin/validation.ts`, add to the landing `patchSchema` (zod) — strings optional, ints coerced/bounded:

```ts
  offerHeadline: z.string().max(80).optional(),
  offerSubline: z.string().max(80).optional(),
  bonusesTotal: z.coerce.number().int().min(0).max(100000).optional(),
  countdownMinutes: z.coerce.number().int().min(1).max(1440).optional(),
```

- [ ] **Step 3: Failing test — validation accepts the fields**

In `lib/admin/validation.test.ts`, add:

```ts
  it("accepts conversion fields", () => {
    const r = patchSchema.safeParse({ offerHeadline: "Win up to €500", offerSubline: "+ 200 FS", bonusesTotal: 50, countdownMinutes: 7 });
    expect(r.success).toBe(true);
  });
  it("rejects countdownMinutes below 1", () => {
    expect(patchSchema.safeParse({ countdownMinutes: 0 }).success).toBe(false);
  });
```

Run: `npx vitest run lib/admin/validation.test.ts` — Expected: PASS (after Step 2). If it fails because `patchSchema` is named differently, use the actual exported schema name.

- [ ] **Step 4: ContentTab — Conversion group + save payload**

In `components/admin/ContentTab.tsx`, add a **"Conversion"** `<fieldset>`/group with four inputs bound to the editable state, following the existing field components used for `winText`/`heading` (text inputs for `offerHeadline`/`offerSubline`, number inputs for `bonusesTotal`/`countdownMinutes`), each with an `aria-label`. Extend the tab's `save()` payload to include `offerHeadline`, `offerSubline`, `bonusesTotal`, `countdownMinutes` (mirror exactly how `winText` is included).

- [ ] **Step 5: Failing test — ContentTab edits + saves the fields**

In `components/admin/ContentTab.test.tsx`, mirror the existing `winText` test: render the tab, assert the offer-headline input shows the seeded value, type a new value, click save, and assert the save payload includes the four conversion fields. (Use the file's existing render + mocked-save harness.)

Run: `npx vitest run components/admin/ContentTab.test.tsx` — Expected: PASS.

- [ ] **Step 6: Run full suite + tsc, commit**

Run: `npm test && npx tsc --noEmit` — Expected: full suite green, exit 0.

```bash
git add lib/admin/types.ts lib/admin/landingService.ts lib/admin/validation.ts components/admin/ContentTab.tsx components/admin/ContentTab.test.tsx lib/admin/validation.test.ts
git commit -m "feat(admin): Conversion field group (offer/scarcity/countdown) in the Content tab"
```

---

### Task 10: Visual verification across the 5 landings

**Files:** none (verification only); may add a throwaway screenshot script under `/tmp`.

- [ ] **Step 1: Build + run**

Run the app (dev `npm run dev` on :3000, or the alt-port harness if :3000 is busy — see the project's e2e notes). Seed has jackpot/book-of-ra/2D landings; the prototype routes cover all four themes (`/prototypes/3d/{jackpot-vault,alchemy-lab,book-of-ra,gates-of-olympus}`).

- [ ] **Step 2: Screenshot idle on all five**

Capture idle (430×932) for: 2D wheel (`localhost:3000`), jackpot, alchemy, book-of-ra, gates. Confirm: the **offer headline** leads the page; the **scarcity line** shows under the social proof; the **countdown sits on the SPIN button row**; the dead space is tightened; the **coachmark** shows on first load and disappears after a spin; **Alchemy now has real themed copy** (no "Spin the Wheel" default).

- [ ] **Step 3: Reduced-motion pass**

With `reducedMotion: "reduce"`, confirm the coachmark/pulse are static (not animated) and nothing is broken.

- [ ] **Step 4: Configured-landing check**

For a DB landing (e.g. jackpot seed), set `offerHeadline`/`bonusesTotal`/`countdownMinutes` via the admin Content tab (or DB), reload, and confirm the page reflects the admin values (offer text, scarcity total, countdown duration).

- [ ] **Step 5: Record results**

Note the screenshots + outcomes; delete any throwaway scripts/domains. No commit unless fixes were needed (commit those with a clear message).

---

## Self-Review

**Spec coverage (Phase A scope):**
- §4 data model (offerHeadline/offerSubline/bonusesTotal/countdownMinutes) → Task 1; `buildSceneConfig` map → Task 2. ✓
- §5 OfferBanner → Task 3; ScarcityLine → Task 4; Countdown-on-CTA + focal-flow tightening → Task 5; coachmark → Task 6. ✓
- §5 OverlayCopy/ConversionConfig type additions → Task 1. ✓
- §8 editor Conversion group → Task 9. ✓
- §9 themes fallback + Alchemy fix + all-5 coverage → Task 7 (themes) + Task 5 (shared overlay = all 4 R3F) + Task 8 (2D) + Task 10 (verify). ✓
- §10 reduced-motion gating → Task 6 (coachmark CSS) + Task 5 (no new always-on motion). ✓
- §11 testing (components, buildSceneConfig, editor, visual) → each task + Task 10. ✓
- Phase B (social feed/PlayingNow) and Phase C (WinSheet funnel) are explicitly **out of scope** for this plan (separate plans).

**Placeholder scan:** Task 7 and Task 9 reference "the actual export names / the file's existing harness" because they extend existing files whose exact local names the implementer must read — but the precise fields, values, schema lines, and assertions are given verbatim, so nothing is left unspecified. No "TBD/handle errors". ✓

**Type consistency:** `offerHeadline`/`offerSubline` (string) and `bonusesTotal`/`countdownMinutes` (number) are identical across DB (Task 1), `LandingTexts`/`LandingView` (Task 1), `toLandingView` (Task 1), `buildSceneConfig` (Task 2), `OverlayCopy`/`ConversionConfig` (Task 1), themes (Task 7), 2D view (Task 8), and `EditableLanding`/`patchSchema` (Task 9). `OfferBanner({headline,subline})`, `ScarcityLine({total})`, `scarcityLeft(total,rand)`, `SpinCoach({show})` signatures are defined in Tasks 3/4/6 and consumed identically in Tasks 5/8. `data-testid`s (`offer-banner`, `scarcity-line`, `spin-coach`, preserved `countdown`/`spins-left`/`spin-button`) are consistent. ✓

## Out of scope (later phases / plans)
Phase B — rotating winner feed + `PlayingNow` presence (+ `socialProofOn` field). Phase C — WinSheet single-field capture + trust/payment badges. The reward-ladder and sticky-chip layout variants. Real winner data / analytics / A-B testing.
