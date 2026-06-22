# Jackpot Boom Vault — 3D Flagship Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the "Jackpot Boom Vault" Boomzino landing as a real-time 3D React/WebGL experience (R3F + drei + postprocessing + Rapier physics + Howler sound), replacing its static HTML mockup.

**Architecture:** A Next client route dynamically loads an `ssr:false` R3F `<Canvas>` scene. A pure spin-controller state machine drives a procedural 3D wheel (extruded metal wedges, gold rim, bulbs) that eases to land on JACKPOT; on win, a Rapier physics coin-storm erupts and a DOM win modal appears. Bloom/vignette/chromatic-aberration postprocessing, procedural Lightformer environment (offline-safe), cursor/gyro parallax, and Howler sound (muted by default) complete the iGaming feel.

**Tech Stack:** Next 15.1 + React 19, three@0.184.0, @react-three/fiber@9.6.1, @react-three/drei@10.7.7, @react-three/postprocessing@3.0.4, @react-three/rapier@2.2.0, howler@2.2.4. Vitest (unit) + Playwright (smoke + screenshots).

## Global Constraints

- Pin these versions exactly (R3F ecosystem is React-version-sensitive; React is 19.0.0):
  `three@0.184.0 @react-three/fiber@9.6.1 @react-three/drei@10.7.7 @react-three/postprocessing@3.0.4 @react-three/rapier@2.2.0 howler@2.2.4`; dev `@types/three@^0.184 @types/howler@^2.2`.
- This is a DESIGN MOCKUP: scripted demo only. No DB / `Landing` model / admin / template wiring.
- The wheel deterministically lands on **JACKPOT** = segment index **7** of 8.
- Wheel segments (in order, index 0→7): `€5, 50 FS, €10, 100 FS, €20, 200 FS, 50% Bonus, JACKPOT`.
- Boomzino palette (exact hex): bg `#0C1F1C`, deep `#070D0B`, surface `#15564A`, gold `#F5C24B`, gold-bright `#FFD56A`, lab-green `#5BE36A`, red `#E2483D`, cream `#F4F1E8`, text `#EAF6EE`, muted `#8FB9AD`.
- Offline-safe: NO external HDRI/font/asset fetches. Environment lighting uses drei `<Lightformer>`s; text labels use a `CanvasTexture` (system font), not remote fonts.
- Sound is **muted by default**; unmuting is a user gesture (toggle). No audio autoplays.
- Honor `prefers-reduced-motion: reduce`: skip idle float/sparkle motion and shorten the spin to a near-instant settle (still resolves to the win).
- Required DOM test hooks: `data-testid` on `spin-button`, `win-modal`, `sound-toggle`.
- Keep `public/prototypes/boomzino-alchemy-lab.html` and its tests untouched.
- Spec: `docs/superpowers/specs/2026-06-22-jackpot-vault-3d-flagship-design.md`.

---

## File Structure

- `app/prototypes/3d/jackpot-vault/page.tsx` — client route; `dynamic(ssr:false)` loads the scene + themed loader.
- `components/r3f/spinMath.ts` — pure landing math (`targetRotationDeg`, `segmentUnderPointer`, `easeOutCubic`).
- `components/r3f/spinController.ts` — pure spin state machine (`createSpinController`).
- `components/r3f/spinMath.test.ts` + `spinController.test.ts` — vitest.
- `components/r3f/useReducedMotion.ts` — tiny hook.
- `components/r3f/sound.ts` — Howler wrapper with runtime-generated WAV tones.
- `components/r3f/Wheel3D.tsx` — procedural 3D wheel (extruded wedges, rim, bulbs, hub, canvas labels, pointer).
- `components/r3f/NeonSign.tsx` — "777" emissive sign + rotating sunburst.
- `components/r3f/Effects.tsx` — postprocessing composer.
- `components/r3f/CoinStorm.tsx` — Rapier physics coin burst (+ error boundary).
- `components/r3f/JackpotVaultOverlay.tsx` + `jackpotVault.module.css` — DOM UI over the canvas.
- `components/r3f/JackpotVaultScene.tsx` — composition root (`<Canvas>` + scene + overlay; owns spin state).
- `tests/e2e/jackpotVault3d.spec.ts` — Playwright smoke + screenshots.
- Modify `public/prototypes/index.html` (gallery link), delete `public/prototypes/boomzino-jackpot-vault.html`, remove the Jackpot test block from `tests/e2e/prototypes.spec.ts`.

---

### Task 1: Dependencies + route boots a WebGL canvas

**Files:**
- Modify: `package.json` (via npm install), `next.config.ts`
- Create: `app/prototypes/3d/jackpot-vault/page.tsx`
- Create: `components/r3f/JackpotVaultScene.tsx`
- Test: `tests/e2e/jackpotVault3d.spec.ts`

**Interfaces:**
- Produces: route `/prototypes/3d/jackpot-vault`; `JackpotVaultScene` React component (grows over later tasks).

- [ ] **Step 1: Install the 3D stack (pinned)**

Run:
```bash
npm install three@0.184.0 @react-three/fiber@9.6.1 @react-three/drei@10.7.7 @react-three/postprocessing@3.0.4 @react-three/rapier@2.2.0 howler@2.2.4
npm install -D @types/three@^0.184 @types/howler@^2.2
```
Expected: installs without peer-dependency errors (React 19 satisfies all peers).

- [ ] **Step 1b: Transpile the 3D packages (build-safety)**

Replace `next.config.ts` with (adds `transpilePackages` so Next compiles the ESM three.js ecosystem cleanly during `next build`; keeps the existing `images` config):
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "@react-three/postprocessing",
    "@react-three/rapier",
  ],
};
export default nextConfig;
```

- [ ] **Step 2: Write the failing smoke test**

Create `tests/e2e/jackpotVault3d.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("3D Jackpot Vault route boots a WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/jackpot-vault");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line`
Expected: FAIL — route 404 (page does not exist).

- [ ] **Step 4: Create the minimal scene**

Create `components/r3f/JackpotVaultScene.tsx`:
```tsx
"use client";
import { Canvas } from "@react-three/fiber";

export function JackpotVaultScene() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#070D0B" }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 5, 6]} intensity={60} color="#FFD56A" />
        <mesh rotation={[0.5, 0.4, 0]}>
          <icosahedronGeometry args={[1.6, 0]} />
          <meshStandardMaterial color="#F5C24B" metalness={0.9} roughness={0.2} emissive="#1c1400" />
        </mesh>
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 5: Create the route**

Create `app/prototypes/3d/jackpot-vault/page.tsx`:
```tsx
"use client";
import dynamic from "next/dynamic";

const JackpotVaultScene = dynamic(
  () => import("@/components/r3f/JackpotVaultScene").then((m) => m.JackpotVaultScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#070D0B", color: "#F5C24B", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        LOADING THE VAULT…
      </div>
    ),
  }
);

export default function Page() {
  return <JackpotVaultScene />;
}
```

- [ ] **Step 6: Run the smoke to verify it passes**

Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line`
Expected: PASS (route 200, a `<canvas>` mounts, no uncaught page errors). First run does `npm run build` — slower (~1-2 min) because three is now bundled.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.ts app/prototypes/3d/jackpot-vault/page.tsx components/r3f/JackpotVaultScene.tsx tests/e2e/jackpotVault3d.spec.ts
git commit -m "feat: 3D jackpot-vault route boots an R3F canvas (deps + shell)"
```

---

### Task 2: Pure spin math + controller (unit-tested)

**Files:**
- Create: `components/r3f/spinMath.ts`
- Create: `components/r3f/spinController.ts`
- Test: `components/r3f/spinMath.test.ts`, `components/r3f/spinController.test.ts`

**Interfaces:**
- Produces:
  - `targetRotationDeg(winningIndex: number, segments = 8, turns = 6): number` — clockwise degrees the wheel must rotate so segment `winningIndex` centers under the top pointer (includes `turns` full spins).
  - `segmentUnderPointer(rotationDeg: number, segments = 8): number` — which segment index is under the top pointer at a given clockwise rotation.
  - `easeOutCubic(t: number): number`.
  - `createSpinController({ winningIndex?, durationMs?, turns?, segments? }): { start(): void; update(dtMs: number): void; reset(): void; readonly status: "idle"|"spinning"|"won"; readonly rotation: number; readonly target: number }` — `update` advances only while `spinning`; transitions to `won` at `durationMs`.

- [ ] **Step 1: Write the failing math tests**

Create `components/r3f/spinMath.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { targetRotationDeg, segmentUnderPointer, easeOutCubic } from "./spinMath";

describe("spinMath", () => {
  it("lands the winning segment under the top pointer", () => {
    const t = targetRotationDeg(7, 8, 6);
    expect(((t % 360) + 360) % 360).toBeCloseTo(22.5, 5);
    expect(segmentUnderPointer(t, 8)).toBe(7);
  });

  it("includes the requested number of full turns", () => {
    expect(targetRotationDeg(7, 8, 6)).toBeCloseTo(2182.5, 5);
    expect(targetRotationDeg(0, 8, 0)).toBeCloseTo(337.5, 5);
  });

  it("maps rotations back to segments", () => {
    expect(segmentUnderPointer(0, 8)).toBe(0);
    expect(segmentUnderPointer(targetRotationDeg(3, 8, 2), 8)).toBe(3);
    expect(segmentUnderPointer(targetRotationDeg(5, 8, 4), 8)).toBe(5);
  });

  it("easeOutCubic spans 0..1", () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 5);
    expect(easeOutCubic(1)).toBeCloseTo(1, 5);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/r3f/spinMath.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `spinMath.ts`**

Create `components/r3f/spinMath.ts`:
```ts
// Pure landing math for the wheel. "Clock degrees" = clockwise from the top (12 o'clock).
// Segment i (rest) is centered at clock angle i*seg + seg/2; the pointer sits at clock 0.

export function easeOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 3);
}

export function targetRotationDeg(winningIndex: number, segments = 8, turns = 6): number {
  const seg = 360 / segments;
  const center = winningIndex * seg + seg / 2; // rest clock angle of the segment center
  const base = (((-center) % 360) + 360) % 360; // clockwise rotation that brings it to the top
  return 360 * turns + base;
}

export function segmentUnderPointer(rotationDeg: number, segments = 8): number {
  const seg = 360 / segments;
  // The rest-angle currently sitting at the top is (-rotation) mod 360.
  const a = (((-rotationDeg) % 360) + 360) % 360;
  return (((Math.round((a - seg / 2) / seg) % segments) + segments) % segments);
}
```

- [ ] **Step 4: Run the math tests to verify they pass**

Run: `npx vitest run components/r3f/spinMath.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing controller tests**

Create `components/r3f/spinController.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createSpinController } from "./spinController";
import { targetRotationDeg } from "./spinMath";

describe("createSpinController", () => {
  it("starts idle at rotation 0", () => {
    const c = createSpinController();
    expect(c.status).toBe("idle");
    expect(c.rotation).toBe(0);
  });

  it("transitions idle -> spinning -> won and lands on target", () => {
    const c = createSpinController({ winningIndex: 7, durationMs: 1000, turns: 6 });
    c.start();
    expect(c.status).toBe("spinning");
    c.update(500);
    expect(c.status).toBe("spinning");
    expect(c.rotation).toBeGreaterThan(0);
    c.update(600); // total 1100 >= 1000
    expect(c.status).toBe("won");
    expect(c.rotation).toBeCloseTo(targetRotationDeg(7, 8, 6), 5);
  });

  it("ignores start() while spinning and update() while idle/won", () => {
    const c = createSpinController({ durationMs: 1000 });
    c.update(500);
    expect(c.rotation).toBe(0); // idle: no-op
    c.start();
    c.start(); // second start ignored
    c.update(2000);
    const r = c.rotation;
    c.update(2000); // won: no-op
    expect(c.rotation).toBe(r);
  });

  it("reset returns to idle", () => {
    const c = createSpinController({ durationMs: 100 });
    c.start();
    c.update(200);
    c.reset();
    expect(c.status).toBe("idle");
    expect(c.rotation).toBe(0);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run components/r3f/spinController.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `spinController.ts`**

Create `components/r3f/spinController.ts`:
```ts
import { easeOutCubic, targetRotationDeg } from "./spinMath";

export type SpinStatus = "idle" | "spinning" | "won";

export function createSpinController(
  { winningIndex = 7, durationMs = 4500, turns = 6, segments = 8 } = {}
) {
  const target = targetRotationDeg(winningIndex, segments, turns);
  let status: SpinStatus = "idle";
  let elapsed = 0;
  let rotation = 0;

  return {
    start() {
      if (status !== "idle") return;
      status = "spinning";
      elapsed = 0;
    },
    update(dtMs: number) {
      if (status !== "spinning") return;
      elapsed = Math.min(elapsed + dtMs, durationMs);
      rotation = easeOutCubic(elapsed / durationMs) * target;
      if (elapsed >= durationMs) {
        rotation = target;
        status = "won";
      }
    },
    reset() {
      status = "idle";
      elapsed = 0;
      rotation = 0;
    },
    get status() { return status; },
    get rotation() { return rotation; },
    target,
  };
}
```

- [ ] **Step 8: Run controller tests + full unit suite**

Run: `npx vitest run components/r3f/`
Expected: PASS (both files). Then `npm test` → still all green.

- [ ] **Step 9: Commit**

```bash
git add components/r3f/spinMath.ts components/r3f/spinController.ts components/r3f/spinMath.test.ts components/r3f/spinController.test.ts
git commit -m "feat: pure spin math + controller state machine (unit-tested)"
```

---

### Task 3: The 3D scene — wheel, environment, neon, postprocessing (visual checkpoint)

**Files:**
- Create: `components/r3f/useReducedMotion.ts`, `components/r3f/Wheel3D.tsx`, `components/r3f/NeonSign.tsx`, `components/r3f/Effects.tsx`
- Modify: `components/r3f/JackpotVaultScene.tsx`

**Interfaces:**
- Consumes: `spinController`, `spinMath` (Task 2).
- Produces:
  - `useReducedMotion(): boolean`.
  - `<Wheel3D rotationRef={React.MutableRefObject<number>} />` — applies `group.rotation.z = -rotationDeg` each frame.
  - `<NeonSign />`, `<Effects />`.
  - `JackpotVaultScene` now renders the full idle scene and exposes (internally) a `spin()` it will wire to the overlay in Task 4. For this task, add a temporary auto-spin 1.5s after mount (removed in Task 4) so the checkpoint shows motion.

- [ ] **Step 1: Reduced-motion hook**

Create `components/r3f/useReducedMotion.ts`:
```ts
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
```

- [ ] **Step 2: Wheel3D**

Create `components/r3f/Wheel3D.tsx`:
```tsx
import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LABELS = ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"];
const SEG_COLORS = ["#15564A", "#F5C24B", "#15564A", "#F5C24B", "#15564A", "#F5C24B", "#15564A", "#E2483D"];
const SEGMENTS = 8;
const RADIUS = 2.1;

function wedgeShape(startRad: number, endRad: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(Math.cos(startRad) * radius, Math.sin(startRad) * radius);
  s.absarc(0, 0, radius, startRad, endRad, false);
  s.lineTo(0, 0);
  return s;
}

function useLabelTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, r = size * 0.36;
    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.fillStyle = "#F4F1E8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    for (let i = 0; i < SEGMENTS; i++) {
      const clock = i * (360 / SEGMENTS) + 360 / SEGMENTS / 2; // clockwise from top
      const a = (-(clock - 90) * Math.PI) / 180; // canvas: 0=+x, y down; top=-90
      const x = cx + Math.cos(a) * r;
      const y = cy - Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-a + Math.PI / 2); // tangential, readable
      ctx.strokeText(LABELS[i], 0, 0);
      ctx.fillText(LABELS[i], 0, 0);
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function Wheel3D({ rotationRef }: { rotationRef: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null!);
  const seg = (2 * Math.PI) / SEGMENTS;
  const labelTex = useLabelTexture();

  const wedges = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => {
        // Map clock segment i [i*45 .. i*45+45] (cw from top) to math radians (ccw from +x).
        const startDeg = 90 - (i + 1) * (360 / SEGMENTS);
        const endDeg = 90 - i * (360 / SEGMENTS);
        const shape = wedgeShape((startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180, RADIUS);
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
        });
        return { geom, color: SEG_COLORS[i], jackpot: i === 7 };
      }),
    [seg]
  );

  const bulbs = useMemo(
    () => Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return [Math.cos(a) * (RADIUS + 0.12), Math.sin(a) * (RADIUS + 0.12), 0.42] as const;
    }),
    []
  );

  useFrame(() => {
    if (group.current) group.current.rotation.z = THREE.MathUtils.degToRad(-rotationRef.current);
  });

  return (
    <group>
      {/* pointer (fixed, not spinning) */}
      <mesh position={[0, RADIUS + 0.35, 0.5]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.16, 0.42, 4]} />
        <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.25} emissive="#FFB020" emissiveIntensity={1.5} />
      </mesh>

      <group ref={group}>
        {wedges.map((w, i) => (
          <mesh key={i} geometry={w.geom} castShadow>
            <meshStandardMaterial
              color={w.color}
              metalness={w.jackpot || w.color === "#F5C24B" ? 0.95 : 0.4}
              roughness={0.3}
              emissive={w.jackpot ? "#E2483D" : w.color === "#F5C24B" ? "#5a3d00" : "#08221c"}
              emissiveIntensity={w.jackpot ? 1.4 : 0.6}
            />
          </mesh>
        ))}

        {/* labels disc */}
        <mesh position={[0, 0, 0.41]}>
          <circleGeometry args={[RADIUS, 64]} />
          <meshBasicMaterial map={labelTex} transparent />
        </mesh>

        {/* gold rim */}
        <mesh position={[0, 0, 0.18]}>
          <torusGeometry args={[RADIUS + 0.12, 0.16, 16, 96]} />
          <meshStandardMaterial color="#F5C24B" metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={0.8} />
        </mesh>

        {/* bulbs */}
        {bulbs.map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color="#FFF6D8" emissive="#FFD56A" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}

        {/* hub */}
        <mesh position={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 48]} />
          <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
```

- [ ] **Step 3: NeonSign**

Create `components/r3f/NeonSign.tsx`:
```tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function NeonSign() {
  const rays = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (rays.current) rays.current.rotation.z += dt * 0.15;
  });
  return (
    <group position={[0, 0, -2]}>
      {/* rotating gold sunburst */}
      <group ref={rays}>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0]} rotation={[0, 0, a]}>
              <planeGeometry args={[0.18, 3.4]} />
              <meshBasicMaterial color="#F5C24B" transparent opacity={0.22} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>
      {/* 777 emissive bar */}
      <mesh position={[0, 3.0, 0.2]}>
        <boxGeometry args={[2.0, 0.7, 0.2]} />
        <meshStandardMaterial color="#E2483D" emissive="#E2483D" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 4: Effects**

Create `components/r3f/Effects.tsx`:
```tsx
import { useMemo } from "react";
import * as THREE from "three";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SMAA } from "@react-three/postprocessing";

export function Effects({ chromatic = true }: { chromatic?: boolean }) {
  // ChromaticAberration's `offset` must be a THREE.Vector2 (an array throws at runtime).
  const caOffset = useMemo(() => new THREE.Vector2(0.0009, 0.0009), []);
  return (
    <EffectComposer>
      <Bloom intensity={1.2} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
      {chromatic ? <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} /> : <></>}
      <SMAA />
    </EffectComposer>
  );
}
```

- [ ] **Step 5: Assemble the scene (with temporary auto-spin)**

Replace `components/r3f/JackpotVaultScene.tsx` with:
```tsx
"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Wheel3D } from "./Wheel3D";
import { NeonSign } from "./NeonSign";
import { Effects } from "./Effects";
import { useReducedMotion } from "./useReducedMotion";
import { createSpinController } from "./spinController";

function SpinDriver({ controller, rotationRef }: {
  controller: ReturnType<typeof createSpinController>;
  rotationRef: React.MutableRefObject<number>;
}) {
  useFrame((_, dt) => {
    controller.update(dt * 1000);
    rotationRef.current = controller.rotation;
  });
  return null;
}

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} />;
  return reduced ? <group>{wheel}</group> : (
    <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>
  );
}

export function JackpotVaultScene() {
  const reduced = useReducedMotion();
  const rotationRef = useRef(0);
  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );

  // TEMPORARY: auto-spin for the visual checkpoint (removed in Task 4).
  useEffect(() => {
    const t = setTimeout(() => controller.start(), 1500);
    return () => clearTimeout(t);
  }, [controller]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070D0B" }}>
      <Canvas camera={{ position: [0, 0.2, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#070D0B"]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 6, 6]} intensity={120} color="#FFD56A" />
        <pointLight position={[-6, -3, 4]} intensity={50} color="#5BE36A" />

        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} color="#FFD56A" position={[5, 5, 4]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={2} color="#5BE36A" position={[-6, 0, 3]} scale={[5, 5, 1]} />
          <Lightformer form="circle" intensity={2} color="#ffffff" position={[0, -4, 4]} scale={[4, 4, 1]} />
        </Environment>

        <NeonSign />
        <SpinDriver controller={controller} rotationRef={rotationRef} />
        <WheelRig rotationRef={rotationRef} reduced={reduced} />
        {!reduced && <Sparkles count={60} scale={[10, 8, 4]} size={3} speed={0.3} color="#FFD56A" />}

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 6: Verify it still boots + capture idle/spun screenshots**

Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line`
Expected: PASS (canvas mounts, no page errors).
Then start the server and screenshot (best-effort; for the controller's visual review):
```bash
npm run build && npm run start &   # serves :3000
# wait for http://localhost:3000, then:
npx playwright screenshot --viewport-size=900,800 "http://localhost:3000/prototypes/3d/jackpot-vault" docs/superpowers/stitch-assets/boomzino/jv3d-scene.png
# kill the server you launched (kill %1 / the next start PID) — no broad pkill
```
Expected: a PNG of the 3D scene (wheel, rim, bulbs, neon, bloom).

- [ ] **Step 7: Commit**

```bash
git add components/r3f/useReducedMotion.ts components/r3f/Wheel3D.tsx components/r3f/NeonSign.tsx components/r3f/Effects.tsx components/r3f/JackpotVaultScene.tsx docs/superpowers/stitch-assets/boomzino/jv3d-scene.png
git commit -m "feat: 3D wheel + vault environment + neon + postprocessing"
```

---

### Task 4: DOM overlay, spin interaction, sound, parallax

**Files:**
- Create: `components/r3f/JackpotVaultOverlay.tsx`, `components/r3f/jackpotVault.module.css`, `components/r3f/sound.ts`
- Modify: `components/r3f/JackpotVaultScene.tsx`
- Modify: `tests/e2e/jackpotVault3d.spec.ts`

**Interfaces:**
- Consumes: spin controller + `rotationRef` from the scene; `useReducedMotion`.
- Produces:
  - `sound.ts`: `getSound(): { tick(): void; win(): void; setMuted(m: boolean): void; muted(): boolean }` (lazy singleton; Howler; runtime-generated WAV tones; starts muted).
  - `<JackpotVaultOverlay status, muted, onSpin, onToggleSound, onClaim />` DOM UI with test hooks `spin-button`, `win-modal`, `sound-toggle`.
  - Scene wires the SPIN CTA to `controller.start()`, mirrors `status` to React state, plays sounds, and tilts a group from pointer (parallax). The Task-3 auto-spin is removed.

- [ ] **Step 1: Sound wrapper (Howler, generated tones)**

Create `components/r3f/sound.ts`:
```ts
import { Howl, Howler } from "howler";

function wavDataUri(freqs: number[], ms: number, gain = 0.25): string {
  const rate = 44100;
  const n = Math.floor((rate * ms) / 1000);
  const bytes = 44 + n * 2;
  const buf = new ArrayBuffer(bytes);
  const v = new DataView(buf);
  const wr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, "RIFF"); v.setUint32(4, bytes - 8, true); wr(8, "WAVE"); wr(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); wr(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let s = 0;
    for (const f of freqs) s += Math.sin(2 * Math.PI * f * t);
    s = (s / freqs.length) * gain * Math.exp(-3 * (i / n)); // decay
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  let bin = "";
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

let inst: ReturnType<typeof build> | null = null;
function build() {
  const tick = new Howl({ src: [wavDataUri([1200], 40, 0.18)], format: ["wav"] });
  const win = new Howl({ src: [wavDataUri([523, 659, 784], 900, 0.3)], format: ["wav"] });
  Howler.mute(true);
  let muted = true;
  return {
    tick() { if (!muted) tick.play(); },
    win() { if (!muted) win.play(); },
    setMuted(m: boolean) { muted = m; Howler.mute(m); },
    muted() { return muted; },
  };
}
export function getSound() {
  if (!inst) inst = build();
  return inst;
}
```

- [ ] **Step 2: Overlay CSS module**

Create `components/r3f/jackpotVault.module.css`:
```css
.overlay { position: fixed; inset: 0; pointer-events: none; font-family: system-ui, sans-serif; color: #EAF6EE; }
.overlay [data-pe] { pointer-events: auto; }
.top { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; }
.logo { color: #F5C24B; font-weight: 800; letter-spacing: 1px; font-size: 22px; text-shadow: 0 0 16px rgba(245,194,75,.5); }
.sound { background: rgba(21,86,74,.7); color: #EAF6EE; border: 1px solid rgba(245,194,75,.4); border-radius: 999px; padding: 8px 12px; font-size: 16px; cursor: pointer; }
.hero { position: absolute; top: 60px; left: 0; right: 0; text-align: center; }
.hero h1 { margin: 0; font-size: clamp(30px, 6vw, 52px); font-weight: 800; color: #FFD56A; text-shadow: 0 0 26px rgba(245,194,75,.5); }
.banner { display: inline-block; margin-top: 8px; padding: 6px 16px; border-radius: 10px; background: #E2483D; color: #F4F1E8; font-weight: 800; letter-spacing: 6px; border: 2px solid #F5C24B; }
.cta { position: absolute; left: 50%; bottom: 42px; transform: translateX(-50%); padding: 16px 40px; border-radius: 999px; border: none; background: linear-gradient(180deg, #FFD56A, #F5C24B); color: #2a1e00; font-weight: 800; font-size: 18px; cursor: pointer; box-shadow: 0 0 30px rgba(245,194,75,.6); }
.cta:disabled { opacity: .65; cursor: default; }
.win { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(2,10,6,.72); backdrop-filter: blur(4px); }
.win[hidden] { display: none !important; }
.card { width: min(340px, 86vw); text-align: center; padding: 28px; border-radius: 20px; background: #15564A; border: 1px solid rgba(245,194,75,.5); box-shadow: 0 0 50px rgba(245,194,75,.4); }
.card h2 { margin: 6px 0; } .prize { color: #FFD56A; font-size: 32px; font-weight: 800; }
.claim { width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px; background: #F5C24B; color: #2a1e00; font-weight: 800; font-size: 16px; cursor: pointer; }
```

- [ ] **Step 3: Overlay component**

Create `components/r3f/JackpotVaultOverlay.tsx`:
```tsx
import css from "./jackpotVault.module.css";
import type { SpinStatus } from "./spinController";

export function JackpotVaultOverlay({
  status, muted, onSpin, onToggleSound, onClaim,
}: {
  status: SpinStatus;
  muted: boolean;
  onSpin: () => void;
  onToggleSound: () => void;
  onClaim: () => void;
}) {
  return (
    <div className={css.overlay}>
      <div className={css.top}>
        <div className={css.logo}>BOOMZINO</div>
        <button data-pe data-testid="sound-toggle" className={css.sound} onClick={onToggleSound} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
      <div className={css.hero}>
        <h1>BOOM your luck</h1>
        <div className={css.banner}>7 7 7</div>
      </div>
      <button
        data-pe data-testid="spin-button" className={css.cta}
        onClick={onSpin} disabled={status !== "idle"}
      >
        {status === "spinning" ? "SPINNING…" : "SPIN TO WIN"}
      </button>
      <div className={css.win} data-testid="win-modal" hidden={status !== "won"}>
        <div className={css.card} data-pe>
          <div style={{ fontSize: 44 }}>💰</div>
          <h2>JACKPOT — You won</h2>
          <div className={css.prize}>JACKPOT!</div>
          <button className={css.claim} onClick={onClaim}>Claim bonus</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire the scene (remove auto-spin; add overlay, sound, parallax)**

Replace `components/r3f/JackpotVaultScene.tsx` with:
```tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { Wheel3D } from "./Wheel3D";
import { NeonSign } from "./NeonSign";
import { Effects } from "./Effects";
import { JackpotVaultOverlay } from "./JackpotVaultOverlay";
import { useReducedMotion } from "./useReducedMotion";
import { createSpinController, type SpinStatus } from "./spinController";
import { getSound } from "./sound";

function SpinDriver({ controller, rotationRef, onStatus }: {
  controller: ReturnType<typeof createSpinController>;
  rotationRef: React.MutableRefObject<number>;
  onStatus: (s: SpinStatus) => void;
}) {
  const prev = useRef<SpinStatus>("idle");
  useFrame((_, dt) => {
    controller.update(dt * 1000);
    rotationRef.current = controller.rotation;
    if (controller.status !== prev.current) {
      prev.current = controller.status;
      onStatus(controller.status);
    }
  });
  return null;
}

function Parallax({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const tilt = useRef({ x: 0, y: 0 });
  const { pointer } = useThree();
  useEffect(() => {
    if (reduced) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      tilt.current.x = THREE.MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1); // left/right
      tilt.current.y = THREE.MathUtils.clamp(((e.beta ?? 0) - 45) / 45, -1, 1); // front/back
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [reduced]);
  useFrame(() => {
    if (!g.current || reduced) return;
    const px = pointer.x + tilt.current.x;
    const py = pointer.y - tilt.current.y;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, px * 0.25, 0.05);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -py * 0.18, 0.05);
  });
  return <group ref={g}>{children}</group>;
}

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>;
}

export function JackpotVaultScene() {
  const reduced = useReducedMotion();
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );

  const onSpin = () => {
    if (controller.status !== "idle") return;
    controller.start();
    setStatus("spinning");
    getSound().tick();
  };
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") getSound().win();
  };
  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    getSound().setMuted(next);
  };
  const onClaim = () => { /* demo: no real redirect */ };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070D0B" }}>
      <Canvas camera={{ position: [0, 0.2, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#070D0B"]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 6, 6]} intensity={120} color="#FFD56A" />
        <pointLight position={[-6, -3, 4]} intensity={50} color="#5BE36A" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} color="#FFD56A" position={[5, 5, 4]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={2} color="#5BE36A" position={[-6, 0, 3]} scale={[5, 5, 1]} />
          <Lightformer form="circle" intensity={2} color="#ffffff" position={[0, -4, 4]} scale={[4, 4, 1]} />
        </Environment>

        <SpinDriver controller={controller} rotationRef={rotationRef} onStatus={onStatus} />
        <Parallax reduced={reduced}>
          <NeonSign />
          <WheelRig rotationRef={rotationRef} reduced={reduced} />
          {!reduced && <Sparkles count={60} scale={[10, 8, 4]} size={3} speed={0.3} color="#FFD56A" />}
        </Parallax>

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>

      <JackpotVaultOverlay
        status={status} muted={muted}
        onSpin={onSpin} onToggleSound={onToggleSound} onClaim={onClaim}
      />
    </div>
  );
}
```

- [ ] **Step 5: Extend the smoke (SPIN → win modal, reduced-motion for speed)**

Replace `tests/e2e/jackpotVault3d.spec.ts` with:
```ts
import { test, expect } from "@playwright/test";

test("3D Jackpot Vault route boots a WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/jackpot-vault");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test.describe("spin to win", () => {
  test.use({ reducedMotion: "reduce" }); // shortens the demo spin to ~250ms
  test("SPIN reaches the win modal; overlay UI present", async ({ page }) => {
    await page.goto("/prototypes/3d/jackpot-vault");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sound-toggle")).toBeVisible();
    await expect(page.getByTestId("win-modal")).toBeHidden();
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("JACKPOT!")).toBeVisible();
  });
});
```

- [ ] **Step 6: Run the smoke + capture the win screenshot**

Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line`
Expected: PASS (2 tests).

Capture the win screenshot (best-effort). Start the server, run the inline script, then stop the server:
```bash
npm run build && npm run start &   # serves :3000 (wait until it responds)
node -e "const {chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:900,height:800}});await p.goto('http://localhost:3000/prototypes/3d/jackpot-vault');await p.locator('canvas').waitFor();await p.getByTestId('spin-button').click();await p.getByTestId('win-modal').waitFor({timeout:15000});await p.waitForTimeout(800);await p.screenshot({path:'docs/superpowers/stitch-assets/boomzino/jv3d-win.png'});await b.close();})();"
# stop the server you launched (kill %1 / the next start PID) — no broad pkill
```
Expected: a PNG of the spun wheel (JACKPOT at top) + win modal.

- [ ] **Step 7: Commit**

```bash
git add components/r3f/sound.ts components/r3f/jackpotVault.module.css components/r3f/JackpotVaultOverlay.tsx components/r3f/JackpotVaultScene.tsx tests/e2e/jackpotVault3d.spec.ts docs/superpowers/stitch-assets/boomzino/jv3d-win.png
git commit -m "feat: DOM overlay + spin interaction + Howler sound + parallax"
```

---

### Task 5: Physics coin storm on win (Rapier)

**Files:**
- Create: `components/r3f/CoinStorm.tsx`
- Modify: `components/r3f/JackpotVaultScene.tsx`

**Interfaces:**
- Consumes: scene `status` ("won") + `reduced`.
- Produces: `<CoinStorm count={number} />` — Rapier physics; mounts only when `status === "won"`; wrapped in an error boundary so a physics/WASM failure can't crash the scene.

- [ ] **Step 1: CoinStorm component**

Create `components/r3f/CoinStorm.tsx`:
```tsx
import { Component, useMemo, type ReactNode } from "react";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function Coins({ count }: { count: number }) {
  const coins = useMemo(
    () => Array.from({ length: count }, () => ({
      pos: [(Math.random() - 0.5) * 1.2, 0.5 + Math.random(), 0.6 + Math.random()] as [number, number, number],
      vel: [(Math.random() - 0.5) * 6, 6 + Math.random() * 5, (Math.random() - 0.5) * 3] as [number, number, number],
      rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
    })),
    [count]
  );
  return (
    <Physics gravity={[0, -16, 0]}>
      <CuboidCollider args={[12, 0.5, 12]} position={[0, -4, 0]} />
      {coins.map((c, i) => (
        <RigidBody key={i} position={c.pos} rotation={c.rot} linearVelocity={c.vel} angularVelocity={[0, 8, 4]} colliders="hull" restitution={0.4}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
            <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.25} emissive="#5a3d00" emissiveIntensity={0.8} />
          </mesh>
        </RigidBody>
      ))}
    </Physics>
  );
}

export function CoinStorm({ count = 120 }: { count?: number }) {
  return (
    <Boundary>
      <Coins count={count} />
    </Boundary>
  );
}
```

- [ ] **Step 2: Mount on win**

In `components/r3f/JackpotVaultScene.tsx`, add the import:
```tsx
import { CoinStorm } from "./CoinStorm";
```
Then inside `<Parallax …>`, after `<WheelRig … />`, add (mount only on win; fewer coins on small screens / reduced motion):
```tsx
{status === "won" && (
  <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 60 : 120)} />
)}
```

- [ ] **Step 3: Verify the suite still passes**

Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line`
Expected: PASS — the win path now also mounts the physics coins; the error boundary keeps a (hypothetical) WASM failure from breaking the win-modal assertion.

- [ ] **Step 4: Capture the coin-storm screenshot**

Best-effort. With the server running (`npm run build && npm run start`):
```bash
node -e "const {chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:900,height:800}});await p.goto('http://localhost:3000/prototypes/3d/jackpot-vault');await p.locator('canvas').waitFor();await p.getByTestId('spin-button').click();await p.getByTestId('win-modal').waitFor({timeout:15000});await p.waitForTimeout(1500);await p.screenshot({path:'docs/superpowers/stitch-assets/boomzino/jv3d-coins.png'});await b.close();})();"
# stop the server you launched by PID — no broad pkill
```
Expected: a PNG with gold coins mid-air/settling around the wheel.

- [ ] **Step 5: Commit**

```bash
git add components/r3f/CoinStorm.tsx components/r3f/JackpotVaultScene.tsx docs/superpowers/stitch-assets/boomzino/jv3d-coins.png
git commit -m "feat: Rapier physics coin storm on jackpot win"
```

---

### Task 6: Retire the Jackpot HTML + update the gallery

**Files:**
- Delete: `public/prototypes/boomzino-jackpot-vault.html`
- Modify: `public/prototypes/index.html`, `tests/e2e/prototypes.spec.ts`

**Interfaces:**
- Consumes: the new route `/prototypes/3d/jackpot-vault`.

- [ ] **Step 1: Update the gallery link**

In `public/prototypes/index.html`, replace the Jackpot card's `href="./boomzino-jackpot-vault.html"` with `href="/prototypes/3d/jackpot-vault"` and update its sub-text to `Real-time 3D · physics · sound`. Leave the Alchemy Lab card unchanged.

- [ ] **Step 2: Remove the old Jackpot static test**

In `tests/e2e/prototypes.spec.ts`, delete the entire `test("Jackpot Boom Vault loads standalone, …", …)` block (the static-HTML smoke). Leave the gallery test, the Alchemy Lab smoke, and the reduced-motion test intact. Do not touch the imports.

- [ ] **Step 3: Delete the static Jackpot page**

Run: `git rm public/prototypes/boomzino-jackpot-vault.html`

- [ ] **Step 4: Verify everything green**

Run:
```bash
npx vitest run                                   # unit incl. spinMath/spinController
npx playwright test tests/e2e/prototypes.spec.ts --reporter=line   # gallery + Alchemy (3 tests)
npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line # 3D smokes (2 tests)
```
Expected: all PASS. The retired Jackpot static test is gone; the 3D route is linked from the gallery.

- [ ] **Step 5: Commit**

```bash
git add public/prototypes/index.html tests/e2e/prototypes.spec.ts
git rm public/prototypes/boomzino-jackpot-vault.html
git commit -m "chore: retire static Jackpot mockup; gallery points to 3D route"
```

---

## Notes for the executor

- **First Playwright run builds the app with three.js bundled** — expect a slower (~1-2 min) build; the `webServer` reuses a running server (non-CI). Scope runs to the two prototype spec files; do NOT run the DB-backed `landing.spec.ts`/`admin.spec.ts`.
- **WebGL in headless Chromium** uses SwiftShader; it can emit console *warnings* (not errors). The smokes assert `pageerror` (uncaught exceptions) is empty, not console noise — keep it that way.
- **Screenshots need a separately-running server** (`npm run build && npm run start`); the test runner's `webServer` only lives during `playwright test`. After capturing, kill the server you launched by PID (`kill %1`) — never a broad `pkill`.
- **Rapier** uses `@dimforge/rapier3d-compat` (WASM inlined) via `@react-three/rapier`, so **no `next.config` webpack/WASM changes are needed**. The `Boundary` error boundary in `CoinStorm` is the safety net if physics fails to init in a given environment.
- If the Task 1/4 smoke ever reports a `pageerror` originating from postprocessing under headless WebGL, do NOT drop the effects — wrap `<Effects/>` in the same class error-boundary pattern used by `CoinStorm` (renders `null` on failure) so the scene + tests stay green while bloom still runs in real browsers. Report it as a `DONE_WITH_CONCERNS`.
- Visual quality (lighting, bloom, materials, layout) is judged from the **screenshot checkpoints** in Tasks 3–5 — treat those as the real acceptance gate and tune values (emissive intensities, bloom, camera) if a checkpoint looks off, keeping the test hooks and interfaces intact.
- Do not delete `components/r3f/*` test files; keep `spinMath`/`spinController` pure (no R3F imports) so they stay unit-testable.
```
