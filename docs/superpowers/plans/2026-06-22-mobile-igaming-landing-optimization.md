# Mobile i-Gaming Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two 3D spin landings (Jackpot Vault, Alchemy Lab) mobile-first and conversion-driving: immersive idle → spin → win → Claim → inline register → redirect, with urgency, social proof, trust, and haptics — without changing desktop behaviour.

**Architecture:** Evolve the single shared kit (`components/r3f/kit`) into a responsive system. The two page files stay one-liners; per-page difference is data only (a new themed `ConversionConfig` plus the existing `OverlayVars`). Pure logic (camera fit, countdown, social-proof, claim state machine, haptics) is split into tested functions; thin components/hooks consume them.

**Tech Stack:** Next 15 (App Router), React 19, React Three Fiber 9 + drei 10, TypeScript 5.7, CSS Modules, Vitest 2 (jsdom + Testing Library), Playwright 1.49.

## Global Constraints

- Test runner: `npm test` (vitest run). Tests are `*.test.ts(x)` co-located next to source. jsdom env, globals on, `@/*` → repo root, jest-dom matchers available.
- E2E: `npm run e2e` (Playwright, `tests/e2e/*.spec.ts`). Select by `data-testid`. Use the `reducedMotion: "reduce"` fixture to shorten the demo spin to ~250ms.
- All new kit code lives under `components/r3f/kit/`. Keep files small and single-responsibility.
- Per-page difference is **data only** — no bespoke layout code in page files or scenes beyond passing config.
- Reduced-motion (`prefers-reduced-motion: reduce`) MUST disable haptics, sheet slide animation, social-proof auto-rotation, and the float/sparkles (existing behaviour).
- Preserve existing test IDs: `spin-button`, `sound-toggle`, `win-modal`. New IDs: `claim-open`, `claim-field`, `claim-submit`, `social-proof`, `countdown`, `trust-bar`.
- Desktop (≥700px / landscape with height) behaviour must remain visually unchanged except the new idle accelerant strip and the win sheet replacing the old modal card.
- Commit after every task with a `feat:`/`refactor:`/`test:` message.

---

### Task 1: `ConversionConfig` type + themed configs + defaults helper

**Files:**
- Modify: `components/r3f/kit/types.ts`
- Create: `components/r3f/kit/conversion.ts`
- Create: `components/r3f/kit/conversion.test.ts`
- Modify: `components/r3f/jackpot/theme.ts`
- Modify: `components/r3f/alchemy/theme.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type RegisterField = "email" | "tel"`
  - `type SocialProofItem = { name: string; amount: string; minutesAgo: number }`
  - `type ConversionConfig = { prize: string; claimLabel: string; registerField: RegisterField; registerPlaceholder: string; redirectUrl: string; urgencyMs: number; social: { winners: SocialProofItem[]; todayCount: number }; trust: string }`
  - `withConversionDefaults(partial: Partial<ConversionConfig>): ConversionConfig`
  - `jackpotConversion: ConversionConfig`, `alchemyConversion: ConversionConfig`

- [ ] **Step 1: Add types to `types.ts`**

Append to `components/r3f/kit/types.ts`:

```ts
export type RegisterField = "email" | "tel";

export type SocialProofItem = { name: string; amount: string; minutesAgo: number };

export type ConversionConfig = {
  prize: string;
  claimLabel: string;
  registerField: RegisterField;
  registerPlaceholder: string;
  redirectUrl: string;
  urgencyMs: number;
  social: { winners: SocialProofItem[]; todayCount: number };
  trust: string;
};
```

- [ ] **Step 2: Write the failing test**

Create `components/r3f/kit/conversion.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { withConversionDefaults } from "./conversion";

describe("withConversionDefaults", () => {
  it("fills defaults when given an empty partial", () => {
    const c = withConversionDefaults({});
    expect(c.registerField).toBe("email");
    expect(c.urgencyMs).toBe(600_000);
    expect(c.claimLabel).toMatch(/claim/i);
    expect(Array.isArray(c.social.winners)).toBe(true);
    expect(c.social.winners.length).toBeGreaterThan(0);
    expect(c.trust).toMatch(/18\+/);
  });

  it("overrides only the provided fields", () => {
    const c = withConversionDefaults({ prize: "500 Free Spins", registerField: "tel" });
    expect(c.prize).toBe("500 Free Spins");
    expect(c.registerField).toBe("tel");
    expect(c.urgencyMs).toBe(600_000); // still default
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- conversion`
Expected: FAIL — cannot find module `./conversion`.

- [ ] **Step 4: Implement `conversion.ts`**

Create `components/r3f/kit/conversion.ts`:

```ts
import type { ConversionConfig } from "./types";

const DEFAULTS: ConversionConfig = {
  prize: "500 Free Spins",
  claimLabel: "Claim my bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Aisha", amount: "€200", minutesAgo: 2 },
      { name: "Marco", amount: "€50", minutesAgo: 5 },
      { name: "Lena", amount: "100 FS", minutesAgo: 8 },
      { name: "Tom", amount: "€500", minutesAgo: 12 },
    ],
    todayCount: 2481,
  },
  trust: "🔞 18+ · 🔒 Secure · Play responsibly · T&Cs apply",
};

export function withConversionDefaults(partial: Partial<ConversionConfig>): ConversionConfig {
  return {
    ...DEFAULTS,
    ...partial,
    social: { ...DEFAULTS.social, ...(partial.social ?? {}) },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- conversion`
Expected: PASS (2 tests).

- [ ] **Step 6: Add themed configs**

Append to `components/r3f/jackpot/theme.ts`:

```ts
import { withConversionDefaults } from "../kit/conversion";

export const jackpotConversion = withConversionDefaults({
  prize: "1,000 Free Spins",
  claimLabel: "Claim jackpot bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register?src=jackpot-vault",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Aisha", amount: "€500", minutesAgo: 2 },
      { name: "Marco", amount: "JACKPOT", minutesAgo: 6 },
      { name: "Lena", amount: "€200", minutesAgo: 9 },
    ],
    todayCount: 3127,
  },
});
```

Append to `components/r3f/alchemy/theme.ts`:

```ts
import { withConversionDefaults } from "../kit/conversion";

export const alchemyConversion = withConversionDefaults({
  prize: "500 Free Spins",
  claimLabel: "Claim my potion →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register?src=alchemy-lab",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Nadia", amount: "200 FS", minutesAgo: 1 },
      { name: "Yusuf", amount: "€100", minutesAgo: 4 },
      { name: "Eva", amount: "€50", minutesAgo: 7 },
    ],
    todayCount: 1894,
  },
});
```

- [ ] **Step 7: Verify the whole suite still passes**

Run: `npm test`
Expected: PASS (existing + new).

- [ ] **Step 8: Commit**

```bash
git add components/r3f/kit/types.ts components/r3f/kit/conversion.ts components/r3f/kit/conversion.test.ts components/r3f/jackpot/theme.ts components/r3f/alchemy/theme.ts
git commit -m "feat: ConversionConfig type, defaults helper, and themed configs"
```

---

### Task 2: Responsive camera fit (pure math + hook)

**Files:**
- Create: `components/r3f/kit/cameraFit.ts`
- Create: `components/r3f/kit/cameraFit.test.ts`
- Create: `components/r3f/kit/ResponsiveCamera.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `fitCameraDistance(opts: { radius: number; aspect: number; fovDeg: number; margin?: number }): number`
  - `<ResponsiveCamera radius={number} portraitBias?={number} />` — null-rendering component, must be a child of `<Canvas>`.

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/cameraFit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fitCameraDistance } from "./cameraFit";

describe("fitCameraDistance", () => {
  const fovDeg = 42;
  const radius = 2.1;

  it("frames the wheel within the vertical extent for a square viewport", () => {
    const d = fitCameraDistance({ radius, aspect: 1, fovDeg, margin: 1 });
    const halfV = d * Math.tan((fovDeg * Math.PI) / 180 / 2);
    expect(halfV).toBeCloseTo(radius, 5); // margin 1 → exact fit
  });

  it("pushes the camera further back on portrait so width still fits", () => {
    const square = fitCameraDistance({ radius, aspect: 1, fovDeg });
    const portrait = fitCameraDistance({ radius, aspect: 0.5, fovDeg });
    expect(portrait).toBeCloseTo(square * 2, 5); // half the width → twice the distance
  });

  it("never frames tighter than the narrow axis (margin leaves breathing room)", () => {
    const d = fitCameraDistance({ radius, aspect: 0.46, fovDeg, margin: 1.15 });
    const halfH = d * Math.tan((fovDeg * Math.PI) / 180 / 2) * 0.46;
    expect(halfH).toBeGreaterThan(radius); // wheel fits horizontally with room to spare
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cameraFit`
Expected: FAIL — cannot find module `./cameraFit`.

- [ ] **Step 3: Implement `cameraFit.ts`**

Create `components/r3f/kit/cameraFit.ts`:

```ts
// Distance at which a sphere/disc of `radius` fits the *narrow* viewport axis,
// given a vertical perspective FOV. On portrait (aspect < 1) the horizontal axis
// is the limiter, so the camera is pushed further back.
export function fitCameraDistance(opts: {
  radius: number;
  aspect: number;
  fovDeg: number;
  margin?: number;
}): number {
  const { radius, aspect, fovDeg, margin = 1.15 } = opts;
  const halfFov = (fovDeg * Math.PI) / 180 / 2;
  const t = Math.tan(halfFov);
  const narrow = Math.min(aspect, 1); // <1 on portrait
  return (radius * margin) / (t * narrow);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cameraFit`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the hook component**

Create `components/r3f/kit/ResponsiveCamera.tsx`:

```tsx
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { fitCameraDistance } from "./cameraFit";

export function ResponsiveCamera({ radius, portraitBias = 0.35 }: { radius: number; portraitBias?: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useEffect(() => {
    const aspect = width / height;
    camera.position.z = fitCameraDistance({ radius, aspect, fovDeg: camera.fov });
    const portrait = aspect < 1;
    camera.position.y = portrait ? portraitBias * radius : 0;
    camera.lookAt(0, camera.position.y * 0.4, 0);
    camera.updateProjectionMatrix();
  }, [camera, width, height, radius, portraitBias]);

  return null;
}
```

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/cameraFit.ts components/r3f/kit/cameraFit.test.ts components/r3f/kit/ResponsiveCamera.tsx
git commit -m "feat: responsive camera fit (pure math + R3F hook)"
```

---

### Task 3: Countdown logic + component

**Files:**
- Create: `components/r3f/kit/countdown.ts`
- Create: `components/r3f/kit/countdown.test.ts`
- Create: `components/r3f/kit/Countdown.tsx`
- Create: `components/r3f/kit/countdown.module.css`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatMMSS(ms: number): string`
  - `remainingMs(deadline: number, now: number): number`
  - `seedDeadline(key: string, durationMs: number, now: number, storage: Storage | null): number`
  - `<Countdown durationMs={number} storageKey={string} prominent?={boolean} />`

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/countdown.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { formatMMSS, remainingMs, seedDeadline } from "./countdown";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  } as Storage;
}

describe("countdown", () => {
  it("formats milliseconds as mm:ss, clamping at zero", () => {
    expect(formatMMSS(599_000)).toBe("09:59");
    expect(formatMMSS(0)).toBe("00:00");
    expect(formatMMSS(-1000)).toBe("00:00");
    expect(formatMMSS(65_000)).toBe("01:05");
  });

  it("clamps remaining at zero", () => {
    expect(remainingMs(1_000, 5_000)).toBe(0);
    expect(remainingMs(5_000, 1_000)).toBe(4_000);
  });

  it("seeds a deadline once and reuses it on reload", () => {
    const s = fakeStorage();
    const first = seedDeadline("k", 600_000, 1_000, s);
    expect(first).toBe(601_000);
    const second = seedDeadline("k", 600_000, 30_000, s); // later 'now', same key
    expect(second).toBe(601_000); // unchanged — persisted
  });

  it("works without storage (returns a fresh deadline)", () => {
    expect(seedDeadline("k", 600_000, 1_000, null)).toBe(601_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- countdown`
Expected: FAIL — cannot find module `./countdown`.

- [ ] **Step 3: Implement `countdown.ts`**

Create `components/r3f/kit/countdown.ts`:

```ts
export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

export function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function seedDeadline(key: string, durationMs: number, now: number, storage: Storage | null): number {
  const existing = storage?.getItem(key);
  if (existing) {
    const n = Number(existing);
    if (Number.isFinite(n)) return n;
  }
  const deadline = now + durationMs;
  storage?.setItem(key, String(deadline));
  return deadline;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- countdown`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the component + CSS**

Create `components/r3f/kit/countdown.module.css`:

```css
.wrap { display: inline-flex; flex-direction: column; gap: 4px; align-items: center; font-variant-numeric: tabular-nums; }
.label { font-size: 13px; opacity: .9; color: var(--text); }
.label.prominent { font-size: 15px; font-weight: 700; color: var(--gold); }
.bar { width: min(280px, 80vw); height: 4px; border-radius: 999px; background: color-mix(in srgb, var(--gold) 20%, transparent); overflow: hidden; }
.fill { height: 100%; background: var(--gold); transition: width .9s linear; }
```

Create `components/r3f/kit/Countdown.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import css from "./countdown.module.css";
import { formatMMSS, remainingMs, seedDeadline } from "./countdown";

export function Countdown({ durationMs, storageKey, prominent = false }: {
  durationMs: number; storageKey: string; prominent?: boolean;
}) {
  const deadline = useRef(seedDeadline(
    storageKey, durationMs, Date.now(),
    typeof window !== "undefined" ? window.sessionStorage : null,
  ));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingMs(deadline.current, now);
  const pct = Math.max(0, Math.min(100, (left / durationMs) * 100));
  const text = left > 0 ? `Bonus locked for ${formatMMSS(left)}` : "Last chance!";

  return (
    <div className={css.wrap} data-testid="countdown">
      <span className={`${css.label}${prominent ? " " + css.prominent : ""}`}>⏱ {text}</span>
      <span className={css.bar}><span className={css.fill} style={{ width: `${pct}%` }} /></span>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/countdown.ts components/r3f/kit/countdown.test.ts components/r3f/kit/Countdown.tsx components/r3f/kit/countdown.module.css
git commit -m "feat: urgency countdown (persisted deadline + draining bar)"
```

---

### Task 4: Social proof (seeded formatter + rotating component)

**Files:**
- Create: `components/r3f/kit/socialProof.ts`
- Create: `components/r3f/kit/socialProof.test.ts`
- Create: `components/r3f/kit/SocialProof.tsx`
- Create: `components/r3f/kit/socialProof.module.css`

**Interfaces:**
- Consumes: `SocialProofItem` from `./types`.
- Produces:
  - `formatWinner(item: SocialProofItem): string`
  - `nextIndex(i: number, len: number): number`
  - `<SocialProof winners={SocialProofItem[]} todayCount={number} reduced={boolean} />`

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/socialProof.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatWinner, nextIndex } from "./socialProof";

describe("socialProof", () => {
  it("formats a winner line deterministically", () => {
    expect(formatWinner({ name: "Aisha", amount: "€200", minutesAgo: 2 })).toBe("🔥 Aisha won €200 · 2m ago");
  });

  it("uses 'just now' for zero minutes", () => {
    expect(formatWinner({ name: "Eva", amount: "€50", minutesAgo: 0 })).toBe("🔥 Eva won €50 · just now");
  });

  it("rotates the index and wraps", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- socialProof`
Expected: FAIL — cannot find module `./socialProof`.

- [ ] **Step 3: Implement `socialProof.ts`**

Create `components/r3f/kit/socialProof.ts`:

```ts
import type { SocialProofItem } from "./types";

export function formatWinner(item: SocialProofItem): string {
  const when = item.minutesAgo <= 0 ? "just now" : `${item.minutesAgo}m ago`;
  return `🔥 ${item.name} won ${item.amount} · ${when}`;
}

export function nextIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return (i + 1) % len;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- socialProof`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement the component + CSS**

Create `components/r3f/kit/socialProof.module.css`:

```css
.wrap { display: flex; flex-direction: column; align-items: center; gap: 2px; color: var(--text); }
.line { font-size: 13px; font-weight: 600; opacity: .95; min-height: 1.2em; transition: opacity .3s ease; }
.count { font-size: 12px; opacity: .7; }
```

Create `components/r3f/kit/SocialProof.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { SocialProofItem } from "./types";
import { formatWinner, nextIndex } from "./socialProof";
import css from "./socialProof.module.css";

export function SocialProof({ winners, todayCount, reduced }: {
  winners: SocialProofItem[]; todayCount: number; reduced: boolean;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced || winners.length <= 1) return;
    const id = window.setInterval(() => setI((p) => nextIndex(p, winners.length)), 3500);
    return () => window.clearInterval(id);
  }, [reduced, winners.length]);

  if (winners.length === 0) return null;
  const item = winners[Math.min(i, winners.length - 1)];

  return (
    <div className={css.wrap} data-testid="social-proof">
      <span className={css.line}>{formatWinner(item)}</span>
      <span className={css.count}>{todayCount.toLocaleString()} players won today</span>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/socialProof.ts components/r3f/kit/socialProof.test.ts components/r3f/kit/SocialProof.tsx components/r3f/kit/socialProof.module.css
git commit -m "feat: live social-proof ticker (seeded, reduced-motion aware)"
```

---

### Task 5: Claim state machine (pure reducer)

**Files:**
- Create: `components/r3f/kit/claimMachine.ts`
- Create: `components/r3f/kit/claimMachine.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ClaimStep = "hidden" | "reveal" | "form" | "submitting" | "redirect"`
  - `type ClaimAction = { type: "won" } | { type: "open" } | { type: "submit" } | { type: "done" } | { type: "reset" }`
  - `claimReducer(state: ClaimStep, action: ClaimAction): ClaimStep`

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/claimMachine.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { claimReducer, type ClaimStep } from "./claimMachine";

describe("claimReducer", () => {
  it("walks the happy path hidden→reveal→form→submitting→redirect", () => {
    let s: ClaimStep = "hidden";
    s = claimReducer(s, { type: "won" });    expect(s).toBe("reveal");
    s = claimReducer(s, { type: "open" });   expect(s).toBe("form");
    s = claimReducer(s, { type: "submit" }); expect(s).toBe("submitting");
    s = claimReducer(s, { type: "done" });   expect(s).toBe("redirect");
  });

  it("reset returns to hidden from any state", () => {
    expect(claimReducer("form", { type: "reset" })).toBe("hidden");
    expect(claimReducer("submitting", { type: "reset" })).toBe("hidden");
  });

  it("ignores actions that don't apply to the current state", () => {
    expect(claimReducer("hidden", { type: "submit" })).toBe("hidden");
    expect(claimReducer("reveal", { type: "done" })).toBe("reveal");
    expect(claimReducer("redirect", { type: "won" })).toBe("redirect");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- claimMachine`
Expected: FAIL — cannot find module `./claimMachine`.

- [ ] **Step 3: Implement `claimMachine.ts`**

Create `components/r3f/kit/claimMachine.ts`:

```ts
export type ClaimStep = "hidden" | "reveal" | "form" | "submitting" | "redirect";
export type ClaimAction = { type: "won" } | { type: "open" } | { type: "submit" } | { type: "done" } | { type: "reset" };

export function claimReducer(state: ClaimStep, action: ClaimAction): ClaimStep {
  if (action.type === "reset") return "hidden";
  switch (state) {
    case "hidden": return action.type === "won" ? "reveal" : state;
    case "reveal": return action.type === "open" ? "form" : state;
    case "form": return action.type === "submit" ? "submitting" : state;
    case "submitting": return action.type === "done" ? "redirect" : state;
    default: return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- claimMachine`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/claimMachine.ts components/r3f/kit/claimMachine.test.ts
git commit -m "feat: claim-step state machine (pure reducer)"
```

---

### Task 6: Haptics wrapper

**Files:**
- Create: `components/r3f/kit/haptics.ts`
- Create: `components/r3f/kit/haptics.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Haptics = { spin(): void; win(): void; claim(): void }`
  - `createHaptics(opts: { reduced: boolean; vibrate?: (pattern: number | number[]) => boolean }): Haptics`

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/haptics.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createHaptics } from "./haptics";

describe("createHaptics", () => {
  it("vibrates with distinct patterns when enabled", () => {
    const vibrate = vi.fn(() => true);
    const h = createHaptics({ reduced: false, vibrate });
    h.spin(); h.win(); h.claim();
    expect(vibrate).toHaveBeenCalledTimes(3);
    // win is a stronger multi-pulse pattern (array), claim is a single pulse (number)
    expect(Array.isArray(vibrate.mock.calls[1][0])).toBe(true);
  });

  it("no-ops under reduced motion", () => {
    const vibrate = vi.fn(() => true);
    const h = createHaptics({ reduced: true, vibrate });
    h.spin(); h.win(); h.claim();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("no-ops when no vibrate function is available", () => {
    const h = createHaptics({ reduced: false });
    expect(() => { h.spin(); h.win(); h.claim(); }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- haptics`
Expected: FAIL — cannot find module `./haptics`.

- [ ] **Step 3: Implement `haptics.ts`**

Create `components/r3f/kit/haptics.ts`:

```ts
export type Haptics = { spin(): void; win(): void; claim(): void };

export function createHaptics(opts: {
  reduced: boolean;
  vibrate?: (pattern: number | number[]) => boolean;
}): Haptics {
  const vib =
    opts.vibrate ??
    (typeof navigator !== "undefined" && "vibrate" in navigator
      ? navigator.vibrate.bind(navigator)
      : undefined);

  const fire = (pattern: number | number[]) => {
    if (opts.reduced || !vib) return;
    try { vib(pattern); } catch { /* unsupported — ignore */ }
  };

  return {
    spin() { fire([8, 30, 8, 30, 8]); }, // light "ticking" burst
    win() { fire([0, 60, 40, 120]); },   // strong celebratory pattern
    claim() { fire(20); },                // crisp confirm tap
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- haptics`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/haptics.ts components/r3f/kit/haptics.test.ts
git commit -m "feat: haptics wrapper (reduced-motion + unsupported safe)"
```

---

### Task 7: Trust bar component

**Files:**
- Create: `components/r3f/kit/TrustBar.tsx`
- Create: `components/r3f/kit/trustBar.module.css`
- Create: `components/r3f/kit/TrustBar.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `<TrustBar text={string} />`

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/TrustBar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustBar } from "./TrustBar";

describe("TrustBar", () => {
  it("renders the provided compliance text under the trust-bar testid", () => {
    render(<TrustBar text="🔞 18+ · 🔒 Secure · Play responsibly" />);
    const el = screen.getByTestId("trust-bar");
    expect(el).toHaveTextContent("18+");
    expect(el).toHaveTextContent("Play responsibly");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- TrustBar`
Expected: FAIL — cannot find module `./TrustBar`.

- [ ] **Step 3: Implement the component + CSS**

Create `components/r3f/kit/trustBar.module.css`:

```css
.bar { font-size: 11px; letter-spacing: .3px; opacity: .7; color: var(--text); text-align: center; }
```

Create `components/r3f/kit/TrustBar.tsx`:

```tsx
import css from "./trustBar.module.css";

export function TrustBar({ text }: { text: string }) {
  return <div className={css.bar} data-testid="trust-bar">{text}</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- TrustBar`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/r3f/kit/TrustBar.tsx components/r3f/kit/trustBar.module.css components/r3f/kit/TrustBar.test.tsx
git commit -m "feat: trust/compliance bar component"
```

---

### Task 8: WinSheet (bottom sheet: reveal → form → submitting)

**Files:**
- Create: `components/r3f/kit/WinSheet.tsx`
- Create: `components/r3f/kit/winSheet.module.css`
- Create: `components/r3f/kit/WinSheet.test.tsx`

**Interfaces:**
- Consumes: `ClaimStep` (Task 5), `OverlayCopy` + `ConversionConfig` (Task 1), `Countdown` (Task 3), `SocialProof` (Task 4), `TrustBar` (Task 7).
- Produces:
  - `<WinSheet step copy config reduced onOpen onSubmit onDismiss />`
  - Props: `step: ClaimStep; copy: OverlayCopy; config: ConversionConfig; reduced: boolean; onOpen: () => void; onSubmit: (value: string) => void; onDismiss: () => void`
  - Root element keeps `data-testid="win-modal"`. Buttons/field: `claim-open`, `claim-field`, `claim-submit`.

- [ ] **Step 1: Write the failing test**

Create `components/r3f/kit/WinSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WinSheet } from "./WinSheet";
import { withConversionDefaults } from "./conversion";

const copy = {
  logo: "X", heading: "h", ctaLabel: "SPIN", spinningLabel: "...",
  winTitle: "You won", winPrize: "JACKPOT!", claimLabel: "Claim", winEmoji: "💰",
};
const config = withConversionDefaults({ prize: "500 Free Spins", registerField: "email" });

describe("WinSheet", () => {
  it("is hidden when step is hidden", () => {
    render(<WinSheet step="hidden" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={() => {}} onDismiss={() => {}} />);
    expect(screen.getByTestId("win-modal")).toHaveAttribute("hidden");
  });

  it("reveal shows prize + claim-open, which fires onOpen", async () => {
    const onOpen = vi.fn();
    render(<WinSheet step="reveal" copy={copy} config={config} reduced onOpen={onOpen} onSubmit={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("500 Free Spins")).toBeVisible();
    await userEvent.click(screen.getByTestId("claim-open"));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("form shows the field with the right input type and submits its value", async () => {
    const onSubmit = vi.fn();
    render(<WinSheet step="form" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={onSubmit} onDismiss={() => {}} />);
    const field = screen.getByTestId("claim-field");
    expect(field).toHaveAttribute("type", "email");
    await userEvent.type(field, "a@b.com");
    await userEvent.click(screen.getByTestId("claim-submit"));
    expect(onSubmit).toHaveBeenCalledWith("a@b.com");
  });

  it("form submits even when the field is empty (never blocks conversion)", async () => {
    const onSubmit = vi.fn();
    render(<WinSheet step="form" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={onSubmit} onDismiss={() => {}} />);
    await userEvent.click(screen.getByTestId("claim-submit"));
    expect(onSubmit).toHaveBeenCalledWith("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- WinSheet`
Expected: FAIL — cannot find module `./WinSheet`.

- [ ] **Step 3: Implement the CSS**

Create `components/r3f/kit/winSheet.module.css`:

```css
.scrim { position: fixed; inset: 0; background: rgba(2,10,6,.55); backdrop-filter: blur(3px); display: grid; align-items: end; animation: fade .3s ease both; }
.scrim[hidden] { display: none !important; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }

.sheet {
  pointer-events: auto; width: 100%; box-sizing: border-box;
  background: var(--surface); color: var(--text);
  border-top: 1px solid color-mix(in srgb, var(--gold) 50%, transparent);
  border-radius: 22px 22px 0 0;
  padding: 14px 20px max(env(safe-area-inset-bottom), 18px);
  box-shadow: 0 -20px 60px color-mix(in srgb, var(--gold) 28%, transparent);
  animation: slideup .35s cubic-bezier(.2,.8,.2,1) both;
}
.noanim { animation: none; }
@keyframes slideup { from { transform: translateY(100%) } to { transform: translateY(0) } }

/* Landscape phone: become a centered card instead of a full-width sheet */
@media (orientation: landscape) and (max-height: 520px) {
  .scrim { place-items: center; }
  .sheet { width: min(440px, 92vw); border-radius: 18px; }
}

.grab { width: 40px; height: 4px; border-radius: 999px; background: color-mix(in srgb, var(--text) 35%, transparent); margin: 2px auto 12px; }
.emoji { font-size: 40px; text-align: center; }
.title { margin: 2px 0 0; text-align: center; font-size: 16px; opacity: .9; }
.prize { margin: 2px 0 10px; text-align: center; color: var(--gold); font-size: 30px; font-weight: 800; }
.center { display: flex; flex-direction: column; align-items: center; gap: 12px; }

.cta { width: 100%; min-height: 56px; padding: 16px; border: none; border-radius: 14px; touch-action: manipulation;
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 88%, white), var(--gold)); color: #2a1e00; font-weight: 800; font-size: 17px; cursor: pointer; }
.cta:active { transform: translateY(1px); }
.cta:disabled { opacity: .7; cursor: default; }

.field { width: 100%; box-sizing: border-box; min-height: 52px; padding: 14px 16px; border-radius: 12px; font-size: 16px;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, transparent); background: rgba(0,0,0,.25); color: var(--text); margin-bottom: 10px; }
.field:focus { outline: 2px solid var(--gold); outline-offset: 1px; }

.footer { margin-top: 12px; }
```

- [ ] **Step 4: Implement `WinSheet.tsx`**

Create `components/r3f/kit/WinSheet.tsx`:

```tsx
"use client";
import { useRef } from "react";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { ClaimStep } from "./claimMachine";
import { Countdown } from "./Countdown";
import { SocialProof } from "./SocialProof";
import { TrustBar } from "./TrustBar";
import css from "./winSheet.module.css";

export function WinSheet({ step, copy, config, reduced, onOpen, onSubmit, onDismiss }: {
  step: ClaimStep;
  copy: OverlayCopy;
  config: ConversionConfig;
  reduced: boolean;
  onOpen: () => void;
  onSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const open = step !== "hidden";
  const inputMode = config.registerField === "tel" ? "tel" : "email";
  const autoComplete = config.registerField === "tel" ? "tel" : "email";

  return (
    <div className={css.scrim} data-testid="win-modal" hidden={!open}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className={`${css.sheet}${reduced ? " " + css.noanim : ""}`} data-pe>
        <div className={css.grab} aria-hidden />
        <div className={css.emoji}>{copy.winEmoji}</div>
        <div className={css.title}>{copy.winTitle}</div>
        <div className={css.prize}>{config.prize}</div>

        {step === "reveal" && (
          <div className={css.center}>
            <Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" prominent />
            <button className={css.cta} data-testid="claim-open" onClick={onOpen}>{config.claimLabel}</button>
          </div>
        )}

        {(step === "form" || step === "submitting") && (
          <form className={css.center} onSubmit={(e) => { e.preventDefault(); onSubmit(fieldRef.current?.value ?? ""); }}>
            <Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" />
            <input
              ref={fieldRef}
              className={css.field}
              data-testid="claim-field"
              type={config.registerField}
              inputMode={inputMode}
              autoComplete={autoComplete}
              enterKeyHint="go"
              placeholder={config.registerPlaceholder}
              autoFocus
              disabled={step === "submitting"}
            />
            <button className={css.cta} data-testid="claim-submit" type="submit" disabled={step === "submitting"}>
              {step === "submitting" ? "…" : config.claimLabel}
            </button>
          </form>
        )}

        <div className={css.footer}>
          <SocialProof winners={config.social.winners} todayCount={config.social.todayCount} reduced={reduced} />
          <TrustBar text={config.trust} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- WinSheet`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/WinSheet.tsx components/r3f/kit/winSheet.module.css components/r3f/kit/WinSheet.test.tsx
git commit -m "feat: WinSheet bottom sheet (reveal/form/submitting + accelerants)"
```

---

### Task 9: Responsive `SpinOverlay` (idle layout, safe areas, sticky CTA, accelerant strip)

**Files:**
- Modify: `components/r3f/kit/SpinOverlay.tsx`
- Modify: `components/r3f/kit/spinOverlay.module.css`

**Interfaces:**
- Consumes: `WinSheet` (Task 8), `Countdown`/`SocialProof` (Tasks 3–4), `ConversionConfig` (Task 1), `ClaimStep` (Task 5).
- Produces (new `SpinOverlay` prop shape):
  - `copy: OverlayCopy; vars: OverlayVars; config: ConversionConfig; status: SpinStatus; claimStep: ClaimStep; muted: boolean; reduced: boolean; onSpin: () => void; onToggleSound: () => void; onClaimOpen: () => void; onClaimSubmit: (value: string) => void; onDismiss: () => void`
  - The old `modalOpen` and `onClaim` props are removed.

- [ ] **Step 1: Rewrite `SpinOverlay.tsx`**

Replace the entire contents of `components/r3f/kit/SpinOverlay.tsx`:

```tsx
import type { CSSProperties } from "react";
import css from "./spinOverlay.module.css";
import type { SpinStatus } from "./spinController";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { ClaimStep } from "./claimMachine";
import { WinSheet } from "./WinSheet";
import { SocialProof } from "./SocialProof";
import { Countdown } from "./Countdown";

export type OverlayVars = {
  gold: string; accent: string; surface: string; text: string; bannerBg: string; bannerBorder: string;
};

export function SpinOverlay({
  copy, vars, config, status, claimStep, muted, reduced,
  onSpin, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss,
}: {
  copy: OverlayCopy;
  vars: OverlayVars;
  config: ConversionConfig;
  status: SpinStatus;
  claimStep: ClaimStep;
  muted: boolean;
  reduced: boolean;
  onSpin: () => void;
  onToggleSound: () => void;
  onClaimOpen: () => void;
  onClaimSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  const style = {
    "--gold": vars.gold, "--accent": vars.accent, "--surface": vars.surface,
    "--text": vars.text, "--bannerBg": vars.bannerBg, "--bannerBorder": vars.bannerBorder,
  } as CSSProperties;

  return (
    <div className={css.overlay} style={style}>
      <div className={css.top}>
        <div className={css.logo}>{copy.logo}</div>
        <button data-pe data-testid="sound-toggle" className={css.sound} onClick={onToggleSound} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className={css.hero}>
        <h1>{copy.heading}</h1>
        {copy.subtitle && <p className={css.subtitle}>{copy.subtitle}</p>}
        {copy.subBanner && <div className={css.banner}>{copy.subBanner}</div>}
      </div>

      <div className={css.dock}>
        <div className={css.strip}>
          <SocialProof winners={config.social.winners} todayCount={config.social.todayCount} reduced={reduced} />
        </div>
        <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status !== "idle"}>
          {status === "spinning" ? copy.spinningLabel : copy.ctaLabel}
        </button>
        <div className={css.strip}>
          <Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" />
        </div>
      </div>

      <WinSheet
        step={claimStep} copy={copy} config={config} reduced={reduced}
        onOpen={onClaimOpen} onSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `spinOverlay.module.css`**

Replace the entire contents of `components/r3f/kit/spinOverlay.module.css`:

```css
.overlay { position: fixed; inset: 0; pointer-events: none; font-family: system-ui, sans-serif; color: var(--text);
  touch-action: manipulation; overscroll-behavior: none; }
.overlay [data-pe] { pointer-events: auto; }

.top { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between;
  padding: max(env(safe-area-inset-top), 14px) max(env(safe-area-inset-right), 18px) 0 max(env(safe-area-inset-left), 18px); }
.logo { color: var(--gold); font-weight: 800; letter-spacing: 1px; font-size: 22px; text-shadow: 0 0 16px color-mix(in srgb, var(--gold) 50%, transparent); }
.sound { background: color-mix(in srgb, var(--surface) 70%, transparent); color: var(--text); border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
  border-radius: 999px; min-width: 44px; min-height: 44px; font-size: 16px; cursor: pointer; touch-action: manipulation; }

.hero { position: absolute; top: calc(max(env(safe-area-inset-top), 14px) + 46px); left: 0; right: 0; text-align: center; padding: 0 16px; }
.hero h1 { margin: 0; font-size: clamp(28px, 6vw, 52px); line-height: 1.05; font-weight: 800; color: var(--gold);
  text-shadow: 0 0 26px color-mix(in srgb, var(--gold) 50%, transparent); }
.subtitle { margin: 6px 0 0; color: var(--text); opacity: .85; font-size: clamp(14px, 2.5vw, 18px); }
.banner { display: inline-block; margin-top: 8px; padding: 6px 16px; border-radius: 10px; background: var(--bannerBg); color: #F4F1E8;
  font-weight: 800; letter-spacing: 6px; border: 2px solid var(--bannerBorder); }

/* Bottom dock: social proof · sticky CTA · countdown — clears the home indicator */
.dock { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 0 16px max(env(safe-area-inset-bottom), 16px); }
.strip { min-height: 18px; }
.cta { pointer-events: auto; min-height: 56px; padding: 16px 40px; border-radius: 999px; border: none; touch-action: manipulation;
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 85%, white), var(--gold)); color: #2a1e00; font-weight: 800; font-size: 18px;
  cursor: pointer; box-shadow: 0 0 30px color-mix(in srgb, var(--gold) 60%, transparent); }
.cta:active { transform: translateY(1px); }
.cta:disabled { opacity: .65; cursor: default; }

/* Landscape phone: tighten the hero so it never collides with the dock */
@media (orientation: landscape) and (max-height: 520px) {
  .hero { top: calc(max(env(safe-area-inset-top), 8px) + 30px); }
  .hero h1 { font-size: clamp(22px, 5vh, 34px); }
  .dock { gap: 4px; }
}
```

- [ ] **Step 3: Typecheck (no scenes wired yet — expect scene errors only)**

Run: `npx tsc --noEmit`
Expected: the only errors are in `JackpotVaultScene.tsx` / `AlchemyLabScene.tsx` (they still pass the old `modalOpen`/`onClaim` props). Those are fixed in Task 10. No errors inside the kit files.

- [ ] **Step 4: Commit**

```bash
git add components/r3f/kit/SpinOverlay.tsx components/r3f/kit/spinOverlay.module.css
git commit -m "feat: responsive SpinOverlay (safe-area dock, sticky CTA, accelerant strip, WinSheet)"
```

---

### Task 10: Wire scenes — `useSpinScene` claim machine + responsive camera + scene integration

**Files:**
- Modify: `components/r3f/kit/spinScene.tsx`
- Modify: `components/r3f/jackpot/JackpotVaultScene.tsx`
- Modify: `components/r3f/alchemy/AlchemyLabScene.tsx`

**Interfaces:**
- Consumes: `claimReducer`/`ClaimStep` (Task 5), `createHaptics` (Task 6), `ResponsiveCamera` (Task 2), `ConversionConfig` (Task 1), `jackpotConversion`/`alchemyConversion` (Task 1).
- Produces — extended `useSpinScene`:
  - Signature: `useSpinScene({ reduced, sound, conversion, onClaim?, navigate? }: { reduced: boolean; sound: SoundInstance; conversion: ConversionConfig; onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>; navigate?: (url: string) => void })`
  - Returns (in addition to existing): `claimStep: ClaimStep; onClaimOpen: () => void; onClaimSubmit: (value: string) => void; onDismiss: () => void`
  - The previously-returned `modalOpen` is removed.

- [ ] **Step 1: Extend `useSpinScene` in `spinScene.tsx`**

In `components/r3f/kit/spinScene.tsx`, update the imports at the top (add `useReducer`, the new kit modules, and `ConversionConfig`):

```tsx
import { useEffect, useMemo, useReducer, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createSpinController, type SpinStatus } from "./spinController";
import { claimReducer, type ClaimStep } from "./claimMachine";
import { createHaptics } from "./haptics";
import type { SoundInstance, ConversionConfig } from "./types";
```

Replace the entire `useSpinScene` function with:

```tsx
export function useSpinScene({ reduced, sound, conversion, onClaim, navigate }: {
  reduced: boolean;
  sound: SoundInstance;
  conversion: ConversionConfig;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
}) {
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [claimStep, dispatch] = useReducer(claimReducer, "hidden");
  const haptics = useMemo(() => createHaptics({ reduced }), [reduced]);
  const go = navigate ?? ((url: string) => { if (typeof window !== "undefined") window.location.assign(url); });

  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );

  useEffect(() => {
    if (status !== "won") { dispatch({ type: "reset" }); return; }
    const t = setTimeout(() => dispatch({ type: "won" }), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);

  const onSpin = () => {
    if (controller.status !== "idle") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
    haptics.spin();
  };
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") { sound.win(); haptics.win(); }
  };
  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  const onClaimOpen = () => dispatch({ type: "open" });
  const onClaimSubmit = async (value: string) => {
    dispatch({ type: "submit" });
    haptics.claim();
    try { await onClaim?.({ field: conversion.registerField, value, prize: conversion.prize }); } catch { /* lead capture is best-effort */ }
    dispatch({ type: "done" });
    go(conversion.redirectUrl);
  };
  const onDismiss = () => dispatch({ type: "reset" });

  return { rotationRef, status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss };
}
```

- [ ] **Step 2: Update `JackpotVaultScene.tsx`**

In `components/r3f/jackpot/JackpotVaultScene.tsx`:

Update imports — add `ResponsiveCamera`, the conversion config, and remove the now-unused fixed camera position later:

```tsx
import { ResponsiveCamera } from "../kit/ResponsiveCamera";
import { jackpotWheel, jackpotSound, jackpotCopy, jackpotOverlayVars, jackpotConversion } from "./theme";
```

Change the `useSpinScene` call and the destructure:

```tsx
  const { rotationRef, status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } =
    useSpinScene({ reduced, sound, conversion: jackpotConversion });
```

Add `<ResponsiveCamera radius={jackpotWheel.radius} />` as the first child inside `<Canvas>` (right after the `<color attach="background" .../>` line):

```tsx
        <color attach="background" args={["#070D0B"]} />
        <ResponsiveCamera radius={jackpotWheel.radius} />
```

Replace the `<SpinOverlay .../>` element at the bottom with:

```tsx
      <SpinOverlay
        copy={jackpotCopy} vars={jackpotOverlayVars} config={jackpotConversion}
        status={status} claimStep={claimStep} muted={muted} reduced={reduced}
        onSpin={onSpin} onToggleSound={onToggleSound}
        onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
```

- [ ] **Step 3: Update `AlchemyLabScene.tsx`**

Apply the same three edits to `components/r3f/alchemy/AlchemyLabScene.tsx`:

Imports:

```tsx
import { ResponsiveCamera } from "../kit/ResponsiveCamera";
import { alchemyWheel, alchemySound, alchemyCopy, alchemyOverlayVars, alchemyConversion } from "./theme";
```

Hook call:

```tsx
  const { rotationRef, status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } =
    useSpinScene({ reduced, sound, conversion: alchemyConversion });
  const won = status === "won";
```

Camera child (right after the `<color attach="background" .../>` line):

```tsx
        <color attach="background" args={["#0A1A14"]} />
        <ResponsiveCamera radius={alchemyWheel.radius} />
```

Overlay:

```tsx
      <SpinOverlay
        copy={alchemyCopy} vars={alchemyOverlayVars} config={alchemyConversion}
        status={status} claimStep={claimStep} muted={muted} reduced={reduced}
        onSpin={onSpin} onToggleSound={onToggleSound}
        onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS (all tasks 1–8 + existing).

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/spinScene.tsx components/r3f/jackpot/JackpotVaultScene.tsx components/r3f/alchemy/AlchemyLabScene.tsx
git commit -m "feat: wire claim funnel + responsive camera into both 3D scenes"
```

---

### Task 11: Robustness pass — touch parallax, WebGL fallback, visibility pause

**Files:**
- Modify: `components/r3f/kit/spinScene.tsx` (Parallax)
- Create: `components/r3f/kit/webgl.ts`
- Create: `components/r3f/kit/webgl.test.ts`
- Create: `components/r3f/kit/SceneFallback.tsx`
- Modify: `components/r3f/jackpot/JackpotVaultScene.tsx`
- Modify: `components/r3f/alchemy/AlchemyLabScene.tsx`

**Interfaces:**
- Consumes: `OverlayCopy`/`OverlayVars`/`ConversionConfig`.
- Produces:
  - `isWebGLAvailable(doc?: Document): boolean`
  - `<SceneFallback copy vars config />` — static themed hero + CTA shown when WebGL is unavailable.

- [ ] **Step 1: Replace `Parallax` to use touch-drag instead of device tilt**

In `components/r3f/kit/spinScene.tsx`, replace the entire `Parallax` function with:

```tsx
export function Parallax({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const drag = useRef({ x: 0, y: 0 });
  const { pointer, gl } = useThree();

  useEffect(() => {
    if (reduced) return;
    const el = gl.domElement;
    const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return; // desktop keeps pointer parallax below
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      drag.current.x = (t.clientX / window.innerWidth) * 2 - 1;
      drag.current.y = (t.clientY / window.innerHeight) * 2 - 1;
    };
    el.addEventListener("touchmove", onMove, { passive: true });
    return () => el.removeEventListener("touchmove", onMove);
  }, [reduced, gl]);

  useFrame(() => {
    if (!g.current || reduced) return;
    const px = pointer.x + drag.current.x;
    const py = pointer.y - drag.current.y;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, px * 0.2, 0.05);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -py * 0.15, 0.05);
  });

  return <group ref={g}>{children}</group>;
}
```

- [ ] **Step 2: Write the failing test for WebGL detection**

Create `components/r3f/kit/webgl.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { isWebGLAvailable } from "./webgl";

describe("isWebGLAvailable", () => {
  it("returns true when a webgl context is obtainable", () => {
    const doc = { createElement: () => ({ getContext: (k: string) => (k.includes("webgl") ? {} : null) }) } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(true);
  });

  it("returns false when no context is obtainable", () => {
    const doc = { createElement: () => ({ getContext: () => null }) } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(false);
  });

  it("returns false when canvas creation throws", () => {
    const doc = { createElement: () => { throw new Error("no canvas"); } } as unknown as Document;
    expect(isWebGLAvailable(doc)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- webgl`
Expected: FAIL — cannot find module `./webgl`.

- [ ] **Step 4: Implement `webgl.ts`**

Create `components/r3f/kit/webgl.ts`:

```ts
export function isWebGLAvailable(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- webgl`
Expected: PASS (3 tests).

- [ ] **Step 6: Implement `SceneFallback.tsx`**

Create `components/r3f/kit/SceneFallback.tsx`:

```tsx
"use client";
import type { CSSProperties } from "react";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { OverlayVars } from "./SpinOverlay";

export function SceneFallback({ copy, vars, config }: { copy: OverlayCopy; vars: OverlayVars; config: ConversionConfig }) {
  const style: CSSProperties = {
    position: "fixed", inset: 0, display: "grid", placeItems: "center", textAlign: "center",
    padding: "24px", background: vars.surface, color: vars.text, fontFamily: "system-ui, sans-serif",
  };
  return (
    <div style={style}>
      <div>
        <h1 style={{ color: vars.gold, fontSize: "clamp(28px,7vw,48px)", margin: 0 }}>{copy.heading}</h1>
        {copy.subtitle && <p style={{ opacity: 0.85 }}>{copy.subtitle}</p>}
        <a
          href={config.redirectUrl}
          data-testid="spin-button"
          style={{
            display: "inline-block", marginTop: 20, padding: "16px 40px", borderRadius: 999,
            background: vars.gold, color: "#2a1e00", fontWeight: 800, textDecoration: "none", minHeight: 56,
          }}
        >
          {config.claimLabel}
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Gate both scenes behind WebGL availability + pause sound on hidden**

In `components/r3f/jackpot/JackpotVaultScene.tsx`, add imports:

```tsx
import { useEffect, useMemo, useState } from "react";
import { isWebGLAvailable } from "../kit/webgl";
import { SceneFallback } from "../kit/SceneFallback";
```

Inside `JackpotVaultScene`, after the `useSpinScene(...)` line, add:

```tsx
  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(isWebGLAvailable()); }, []);
  useEffect(() => {
    const onVis = () => sound.setMuted(document.hidden ? true : muted);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sound, muted]);

  if (!webgl) return <SceneFallback copy={jackpotCopy} vars={jackpotOverlayVars} config={jackpotConversion} />;
```

Apply the same edits to `components/r3f/alchemy/AlchemyLabScene.tsx` (it already imports `useMemo`; add `useEffect, useState`), using `alchemyCopy`, `alchemyOverlayVars`, `alchemyConversion`. Place the `if (!webgl) return ...` guard before the returned JSX.

- [ ] **Step 8: Typecheck + full unit suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all unit tests PASS.

- [ ] **Step 9: Commit**

```bash
git add components/r3f/kit/spinScene.tsx components/r3f/kit/webgl.ts components/r3f/kit/webgl.test.ts components/r3f/kit/SceneFallback.tsx components/r3f/jackpot/JackpotVaultScene.tsx components/r3f/alchemy/AlchemyLabScene.tsx
git commit -m "feat: touch-drag parallax, WebGL fallback, sound pause on tab hide"
```

---

### Task 12: E2E mobile funnel + update existing 3D specs

**Files:**
- Modify: `tests/e2e/jackpotVault3d.spec.ts`
- Modify: `tests/e2e/alchemyLab3d.spec.ts`
- Create: `tests/e2e/mobileFunnel.spec.ts`

**Interfaces:**
- Consumes: the live routes `/prototypes/3d/jackpot-vault` and `/prototypes/3d/alchemy-lab` and their test IDs.
- Produces: passing Playwright specs covering the new sheet/funnel on a mobile viewport.

- [ ] **Step 1: Update `jackpotVault3d.spec.ts` to the new sheet/prize copy**

Replace the `test.describe("spin to win", ...)` block in `tests/e2e/jackpotVault3d.spec.ts` with:

```ts
test.describe("spin to win", () => {
  test.use({ reducedMotion: "reduce" }); // shortens the demo spin to ~250ms
  test("SPIN reveals the win sheet with the concrete prize", async ({ page }) => {
    await page.goto("/prototypes/3d/jackpot-vault");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sound-toggle")).toBeVisible();
    await expect(page.getByTestId("win-modal")).toBeHidden();
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1,000 Free Spins")).toBeVisible();
    await expect(page.getByTestId("claim-open")).toBeVisible();
  });
});
```

- [ ] **Step 2: Update `alchemyLab3d.spec.ts` the same way**

Open `tests/e2e/alchemyLab3d.spec.ts`. If it asserts the old `JACKPOT!` modal text, replace that assertion with the Alchemy prize and the claim-open button, mirroring Step 1 but for `/prototypes/3d/alchemy-lab` and the text `500 Free Spins`. The win-sheet assertion block should read:

```ts
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("500 Free Spins")).toBeVisible();
    await expect(page.getByTestId("claim-open")).toBeVisible();
```

- [ ] **Step 3: Write the mobile funnel spec**

Create `tests/e2e/mobileFunnel.spec.ts`:

```ts
import { test, expect, devices } from "@playwright/test";

const ROUTES = [
  { name: "jackpot-vault", path: "/prototypes/3d/jackpot-vault", prize: "1,000 Free Spins" },
  { name: "alchemy-lab", path: "/prototypes/3d/alchemy-lab", prize: "500 Free Spins" },
];

for (const r of ROUTES) {
  test.describe(`${r.name} mobile funnel`, () => {
    test.use({ ...devices["iPhone 12"], reducedMotion: "reduce" });

    test("portrait: canvas + sticky CTA visible, no page error", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(r.path);
      await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });

      const cta = page.getByTestId("spin-button");
      await expect(cta).toBeVisible();
      const box = await cta.boundingBox();
      const viewport = page.viewportSize()!;
      expect(box).not.toBeNull();
      // CTA must sit on-screen and have a thumb-sized tap target
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(errors).toEqual([]);
    });

    test("spin → sheet → form field has the mobile-friendly type", async ({ page }) => {
      await page.goto(r.path);
      await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
      await page.getByTestId("spin-button").click();
      await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(r.prize)).toBeVisible();

      await page.getByTestId("claim-open").click();
      const field = page.getByTestId("claim-field");
      await expect(field).toBeVisible();
      await expect(field).toHaveAttribute("type", "email");
      await expect(field).toHaveAttribute("inputmode", "email");
    });
  });
}
```

- [ ] **Step 4: Run the e2e suite**

Run: `npm run e2e -- jackpotVault3d alchemyLab3d mobileFunnel`
Expected: PASS. (First run builds the app via the configured `webServer`; allow time.)

- [ ] **Step 5: Capture screenshot checkpoints for visual review**

Run this throwaway capture script (deletes itself conceptually — do not commit it). Create `tests/e2e/_shots.spec.ts`:

```ts
import { test, devices } from "@playwright/test";

const ROUTES = ["/prototypes/3d/jackpot-vault", "/prototypes/3d/alchemy-lab"];

for (const path of ROUTES) {
  const slug = path.split("/").pop();
  test.describe(`shots ${slug}`, () => {
    test.use({ ...devices["iPhone 12"], reducedMotion: "reduce" });
    test("idle + win", async ({ page }) => {
      await page.goto(path);
      await page.locator("canvas").waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `test-results/${slug}-mobile-idle.png` });
      await page.getByTestId("spin-button").click();
      await page.getByTestId("win-modal").waitFor({ state: "visible", timeout: 10_000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/${slug}-mobile-win.png` });
    });
  });
}
```

Run: `npm run e2e -- _shots`
Then review the four PNGs in `test-results/` for the i-gaming feel (framing, no clipping, sheet legibility). Delete the throwaway spec afterward: `rm tests/e2e/_shots.spec.ts`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/jackpotVault3d.spec.ts tests/e2e/alchemyLab3d.spec.ts tests/e2e/mobileFunnel.spec.ts
git commit -m "test: mobile funnel e2e + update 3D specs for win sheet"
```

---

## Self-Review

**Spec coverage:**
- Responsive camera / portrait clipping → Task 2 (+ wired Task 10). ✓
- Safe-area idle layout + sticky CTA → Task 9. ✓
- Hybrid immersive→bottom sheet, scene dim (DOM scrim) → Task 8 (`winSheet.module.css .scrim`). ✓
- Claim → inline register → redirect, lead captured before redirect, empty field never blocks → Tasks 5, 8, 10. ✓
- Urgency countdown (persisted, zero-state) → Task 3. ✓
- Live social proof (seeded, reduced-motion) → Task 4. ✓
- Trust & compliance → Task 7. ✓
- Haptics (reduced-motion + unsupported safe) → Task 6 (+ wired Task 10). ✓
- Parallax fix (touch-drag, no iOS permission prompt) → Task 11. ✓
- WebGL fallback → Task 11. ✓
- Visibility/battery (pause sound) → Task 11. ✓
- Touch hardening (touch-action, ≥44px) → Tasks 8, 9 CSS + Task 12 assertion. ✓
- Per-theme data-only difference → Task 1 configs, consumed everywhere. ✓
- Testing: unit (Tasks 1–8, 11), e2e portrait + form type (Task 12), screenshots (Task 12). ✓
- Landscape degradation → media queries in Tasks 8 & 9. ✓

**Decisions honoured:** Claim→register/deposit (redirect), hybrid layout, inline mini-register, all four accelerants. ✓

**Out of scope (per spec):** real registration backend (`onClaim` is an optional stub, default undefined), no new 3D geometry, no admin/CMS wiring, no third page. ✓

**Type consistency:** `ConversionConfig` fields are used identically across Tasks 1/8/9/10/11. `ClaimStep`/`claimReducer` action names (`won`/`open`/`submit`/`done`/`reset`) match between Task 5 and Task 10. `useSpinScene` return keys (`claimStep`, `onClaimOpen`, `onClaimSubmit`, `onDismiss`) match what `SpinOverlay` (Task 9) consumes and what scenes (Task 10) destructure. The old `modalOpen`/`onClaim` overlay props are removed in Task 9 and no longer passed in Task 10. ✓

**Placeholder scan:** every code step contains complete code; commands have expected output. No TBD/TODO. ✓

**Note for landscape e2e:** Task 12 covers portrait (iPhone 12). Landscape rendering is verified visually via the screenshot review and the CSS media queries; an automated landscape assertion was intentionally omitted to keep the suite fast (the layout difference is CSS-only and low-risk).
