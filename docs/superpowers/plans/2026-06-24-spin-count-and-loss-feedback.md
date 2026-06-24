# Spin-count fused button + red loss-burst — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fuse the "spins left" count onto the SPIN button as a bold gold bar, and add a red flash + whole-scene shake + popping "Almost!" text on every losing (near-miss) spin, across all 5 landings.

**Architecture:** A new DOM `LossBurst` (the red mirror of the existing `WinBurst`) renders in the shared `SpinOverlay` on `status === "nearmiss"` and in the 2D `WheelClient` on `status === "almost"`. The loss text comes from each landing's `almostText` (threaded into `OverlayCopy.almostText` via `buildSceneConfig`). A single global `.shake` keyframe in `globals.css` is toggled on each scene's root while the loss is active. The spins-left indicator is restyled into a full-width bar welded to the top of the spin button.

**Tech Stack:** Next.js 15 App Router, React 19, CSS Modules + a global stylesheet, `@react-three/fiber`, Vitest + Testing Library.

## Global Constraints

- TypeScript strict; match existing style; no unrelated refactors.
- Unit tests: `npm test`; single file: `npx vitest run <path>`. `npx tsc --noEmit` must stay clean.
- Count copy: `🎯 {n} {n === 1 ? "spin" : "spins"} left` (the bar uppercases via CSS); shown only when `status` is `idle`/`nearmiss` (3D/slots) or `idle`/`almost` (2D); hidden while spinning and on win.
- Loss effect: red flash + whole-scene shake + the landing's `almostText` popping, ~0.6s, one-shot, on each near-miss; **no coins/confetti** on a loss.
- Both bursts are `pointer-events: none` and hidden under `@media (prefers-reduced-motion: reduce)` (same as `WinBurst`).
- Loss text reuses the existing `almostText` field — no new admin fields.
- Do not change the win celebration (`WinBurst`) or remove `kit/CoinStorm.tsx`.
- Commit after every task.

## File Structure

**New:** `components/r3f/kit/LossBurst.tsx`, `components/r3f/kit/lossBurst.module.css`.
**Modified:** `components/r3f/kit/types.ts` (`OverlayCopy.almostText`), `lib/sceneConfig.ts` (map almostText), `components/r3f/kit/SpinOverlay.tsx` + `spinOverlay.module.css` (fused bar + LossBurst), the 4 scenes (`shake` class on roots), `app/[domain]/Wheel.client.tsx` + `app/globals.css` (2D bar + LossBurst + the shared `.shake` keyframe).

---

### Task 1: `LossBurst` component + `almostText` plumbing

**Files:**
- Create: `components/r3f/kit/LossBurst.tsx`, `components/r3f/kit/lossBurst.module.css`
- Modify: `components/r3f/kit/types.ts`, `lib/sceneConfig.ts`
- Test: `components/r3f/kit/LossBurst.test.tsx`, `lib/sceneConfig.test.ts`

**Interfaces:**
- Produces: `LossBurst({ text }: { text: string })` — DOM red-flash + popping text, `data-testid="loss-burst"`. `OverlayCopy.almostText?: string`. `buildSceneConfig` sets `copy.almostText = view.texts.almostText`.

- [ ] **Step 1: Write the failing LossBurst test**

Create `components/r3f/kit/LossBurst.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LossBurst } from "./LossBurst";

describe("LossBurst", () => {
  it("renders the burst with the provided almost text", () => {
    render(<LossBurst text="Almost! Spin again" />);
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
    expect(screen.getByText("Almost! Spin again")).toBeInTheDocument();
  });
  it("renders the flash even with empty text", () => {
    render(<LossBurst text="" />);
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npx vitest run components/r3f/kit/LossBurst.test.tsx` — Expected: FAIL `Cannot find module './LossBurst'`.

- [ ] **Step 3: Implement `LossBurst`**

Create `components/r3f/kit/LossBurst.tsx`:

```tsx
"use client";
import css from "./lossBurst.module.css";

// The red mirror of WinBurst, shown on a losing (near-miss) spin: a one-shot red
// screen flash + a popping "almost" line. Pure DOM/CSS, pointer-events:none, hidden
// under reduced motion. No reward particles — those belong to the win only.
export function LossBurst({ text }: { text: string }) {
  return (
    <div className={css.wrap} data-testid="loss-burst" aria-hidden>
      <div className={css.flash} />
      {text && <div className={css.text}>{text}</div>}
    </div>
  );
}
```

Create `components/r3f/kit/lossBurst.module.css`:

```css
.wrap { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 5; }

.flash {
  position: absolute; inset: 0; mix-blend-mode: screen;
  background: radial-gradient(circle at 50% 46%, rgba(255, 48, 48, 0.7) 0%, rgba(190, 0, 0, 0.3) 32%, transparent 60%);
  animation: redflash 0.6s ease-out both;
}
@keyframes redflash {
  0% { opacity: 0; transform: scale(0.6); }
  18% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.3); }
}

.text {
  position: absolute; top: 36%; left: 0; right: 0; text-align: center; padding: 0 16px;
  font-weight: 900; font-size: clamp(28px, 8vw, 58px); letter-spacing: 1px; color: #fff;
  text-shadow: 0 2px 2px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 50, 50, 0.95);
  animation: losspop 0.6s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}
@keyframes losspop {
  0% { opacity: 0; transform: scale(0.6); }
  22% { opacity: 1; transform: scale(1.08); }
  70% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.02); }
}

@media (prefers-reduced-motion: reduce) { .wrap { display: none; } }
```

- [ ] **Step 4: Add `almostText` to `OverlayCopy` + map it in `buildSceneConfig`**

In `components/r3f/kit/types.ts`, add to `OverlayCopy` after the `nearMissLine` line:

```ts
  almostText?: string;     // the "almost!" line popped by LossBurst on a near-miss
```

In `lib/sceneConfig.ts`, add `almostText` to the `copy` object:

```ts
    copy: {
      heading: view.texts.heading,
      subtitle: view.texts.subtitle,
      winTitle: view.texts.winTitle,
      winPrize: prize,
      nearMissLine: view.texts.almostText,
      almostText: view.texts.almostText,
    },
```

- [ ] **Step 5: Failing then passing buildSceneConfig assertion**

In `lib/sceneConfig.test.ts`, in the first `buildSceneConfig` test (the `view` fixture has `texts.almostText: "Almost"`), add after the `nearMissLine`/`winTitle` assertions block (the test that already checks `copy?.winTitle`):

```ts
    expect(c.copy?.almostText).toBe("Almost");
```

Run: `npx vitest run lib/sceneConfig.test.ts components/r3f/kit/LossBurst.test.tsx && npx tsc --noEmit`
Expected: PASS, exit 0.

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/LossBurst.tsx components/r3f/kit/lossBurst.module.css components/r3f/kit/LossBurst.test.tsx components/r3f/kit/types.ts lib/sceneConfig.ts lib/sceneConfig.test.ts
git commit -m "feat: LossBurst (red flash + almost pop) + thread almostText into scene copy"
```

---

### Task 2: SpinOverlay — fused count bar + render LossBurst on near-miss

**Files:**
- Modify: `components/r3f/kit/SpinOverlay.tsx`, `components/r3f/kit/spinOverlay.module.css`
- Test: `components/r3f/kit/SpinOverlay.test.tsx`

**Interfaces:**
- Consumes: `LossBurst` (Task 1), `copy.almostText` (Task 1).
- Produces: SpinOverlay renders `LossBurst` (`data-testid="loss-burst"`) on `status === "nearmiss"`; the spins-left element is a fused bar (`data-testid="spins-left"` unchanged).

- [ ] **Step 1: Failing test — LossBurst gating**

Append to `components/r3f/kit/SpinOverlay.test.tsx` (the file has a `renderAt(status, spinsLeft?)` helper and a `copy` fixture — extend `copy` to include `almostText: "Almost! Spin again"` by adding that property to the existing `copy` object literal, then add):

```tsx
describe("SpinOverlay loss burst", () => {
  it("shows the loss burst with the almost text on near-miss", () => {
    renderAt("nearmiss", 1);
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
    expect(screen.getByText("Almost! Spin again")).toBeInTheDocument();
  });
  it("does not show the loss burst on idle, spinning, or win", () => {
    renderAt("idle", 2);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
    renderAt("spinning", 2);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
    renderAt("won", 0);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
  });
});
```

Run: `npx vitest run components/r3f/kit/SpinOverlay.test.tsx` — Expected: FAIL (`loss-burst` not rendered).

- [ ] **Step 2: Render LossBurst + restyle the count to a fused bar (JSX)**

In `components/r3f/kit/SpinOverlay.tsx`:

Add the import near the other kit imports:

```ts
import { LossBurst } from "./LossBurst";
```

Replace the spins-left `<p>` block with the fused bar (emphasised number, uppercased via CSS):

```tsx
        {spinsLeft != null && (status === "idle" || status === "nearmiss") && (
          <p className={css.spinsLeft} data-testid="spins-left">
            🎯 <b>{spinsLeft}</b> {spinsLeft === 1 ? "spin" : "spins"} left
          </p>
        )}
```

Add the LossBurst render right before the existing `{status === "won" && <WinBurst />}` line:

```tsx
      {status === "nearmiss" && <LossBurst text={copy.almostText ?? ""} />}
      {status === "won" && <WinBurst />}
```

- [ ] **Step 3: Fused-bar styles**

In `components/r3f/kit/spinOverlay.module.css`, replace the existing `.spinsLeft` rule (the small pill) with the fused bar + the adjacent-button squaring:

```css
.spinsLeft { margin: 0; align-self: center; width: min(360px, 100%); box-sizing: border-box;
  text-align: center; text-transform: uppercase; font-weight: 900; font-size: 14px; letter-spacing: 1.5px;
  color: var(--gold); padding: 8px 14px; border-radius: 14px 14px 0 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 8%), color-mix(in srgb, var(--surface) 82%, black 18%));
  border: 1px solid color-mix(in srgb, var(--gold) 50%, transparent); border-bottom: none;
  text-shadow: 0 0 10px color-mix(in srgb, var(--gold) 45%, transparent);
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.3); }
.spinsLeft b { font-size: 1.5em; vertical-align: -1px; }
/* When the bar is shown it sits flush on the CTA: square the CTA's top so they fuse. */
.spinsLeft + .cta { border-top-left-radius: 0; border-top-right-radius: 0; }
```

- [ ] **Step 4: Run tests + tsc**

Run: `npx vitest run components/r3f/kit/SpinOverlay.test.tsx && npx tsc --noEmit`
Expected: PASS, exit 0 (the existing spins-left tests still pass — the testid + "spins"/"spin" text are preserved).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/SpinOverlay.tsx components/r3f/kit/spinOverlay.module.css components/r3f/kit/SpinOverlay.test.tsx
git commit -m "feat(overlay): fuse the spins-left bar onto the SPIN button + render LossBurst on near-miss"
```

---

### Task 3: Whole-scene shake on the 4 r3f scene roots

**Files:**
- Modify: `app/globals.css` (the shared `.shake` keyframe — `globals.css` is imported in the root layout so the class is global), `components/r3f/jackpot/JackpotVaultScene.tsx`, `components/r3f/alchemy/AlchemyLabScene.tsx`, `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`, `components/r3f/slots/gates-of-olympus/GatesScene.tsx`

**Interfaces:**
- Produces: a global `.shake` class (one-shot ~0.5s jitter, reduced-motion gated) applied to each 3D/slot scene's root while `status === "nearmiss"`.

- [ ] **Step 1: Add the shared `.shake` keyframe**

In `app/globals.css`, append:

```css
/* One-shot screen shake for a losing spin. Applied to a scene root while it is in the
   near-miss state; the transform also shakes any position:fixed descendants (overlay). */
.shake { animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
@keyframes shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-7px, 0, 0); }
  40%, 60% { transform: translate3d(7px, 0, 0); }
}
@media (prefers-reduced-motion: reduce) { .shake { animation: none; } }
```

- [ ] **Step 2: Apply to the 3D wheel scene roots**

In `components/r3f/jackpot/JackpotVaultScene.tsx`, change the main return's shell root to add the shake class while in near-miss. Find:

```tsx
    <div className={shell.shell} style={{ "--base": "#070D0B", "--glow": "#F5C24B", "--glow2": "#5BE36A" } as CSSProperties}>
```

and replace with:

```tsx
    <div className={`${shell.shell}${status === "nearmiss" ? " shake" : ""}`} style={{ "--base": "#070D0B", "--glow": "#F5C24B", "--glow2": "#5BE36A" } as CSSProperties}>
```

In `components/r3f/alchemy/AlchemyLabScene.tsx`, do the same to its shell root. Find:

```tsx
    <div className={shell.shell} style={{ "--base": "#0A1A14", "--glow": "#8BFF5A", "--glow2": "#F5C24B" } as CSSProperties}>
```

and replace with:

```tsx
    <div className={`${shell.shell}${status === "nearmiss" ? " shake" : ""}`} style={{ "--base": "#0A1A14", "--glow": "#8BFF5A", "--glow2": "#F5C24B" } as CSSProperties}>
```

- [ ] **Step 3: Apply to the slot scene roots (both return trees)**

In `components/r3f/slots/book-of-ra/BookOfRaScene.tsx`, both root `<div>`s are inline-styled with no className. Add the shake class to BOTH. The `!webgl` fallback:

```tsx
      <div className={status === "nearmiss" ? "shake" : undefined} style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #4a2f10 0%, #1a0f04 70%)" }}>
```

and the main return:

```tsx
    <div className={status === "nearmiss" ? "shake" : undefined} style={{ position: "fixed", inset: 0, background: "#1a0f04" }}>
```

In `components/r3f/slots/gates-of-olympus/GatesScene.tsx`, apply the same `className={status === "nearmiss" ? "shake" : undefined}` to BOTH of its root `<div>`s (the `!webgl` fallback and the main return), preserving each div's existing inline `style`. (Open the file to read its exact two root `style` values; only the `className` is added.)

- [ ] **Step 4: Typecheck + prototype smoke**

Run: `npx tsc --noEmit && npm test`
Expected: exit 0; full unit suite still green (no scene unit tests — the shake is verified visually in Task 4).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css components/r3f/jackpot/JackpotVaultScene.tsx components/r3f/alchemy/AlchemyLabScene.tsx components/r3f/slots/book-of-ra/BookOfRaScene.tsx components/r3f/slots/gates-of-olympus/GatesScene.tsx
git commit -m "feat: whole-scene shake on a losing spin (3D wheels + slots)"
```

---

### Task 4: 2D wheel — fused bar + LossBurst + shake, then verify

**Files:**
- Modify: `app/[domain]/Wheel.client.tsx`, `app/globals.css`
- Test: `app/[domain]/Wheel.client.test.tsx`

**Interfaces:**
- Consumes: `LossBurst` (Task 1), the global `.shake` class (Task 3).
- Produces: the 2D wheel shows the fused count bar, a `LossBurst` (`data-testid="loss-burst"`) on `status === "almost"`, and shakes its stage.

- [ ] **Step 1: Failing test — 2D loss burst**

In `app/[domain]/Wheel.client.test.tsx`, add (the file has `view()` with `spin.spinsBeforeWin: 2` and a `fireTransitionEnd()` helper):

```tsx
  it("shows the loss burst on a near-miss and not before", async () => {
    render(<WheelClient landing={view()} navigate={() => {}} />);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
    await userEvent.click(screen.getByTestId("spin-button"));
    fireTransitionEnd(); // spin 1 -> almost
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
  });
```

Run: `npx vitest run "app/[domain]/Wheel.client.test.tsx"` — Expected: FAIL (`loss-burst` not present).

- [ ] **Step 2: Wire the 2D landing**

In `app/[domain]/Wheel.client.tsx`, add the import:

```ts
import { LossBurst } from "@/components/r3f/kit/LossBurst";
```

Change the wheel-stage root to shake on a near-miss — replace:

```tsx
    <div className="wheel-stage">
```

with:

```tsx
    <div className={`wheel-stage${status === "almost" ? " shake" : ""}`}>
```

Restyle the count line to the bar shape (emphasised number, uppercased via CSS) — replace:

```tsx
      {(status === "idle" || status === "almost") && (
        <p className="spins-left" data-testid="spins-left">
          🎯 {spinsLeft} {spinsLeft === 1 ? "spin" : "spins"} left to win
        </p>
      )}
```

with:

```tsx
      {(status === "idle" || status === "almost") && (
        <p className="spins-left" data-testid="spins-left">
          🎯 <b>{spinsLeft}</b> {spinsLeft === 1 ? "spin" : "spins"} left
        </p>
      )}
```

Render the LossBurst on a near-miss — add it right after the existing `{status === "almost" && (...almost-text...)}` block:

```tsx
      {status === "almost" && <LossBurst text={landing.texts.almostText} />}
```

- [ ] **Step 3: Restyle the 2D `.spins-left` into the bold bar**

In `app/globals.css`, replace the existing `.spins-left` rule with:

```css
.spins-left {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 5;
  text-transform: uppercase;
  color: var(--gold);
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 1.5px;
  padding: 8px 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, black 8%), color-mix(in srgb, var(--surface) 82%, black 18%));
  border: 1px solid color-mix(in srgb, var(--gold) 50%, transparent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--gold) 45%, transparent);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
.spins-left b { font-size: 1.5em; vertical-align: -1px; }
```

- [ ] **Step 4: Run tests + tsc**

Run: `npx vitest run "app/[domain]/Wheel.client.test.tsx" && npm test && npx tsc --noEmit`
Expected: PASS; full suite green (the existing `almost-text` + `spins-left` assertions still hold). Exit 0.

- [ ] **Step 5: Visual verification**

Build + run the app (alt-port harness if 3000 is busy: a `playwright.config` override with `webServer: undefined` + `baseURL` of a manually-started server, throwaway `:<port>` domain rows). Screenshot:
1. A 3D wheel idle → the gold count bar is welded on the SPIN button.
2. A 3D wheel mid near-miss (between the first spin landing and the re-spin) → red flash + "Almost!" pop + the scene shaken.
3. A slot near-miss → same.
Confirm reduced-motion hides both bursts. Delete throwaway files/domains afterward; never kill an unrelated server on :3000.

- [ ] **Step 6: Commit**

```bash
git add "app/[domain]/Wheel.client.tsx" "app/[domain]/Wheel.client.test.tsx" app/globals.css
git commit -m "feat: 2D wheel joins the fused count bar + red loss-burst + shake"
```

---

## Self-Review

**Spec coverage:**
- §3 fused count bar (3D/slots + 2D) → Tasks 2 + 4. ✓
- §4 LossBurst (red flash + almost pop) → Task 1 (component) + Tasks 2/4 (render). ✓
- §4 whole-scene shake → Task 3 (3D/slots) + Task 4 (2D stage). ✓
- §5 `OverlayCopy.almostText` + buildSceneConfig mapping → Task 1. ✓
- §5 renders on all 5 (2 wheels + 2 slots via SpinOverlay; 2D via WheelClient) → Tasks 2 + 4. ✓
- §7 testing (LossBurst gating, bar text, buildSceneConfig, 2D loss, reduced-motion) → each task + Task 4 visual. ✓

**Placeholder scan:** Task 3 Step 3 says "apply the same className to both root divs" for `GatesScene` and tells the implementer to read its two exact `style` values — the className being added is shown verbatim and is the only change, so no logic is left unwritten. No "TBD/handle errors". ✓

**Type consistency:** `LossBurst({ text: string })` defined in Task 1, consumed identically in Tasks 2 & 4. `OverlayCopy.almostText?: string` (Task 1) is read as `copy.almostText` (Task 2). The global `.shake` class (Task 3) is applied by class name in Tasks 3 & 4. `data-testid` values (`loss-burst`, `spins-left`) are consistent across overlay + 2D. ✓

## Known minor notes
- The 2D shake moves the wheel stage (wheel + button + count), not the page heading — the full-screen red flash still covers everything, so the loss reads scene-wide.
- The 2D keeps its small persistent `almost-text` at the bottom; the LossBurst pop is mid-screen, so they don't collide.
