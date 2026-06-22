# Alchemy Lab 3D + Shared R3F Kit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the "Alchemy Lab" landing as a real-time 3D React/WebGL experience (bubbling cauldron + potion bottles + lab backdrop, potion-eruption + gold-coin win), by first extracting a shared, themeable R3F kit from the merged Jackpot Vault code and putting both landings on it.

**Architecture:** Move the already-generic R3F pieces into `components/r3f/kit/` and make the wheel, sound, scene plumbing, and overlay themeable. Refactor Jackpot Vault onto the kit (its existing tests are the regression guard). Then build Alchemy Lab as a thin themed scene plus its unique alchemy elements, on a new route.

**Tech Stack:** React 19 / Next 15.1, three@0.184, @react-three/fiber@9.6.1, @react-three/drei@10.7.7, @react-three/postprocessing@3.0.4, @react-three/rapier@2.2.0, howler@2.2.4. Vitest + Playwright.

## Global Constraints

- DESIGN MOCKUP only: scripted demo, lands JACKPOT (index 7); no DB/admin/template wiring.
- Wheel segments (both landings): `€5, 50 FS, €10, 100 FS, €20, 200 FS, 50% Bonus, JACKPOT`.
- Alchemy palette (exact): bg `#0A1A14`, glow `#16403A`, emerald `#15564A`/`#0F3B33`, toxic-green `#5BE36A`/`#8BFF5A`, gold `#F5C24B`/`#FFD24A`, red `#E2483D`, cream `#F4F1E8`, text `#EAF6EE`, muted `#8FB9AD`.
- Offline-safe: NO remote HDRI/font/asset fetches. Lightformer env; CanvasTexture labels (system font); runtime-generated WAV sound.
- Sound muted by default; unmute via the overlay toggle. Honor `prefers-reduced-motion` (idle motion off, spin shortened, win still resolves).
- Required DOM test hooks (from the shared overlay): `data-testid` on `spin-button`, `win-modal`, `sound-toggle`.
- **The Jackpot Vault route + its tests must stay green through the whole refactor** — they prove the kit extraction preserved behavior.
- Spec: `docs/superpowers/specs/2026-06-22-alchemy-lab-3d-and-shared-kit-design.md`.

---

## File Structure (end state)

```
components/r3f/kit/
  spinMath.ts, spinController.ts (+ .test.ts)   moved unchanged
  useReducedMotion.ts                           moved unchanged
  Effects.tsx                                   moved unchanged
  CoinStorm.tsx                                 moved + `color` prop
  types.ts                                      NEW (shared theme/sound types)
  Wheel3D.tsx                                   moved + themeable via props
  sound.ts                                      moved → createSound(config)
  spinScene.tsx                                 NEW (useSpinScene, SpinDriver, Parallax)
  SpinOverlay.tsx + spinOverlay.module.css      NEW (themeable overlay)
components/r3f/jackpot/
  theme.ts                                      NEW (wheel/sound/copy/vars config)
  NeonSign.tsx                                  moved unchanged
  JackpotVaultScene.tsx                         refactored onto the kit
components/r3f/alchemy/
  theme.ts                                      NEW
  Cauldron.tsx, PotionBottle.tsx, LabBackdrop.tsx  NEW
  AlchemyLabScene.tsx                           NEW
app/prototypes/3d/jackpot-vault/page.tsx         import path updated
app/prototypes/3d/alchemy-lab/page.tsx           NEW
tests/e2e/alchemyLab3d.spec.ts                   NEW
(deleted) components/r3f/JackpotVaultOverlay.tsx, jackpotVault.module.css
(deleted) public/prototypes/boomzino-alchemy-lab.html
```

---

### Task 1: Kit foundation — move the generic pieces

**Files:**
- Move: `components/r3f/{spinMath.ts,spinController.ts,spinMath.test.ts,spinController.test.ts,useReducedMotion.ts,Effects.tsx,CoinStorm.tsx}` → `components/r3f/kit/`
- Create: `components/r3f/kit/types.ts`
- Modify: `components/r3f/CoinStorm.tsx` (add `color` prop), `components/r3f/JackpotVaultScene.tsx` (import paths)

**Interfaces:**
- Produces (importable as `@/components/r3f/kit/…`): `spinMath`, `spinController` (`createSpinController`, `SpinStatus`), `useReducedMotion`, `Effects`, `CoinStorm({ count?, color? })`, and `types.ts`:
  ```ts
  export type ToneSpec = { freqs: number[]; ms: number; gain: number };
  export type SoundConfig = { tick: ToneSpec; win: ToneSpec };
  export type SoundInstance = { tick(): void; win(): void; setMuted(m: boolean): void; muted(): boolean };
  export type WheelTheme = {
    labels: string[]; segmentColors: string[]; goldIndices: number[]; jackpotIndex: number;
    goldColor: string; rimColor: string; bulbColor: string; labelColor: string; radius: number;
  };
  export type OverlayCopy = {
    logo: string; heading: string; subtitle?: string; subBanner?: string;
    ctaLabel: string; spinningLabel: string; winTitle: string; winPrize: string;
    claimLabel: string; winEmoji: string;
  };
  ```

- [ ] **Step 1: Move the generic files into kit/**

```bash
mkdir -p components/r3f/kit
git mv components/r3f/spinMath.ts components/r3f/kit/spinMath.ts
git mv components/r3f/spinController.ts components/r3f/kit/spinController.ts
git mv components/r3f/spinMath.test.ts components/r3f/kit/spinMath.test.ts
git mv components/r3f/spinController.test.ts components/r3f/kit/spinController.test.ts
git mv components/r3f/useReducedMotion.ts components/r3f/kit/useReducedMotion.ts
git mv components/r3f/Effects.tsx components/r3f/kit/Effects.tsx
git mv components/r3f/CoinStorm.tsx components/r3f/kit/CoinStorm.tsx
```
These files' internal imports are all relative within the group (`spinController.ts` imports `./spinMath`; the tests import `./spinMath`/`./spinController`) — they remain correct after the move. No content change needed for spinMath/spinController/useReducedMotion/Effects/tests.

- [ ] **Step 2: Create `components/r3f/kit/types.ts`**

```ts
export type ToneSpec = { freqs: number[]; ms: number; gain: number };
export type SoundConfig = { tick: ToneSpec; win: ToneSpec };
export type SoundInstance = { tick(): void; win(): void; setMuted(m: boolean): void; muted(): boolean };

export type WheelTheme = {
  labels: string[];
  segmentColors: string[];
  goldIndices: number[];
  jackpotIndex: number;
  goldColor: string;
  rimColor: string;
  bulbColor: string;
  labelColor: string;
  radius: number;
};

export type OverlayCopy = {
  logo: string;
  heading: string;
  subtitle?: string;
  subBanner?: string;
  ctaLabel: string;
  spinningLabel: string;
  winTitle: string;
  winPrize: string;
  claimLabel: string;
  winEmoji: string;
};
```

- [ ] **Step 3: Add a `color` prop to `kit/CoinStorm.tsx`**

In `components/r3f/kit/CoinStorm.tsx`, change the `Coins` signature and its `<meshStandardMaterial>` color, and the `CoinStorm` wrapper, so the coin color is themeable (default gold):

Replace `function Coins({ count }: { count: number }) {` with:
```tsx
function Coins({ count, color }: { count: number; color: string }) {
```
Replace the coin material line `<meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.22} emissive="#7a5200" emissiveIntensity={0.9} />` with:
```tsx
            <meshStandardMaterial color={color} metalness={1} roughness={0.22} emissive="#7a5200" emissiveIntensity={0.9} />
```
Replace the `CoinStorm` export with:
```tsx
export function CoinStorm({ count = 120, color = "#FFD56A" }: { count?: number; color?: string }) {
  return (
    <Boundary>
      <Coins count={count} color={color} />
    </Boundary>
  );
}
```

- [ ] **Step 4: Update Jackpot scene imports to kit paths**

In `components/r3f/JackpotVaultScene.tsx`, update these import specifiers (only the paths change):
- `from "./Effects"` → `from "./kit/Effects"`
- `from "./CoinStorm"` → `from "./kit/CoinStorm"`
- `from "./useReducedMotion"` → `from "./kit/useReducedMotion"`
- `from "./spinController"` → `from "./kit/spinController"`
(Leave `./Wheel3D`, `./NeonSign`, `./JackpotVaultOverlay`, `./sound` as-is for now — those move in later tasks.)

- [ ] **Step 5: Verify unit tests + Jackpot smoke stay green**

Run: `npx vitest run components/r3f/kit/` → Expected: spinMath + spinController tests PASS at the new path.
Run: `npm test` → Expected: full unit suite green (143).
Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line` → Expected: 2 passed (the route still boots + spins to win; first run rebuilds, ~1-2 min).

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit components/r3f/JackpotVaultScene.tsx
git commit -m "refactor: move generic R3F pieces into components/r3f/kit"
```

---

### Task 2: Themeable Wheel3D + createSound + jackpot/theme.ts

**Files:**
- Move: `components/r3f/Wheel3D.tsx` → `components/r3f/kit/Wheel3D.tsx` (themeable), `components/r3f/sound.ts` → `components/r3f/kit/sound.ts` (`createSound`)
- Create: `components/r3f/jackpot/theme.ts`
- Modify: `components/r3f/JackpotVaultScene.tsx` (use themed wheel + createSound + theme config)

**Interfaces:**
- Consumes: `kit/types.ts` (Task 1).
- Produces:
  - `kit/Wheel3D.tsx`: `Wheel3D({ rotationRef: MutableRefObject<number>, theme: WheelTheme })`.
  - `kit/sound.ts`: `createSound(config: SoundConfig): SoundInstance` (builds two Howls from generated WAVs; starts muted).
  - `jackpot/theme.ts`: `jackpotWheel: WheelTheme`, `jackpotSound: SoundConfig`, `jackpotCopy: OverlayCopy`, `jackpotOverlayVars: OverlayVars` (the `OverlayVars` type lands in Task 3; for now export the object typed `const`/`as const`).

- [ ] **Step 1: Move + rewrite `kit/Wheel3D.tsx` (themeable)**

```bash
git mv components/r3f/Wheel3D.tsx components/r3f/kit/Wheel3D.tsx
```
Replace the entire contents of `components/r3f/kit/Wheel3D.tsx` with:
```tsx
import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WheelTheme } from "./types";

function wedgeShape(startRad: number, endRad: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(Math.cos(startRad) * radius, Math.sin(startRad) * radius);
  s.absarc(0, 0, radius, startRad, endRad, false);
  s.lineTo(0, 0);
  return s;
}

function makeLabelTexture(labels: string[], color: string): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = size * 0.36, n = labels.length;
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  for (let i = 0; i < n; i++) {
    const clock = i * (360 / n) + 360 / n / 2;
    const a = (-(clock - 90) * Math.PI) / 180;
    const x = cx + Math.cos(a) * r;
    const y = cy - Math.sin(a) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-a + Math.PI / 2);
    ctx.strokeText(labels[i], 0, 0);
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Wheel3D({ rotationRef, theme }: { rotationRef: MutableRefObject<number>; theme: WheelTheme }) {
  const group = useRef<THREE.Group>(null!);
  const n = theme.labels.length;
  const R = theme.radius;
  const labelTex = useMemo(() => makeLabelTexture(theme.labels, theme.labelColor), [theme.labels, theme.labelColor]);
  const goldSet = useMemo(() => new Set(theme.goldIndices), [theme.goldIndices]);

  const wedges = useMemo(
    () => Array.from({ length: n }, (_, i) => {
      const startDeg = 90 - (i + 1) * (360 / n);
      const endDeg = 90 - i * (360 / n);
      const shape = wedgeShape((startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180, R);
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
      });
      return { geom, color: theme.segmentColors[i], jackpot: i === theme.jackpotIndex, gold: goldSet.has(i) };
    }),
    [n, R, theme.segmentColors, theme.jackpotIndex, goldSet]
  );

  const bulbs = useMemo(
    () => Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return [Math.cos(a) * (R + 0.12), Math.sin(a) * (R + 0.12), 0.42] as const;
    }),
    [R]
  );

  useFrame(() => {
    if (group.current) group.current.rotation.z = THREE.MathUtils.degToRad(-rotationRef.current);
  });

  return (
    <group>
      <mesh position={[0, R + 0.35, 0.5]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.16, 0.42, 4]} />
        <meshStandardMaterial color={theme.goldColor} metalness={1} roughness={0.25} emissive="#FFB020" emissiveIntensity={1.5} />
      </mesh>
      <group ref={group}>
        {wedges.map((w, i) => (
          <mesh key={i} geometry={w.geom} castShadow>
            <meshStandardMaterial
              color={w.gold ? theme.goldColor : w.color}
              metalness={w.jackpot ? 0.95 : w.gold ? 0.6 : 0.4}
              roughness={w.gold ? 0.28 : 0.3}
              emissive={w.jackpot ? "#E2483D" : w.gold ? "#8a6200" : "#08221c"}
              emissiveIntensity={w.jackpot ? 1.4 : w.gold ? 1.15 : 0.6}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.41]}>
          <circleGeometry args={[R, 64]} />
          <meshBasicMaterial map={labelTex} transparent />
        </mesh>
        <mesh position={[0, 0, 0.18]}>
          <torusGeometry args={[R + 0.12, 0.16, 16, 96]} />
          <meshStandardMaterial color={theme.rimColor} metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={0.8} />
        </mesh>
        {bulbs.map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color="#FFF6D8" emissive={theme.bulbColor} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 48]} />
          <meshStandardMaterial color={theme.goldColor} metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
```

- [ ] **Step 2: Move + rewrite `kit/sound.ts` (createSound)**

```bash
git mv components/r3f/sound.ts components/r3f/kit/sound.ts
```
Replace the contents of `components/r3f/kit/sound.ts` with (keeps the WAV generator; swaps the singleton `getSound` for a `createSound(config)` factory):
```ts
import { Howl, Howler } from "howler";
import type { SoundConfig, SoundInstance } from "./types";

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
    s = (s / freqs.length) * gain * Math.exp(-3 * (i / n));
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true);
  }
  let bin = "";
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return "data:audio/wav;base64," + btoa(bin);
}

export function createSound(config: SoundConfig): SoundInstance {
  const tick = new Howl({ src: [wavDataUri(config.tick.freqs, config.tick.ms, config.tick.gain)], format: ["wav"] });
  const win = new Howl({ src: [wavDataUri(config.win.freqs, config.win.ms, config.win.gain)], format: ["wav"] });
  Howler.mute(true);
  let muted = true;
  return {
    tick() { if (!muted) tick.play(); },
    win() { if (!muted) win.play(); },
    setMuted(m: boolean) { muted = m; Howler.mute(m); },
    muted() { return muted; },
  };
}
```

- [ ] **Step 3: Create `components/r3f/jackpot/theme.ts`**

```ts
import type { WheelTheme, SoundConfig, OverlayCopy } from "../kit/types";

const LABELS = ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"];

export const jackpotWheel: WheelTheme = {
  labels: LABELS,
  segmentColors: ["#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#E2483D"],
  goldIndices: [1, 3, 5],
  jackpotIndex: 7,
  goldColor: "#FFD24A",
  rimColor: "#F5C24B",
  bulbColor: "#FFD56A",
  labelColor: "#F4F1E8",
  radius: 2.1,
};

export const jackpotSound: SoundConfig = {
  tick: { freqs: [1200], ms: 40, gain: 0.18 },
  win: { freqs: [523, 659, 784], ms: 900, gain: 0.3 },
};

export const jackpotCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "BOOM your luck",
  subBanner: "7 7 7",
  ctaLabel: "SPIN TO WIN",
  spinningLabel: "SPINNING…",
  winTitle: "JACKPOT — You won",
  winPrize: "JACKPOT!",
  claimLabel: "Claim bonus",
  winEmoji: "💰",
};

export const jackpotOverlayVars = {
  gold: "#F5C24B", accent: "#FFD56A", surface: "#15564A",
  text: "#EAF6EE", bannerBg: "#E2483D", bannerBorder: "#F5C24B",
};
```

- [ ] **Step 4: Use the themed wheel + createSound in JackpotVaultScene**

In `components/r3f/JackpotVaultScene.tsx`:
1. Update imports:
   - `import { Wheel3D } from "./Wheel3D";` → `import { Wheel3D } from "./kit/Wheel3D";`
   - replace `import { getSound } from "./sound";` with `import { createSound } from "./kit/sound";`
   - add `import { jackpotWheel, jackpotSound } from "./jackpot/theme";`
2. In `WheelRig`, pass the theme: change `const wheel = <Wheel3D rotationRef={rotationRef} />;` to
   `const wheel = <Wheel3D rotationRef={rotationRef} theme={jackpotWheel} />;`
3. In `JackpotVaultScene`, after `const rotationRef = useRef(0);` add:
   `const sound = useMemo(() => createSound(jackpotSound), []);`
   and replace the three `getSound()` calls: `getSound().tick()` → `sound.tick()`, `getSound().win()` → `sound.win()`, `getSound().setMuted(next)` → `sound.setMuted(next)`.
   (`useMemo` is already imported in this file.)

- [ ] **Step 5: Verify Jackpot unchanged (tests + screenshot)**

Run: `npm test` → 143 green.
Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line` → 2 passed.
Screenshot check (best-effort): start the server (`npm run build && npm run start`), capture the idle scene to `docs/superpowers/stitch-assets/boomzino/jv3d-refactor-check.png`, kill the server by PID. Confirm the wheel still shows bright gold + green segments, JACKPOT red, gold rim/bulbs (i.e., the themed wheel matches the pre-refactor look).

- [ ] **Step 6: Commit**

```bash
git add components/r3f/kit/Wheel3D.tsx components/r3f/kit/sound.ts components/r3f/jackpot/theme.ts components/r3f/JackpotVaultScene.tsx docs/superpowers/stitch-assets/boomzino/jv3d-refactor-check.png
git commit -m "refactor: themeable kit Wheel3D + createSound; Jackpot driven by jackpot/theme"
```

---

### Task 3: Shared SpinScene + SpinOverlay; Jackpot fully on the kit

**Files:**
- Create: `components/r3f/kit/spinScene.tsx`, `components/r3f/kit/SpinOverlay.tsx`, `components/r3f/kit/spinOverlay.module.css`
- Move: `components/r3f/NeonSign.tsx` → `components/r3f/jackpot/NeonSign.tsx`; `components/r3f/JackpotVaultScene.tsx` → `components/r3f/jackpot/JackpotVaultScene.tsx`
- Delete: `components/r3f/JackpotVaultOverlay.tsx`, `components/r3f/jackpotVault.module.css`
- Modify: `app/prototypes/3d/jackpot-vault/page.tsx` (import path), `components/r3f/jackpot/theme.ts` (type the vars)

**Interfaces:**
- Consumes: kit Wheel3D/Effects/CoinStorm/sound/useReducedMotion/spinController (Tasks 1-2), jackpot/theme (Task 2).
- Produces:
  - `kit/spinScene.tsx`: `SpinDriver`, `Parallax`, and `useSpinScene({ reduced, sound }) → { rotationRef, status, muted, modalOpen, controller, onSpin, onStatus, onToggleSound }`.
  - `kit/SpinOverlay.tsx`: `OverlayVars` type + `SpinOverlay({ copy, vars, status, modalOpen, muted, onSpin, onToggleSound, onClaim })` with the three test hooks.

- [ ] **Step 1: Create `components/r3f/kit/spinScene.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createSpinController, type SpinStatus } from "./spinController";
import type { SoundInstance } from "./types";

export function SpinDriver({ controller, rotationRef, onStatus }: {
  controller: ReturnType<typeof createSpinController>;
  rotationRef: MutableRefObject<number>;
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

export function Parallax({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const tilt = useRef({ x: 0, y: 0 });
  const { pointer } = useThree();
  useEffect(() => {
    if (reduced) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      tilt.current.x = THREE.MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1);
      tilt.current.y = THREE.MathUtils.clamp(((e.beta ?? 0) - 45) / 45, -1, 1);
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

export function useSpinScene({ reduced, sound }: { reduced: boolean; sound: SoundInstance }) {
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );
  useEffect(() => {
    if (status !== "won") { setModalOpen(false); return; }
    const t = setTimeout(() => setModalOpen(true), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);

  const onSpin = () => {
    if (controller.status !== "idle") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
  };
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") sound.win();
  };
  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  return { rotationRef, status, muted, modalOpen, controller, onSpin, onStatus, onToggleSound };
}
```

- [ ] **Step 2: Create `components/r3f/kit/spinOverlay.module.css`**

```css
.overlay { position: fixed; inset: 0; pointer-events: none; font-family: system-ui, sans-serif; color: var(--text); }
.overlay [data-pe] { pointer-events: auto; }
.top { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; }
.logo { color: var(--gold); font-weight: 800; letter-spacing: 1px; font-size: 22px; text-shadow: 0 0 16px color-mix(in srgb, var(--gold) 50%, transparent); }
.sound { background: color-mix(in srgb, var(--surface) 70%, transparent); color: var(--text); border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent); border-radius: 999px; padding: 8px 12px; font-size: 16px; cursor: pointer; }
.hero { position: absolute; top: 60px; left: 0; right: 0; text-align: center; }
.hero h1 { margin: 0; font-size: clamp(30px, 6vw, 52px); font-weight: 800; color: var(--gold); text-shadow: 0 0 26px color-mix(in srgb, var(--gold) 50%, transparent); }
.subtitle { margin: 6px 0 0; color: var(--text); opacity: .85; font-size: clamp(14px, 2.5vw, 18px); }
.banner { display: inline-block; margin-top: 8px; padding: 6px 16px; border-radius: 10px; background: var(--bannerBg); color: #F4F1E8; font-weight: 800; letter-spacing: 6px; border: 2px solid var(--bannerBorder); }
.cta { position: absolute; left: 50%; bottom: 42px; transform: translateX(-50%); padding: 16px 40px; border-radius: 999px; border: none; background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 85%, white), var(--gold)); color: #2a1e00; font-weight: 800; font-size: 18px; cursor: pointer; box-shadow: 0 0 30px color-mix(in srgb, var(--gold) 60%, transparent); }
.cta:disabled { opacity: .65; cursor: default; }
.win { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(2,10,6,.40); backdrop-filter: blur(2px); animation: winfade .4s ease both; }
@keyframes winfade { from { opacity: 0; } to { opacity: 1; } }
.win[hidden] { display: none !important; }
.card { width: min(340px, 86vw); text-align: center; padding: 28px; border-radius: 20px; background: var(--surface); border: 1px solid color-mix(in srgb, var(--gold) 50%, transparent); box-shadow: 0 0 50px color-mix(in srgb, var(--gold) 40%, transparent); }
.card h2 { margin: 6px 0; }
.prize { color: var(--gold); font-size: 32px; font-weight: 800; }
.claim { width: 100%; margin-top: 16px; padding: 14px; border: none; border-radius: 12px; background: var(--gold); color: #2a1e00; font-weight: 800; font-size: 16px; cursor: pointer; }
```

- [ ] **Step 3: Create `components/r3f/kit/SpinOverlay.tsx`**

```tsx
import type { CSSProperties } from "react";
import css from "./spinOverlay.module.css";
import type { SpinStatus } from "./spinController";
import type { OverlayCopy } from "./types";

export type OverlayVars = {
  gold: string; accent: string; surface: string; text: string; bannerBg: string; bannerBorder: string;
};

export function SpinOverlay({ copy, vars, status, modalOpen, muted, onSpin, onToggleSound, onClaim }: {
  copy: OverlayCopy;
  vars: OverlayVars;
  status: SpinStatus;
  modalOpen: boolean;
  muted: boolean;
  onSpin: () => void;
  onToggleSound: () => void;
  onClaim: () => void;
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
      <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status !== "idle"}>
        {status === "spinning" ? copy.spinningLabel : copy.ctaLabel}
      </button>
      <div className={css.win} data-testid="win-modal" hidden={!modalOpen}>
        <div className={css.card} data-pe>
          <div style={{ fontSize: 44 }}>{copy.winEmoji}</div>
          <h2>{copy.winTitle}</h2>
          <div className={css.prize}>{copy.winPrize}</div>
          <button className={css.claim} onClick={onClaim}>{copy.claimLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Type the jackpot overlay vars**

In `components/r3f/jackpot/theme.ts`, add the import and annotate:
```ts
import type { OverlayVars } from "../kit/SpinOverlay";
```
and change `export const jackpotOverlayVars = {` to `export const jackpotOverlayVars: OverlayVars = {`.

- [ ] **Step 5: Move NeonSign + JackpotVaultScene into jackpot/ and refactor the scene onto the kit**

```bash
git mv components/r3f/NeonSign.tsx components/r3f/jackpot/NeonSign.tsx
git mv components/r3f/JackpotVaultScene.tsx components/r3f/jackpot/JackpotVaultScene.tsx
git rm components/r3f/JackpotVaultOverlay.tsx components/r3f/jackpotVault.module.css
```
Replace the entire contents of `components/r3f/jackpot/JackpotVaultScene.tsx` with:
```tsx
"use client";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Wheel3D } from "../kit/Wheel3D";
import { Effects } from "../kit/Effects";
import { CoinStorm } from "../kit/CoinStorm";
import { SpinDriver, Parallax, useSpinScene } from "../kit/spinScene";
import { SpinOverlay } from "../kit/SpinOverlay";
import { createSound } from "../kit/sound";
import { useReducedMotion } from "../kit/useReducedMotion";
import { NeonSign } from "./NeonSign";
import { jackpotWheel, jackpotSound, jackpotCopy, jackpotOverlayVars } from "./theme";

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} theme={jackpotWheel} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>;
}

export function JackpotVaultScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(jackpotSound), []);
  const { rotationRef, status, muted, modalOpen, controller, onSpin, onStatus, onToggleSound } = useSpinScene({ reduced, sound });

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
          {status === "won" && (
            <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 60 : 120)} />
          )}
          {!reduced && <Sparkles count={60} scale={[10, 8, 4]} size={3} speed={0.3} color="#FFD56A" />}
        </Parallax>

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>

      <SpinOverlay
        copy={jackpotCopy} vars={jackpotOverlayVars}
        status={status} modalOpen={modalOpen} muted={muted}
        onSpin={onSpin} onToggleSound={onToggleSound} onClaim={() => {}}
      />
    </div>
  );
}
```

- [ ] **Step 6: Update the Jackpot route import path**

In `app/prototypes/3d/jackpot-vault/page.tsx`, change the dynamic import target
`import("@/components/r3f/JackpotVaultScene")` → `import("@/components/r3f/jackpot/JackpotVaultScene")`.

- [ ] **Step 7: Verify Jackpot still identical (tests + screenshot)**

Run: `npm test` → 143 green.
Run: `npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line` → 2 passed.
Screenshot (best-effort): capture the Jackpot win state to `docs/superpowers/stitch-assets/boomzino/jv3d-win.png` (overwrite) and confirm it matches the prior look (logo, BOOM/777, wheel, coin storm, win modal). If it differs, the kit extraction regressed something — fix before committing.

- [ ] **Step 8: Commit**

```bash
# the deletions from `git rm`/moves in Step 5 are already staged
git add components/r3f/kit components/r3f/jackpot app/prototypes/3d/jackpot-vault/page.tsx docs/superpowers/stitch-assets/boomzino/jv3d-win.png
git commit -m "refactor: extract shared SpinScene + SpinOverlay; Jackpot fully on the kit"
```

---

### Task 4: Alchemy theme + scene skeleton + route + smoke

**Files:**
- Create: `components/r3f/alchemy/theme.ts`, `components/r3f/alchemy/AlchemyLabScene.tsx`, `app/prototypes/3d/alchemy-lab/page.tsx`, `tests/e2e/alchemyLab3d.spec.ts`

**Interfaces:**
- Consumes: kit (Wheel3D, Effects, CoinStorm, spinScene, SpinOverlay, sound, useReducedMotion).
- Produces: route `/prototypes/3d/alchemy-lab`; `AlchemyLabScene` (skeleton — themed wheel + coin win, NO cauldron/bottles yet; those land in Task 5).

- [ ] **Step 1: Create `components/r3f/alchemy/theme.ts`**

```ts
import type { WheelTheme, SoundConfig, OverlayCopy } from "../kit/types";
import type { OverlayVars } from "../kit/SpinOverlay";

const LABELS = ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"];

export const alchemyWheel: WheelTheme = {
  labels: LABELS,
  segmentColors: ["#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#E2483D"],
  goldIndices: [1, 3, 5],
  jackpotIndex: 7,
  goldColor: "#FFD24A",
  rimColor: "#5BE36A",
  bulbColor: "#8BFF5A",
  labelColor: "#F4F1E8",
  radius: 2.1,
};

export const alchemySound: SoundConfig = {
  tick: { freqs: [420, 700], ms: 70, gain: 0.16 },        // bubble "blip"
  win: { freqs: [392, 523, 659, 880], ms: 1100, gain: 0.26 }, // magical shimmer
};

export const alchemyCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Spin the Wheel",
  subtitle: "and win bonuses",
  ctaLabel: "SPIN",
  spinningLabel: "BREWING…",
  winTitle: "You won",
  winPrize: "JACKPOT!",
  claimLabel: "Claim bonus",
  winEmoji: "🧪",
};

export const alchemyOverlayVars: OverlayVars = {
  gold: "#F5C24B", accent: "#5BE36A", surface: "#15564A",
  text: "#EAF6EE", bannerBg: "#15564A", bannerBorder: "#5BE36A",
};
```

- [ ] **Step 2: Create `components/r3f/alchemy/AlchemyLabScene.tsx` (skeleton)**

```tsx
"use client";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Wheel3D } from "../kit/Wheel3D";
import { Effects } from "../kit/Effects";
import { CoinStorm } from "../kit/CoinStorm";
import { SpinDriver, Parallax, useSpinScene } from "../kit/spinScene";
import { SpinOverlay } from "../kit/SpinOverlay";
import { createSound } from "../kit/sound";
import { useReducedMotion } from "../kit/useReducedMotion";
import { alchemyWheel, alchemySound, alchemyCopy, alchemyOverlayVars } from "./theme";

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} theme={alchemyWheel} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.12} floatIntensity={0.3}>{wheel}</Float>;
}

export function AlchemyLabScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(alchemySound), []);
  const { rotationRef, status, muted, modalOpen, controller, onSpin, onStatus, onToggleSound } = useSpinScene({ reduced, sound });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0A1A14" }}>
      <Canvas camera={{ position: [0, 0.1, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#0A1A14"]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 6, 6]} intensity={90} color="#EAF6EE" />
        <pointLight position={[-6, -2, 4]} intensity={60} color="#5BE36A" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.5} color="#8BFF5A" position={[4, 5, 4]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={2} color="#F5C24B" position={[-6, 0, 3]} scale={[5, 5, 1]} />
          <Lightformer form="circle" intensity={2} color="#ffffff" position={[0, -4, 4]} scale={[4, 4, 1]} />
        </Environment>

        <SpinDriver controller={controller} rotationRef={rotationRef} onStatus={onStatus} />
        <Parallax reduced={reduced}>
          <WheelRig rotationRef={rotationRef} reduced={reduced} />
          {status === "won" && (
            <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 60 : 120)} />
          )}
          {!reduced && <Sparkles count={60} scale={[11, 8, 5]} size={2.6} speed={0.25} color="#8BFF5A" />}
        </Parallax>

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>

      <SpinOverlay
        copy={alchemyCopy} vars={alchemyOverlayVars}
        status={status} modalOpen={modalOpen} muted={muted}
        onSpin={onSpin} onToggleSound={onToggleSound} onClaim={() => {}}
      />
    </div>
  );
}
```

- [ ] **Step 3: Write the failing smoke test**

Create `tests/e2e/alchemyLab3d.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("3D Alchemy Lab route boots a WebGL canvas", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const resp = await page.goto("/prototypes/3d/alchemy-lab");
  expect(resp?.status()).toBe(200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});

test.describe("spin to win", () => {
  test.use({ reducedMotion: "reduce" });
  test("SPIN reaches the win modal; overlay UI present", async ({ page }) => {
    await page.goto("/prototypes/3d/alchemy-lab");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sound-toggle")).toBeVisible();
    await expect(page.getByTestId("win-modal")).toBeHidden();
    await page.getByTestId("spin-button").click();
    await expect(page.getByTestId("win-modal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("JACKPOT!")).toBeVisible();
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx playwright test tests/e2e/alchemyLab3d.spec.ts --reporter=line`
Expected: FAIL — route 404 (page does not exist yet).

- [ ] **Step 5: Create the route**

Create `app/prototypes/3d/alchemy-lab/page.tsx`:
```tsx
"use client";
import dynamic from "next/dynamic";

const AlchemyLabScene = dynamic(
  () => import("@/components/r3f/alchemy/AlchemyLabScene").then((m) => m.AlchemyLabScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#0A1A14", color: "#8BFF5A", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        BREWING THE LAB…
      </div>
    ),
  }
);

export default function Page() {
  return <AlchemyLabScene />;
}
```

- [ ] **Step 6: Run the smoke to verify it passes**

Run: `npx playwright test tests/e2e/alchemyLab3d.spec.ts --reporter=line`
Expected: 2 passed (route boots; reduced-motion spin reaches the win modal). `/prototypes/*` is already exempt from the host-rewrite middleware (done in the Jackpot work), so the route serves.

- [ ] **Step 7: Commit**

```bash
git add components/r3f/alchemy/theme.ts components/r3f/alchemy/AlchemyLabScene.tsx app/prototypes/3d/alchemy-lab/page.tsx tests/e2e/alchemyLab3d.spec.ts
git commit -m "feat: Alchemy Lab 3D route skeleton (themed wheel + coin win) on the kit"
```

---

### Task 5: Alchemy elements — cauldron, potion bottles, lab backdrop, win eruption

**Files:**
- Create: `components/r3f/alchemy/Cauldron.tsx`, `components/r3f/alchemy/PotionBottle.tsx`, `components/r3f/alchemy/LabBackdrop.tsx`
- Modify: `components/r3f/alchemy/AlchemyLabScene.tsx`

**Interfaces:**
- Produces: `Cauldron({ erupting?: boolean })`, `PotionBottle({ position, color?, phase? })`, `LabBackdrop({ reduced })`.

- [ ] **Step 1: Create `components/r3f/alchemy/Cauldron.tsx`**

```tsx
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Bubbles({ count, radius, rise, color }: { count: number; radius: number; rise: number; color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(
    () => Array.from({ length: count }, () => ({
      a: Math.random() * Math.PI * 2, r: Math.random() * radius, y: Math.random() * rise,
      speed: 0.4 + Math.random() * 0.7, s: 0.03 + Math.random() * 0.06,
    })),
    [count, radius, rise]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Pass a concrete geometry + material to args (TS-safe; avoids `undefined` args).
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 1.4, transparent: true, opacity: 0.8,
    });
    m.toneMapped = false;
    return m;
  }, [color]);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      b.y += b.speed * dt;
      if (b.y > rise) { b.y = 0; b.a = Math.random() * Math.PI * 2; b.r = Math.random() * radius; }
      const fade = 1 - b.y / rise;
      dummy.position.set(Math.cos(b.a) * b.r, b.y, Math.sin(b.a) * b.r);
      dummy.scale.setScalar(b.s * (0.4 + fade));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, count]} />;
}

export function Cauldron({ erupting = false }: { erupting?: boolean }) {
  const liquid = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!liquid.current) return;
    const m = liquid.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 1.1 + Math.sin(state.clock.elapsedTime * 4) * 0.25 + (erupting ? 1.4 : 0);
  });
  return (
    <group position={[0, -2.4, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[1.25, 0.95, 0.9, 32, 1, true]} />
        <meshStandardMaterial color="#0d2a22" metalness={0.7} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <sphereGeometry args={[0.95, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#0d2a22" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.1, 12, 40]} />
        <meshStandardMaterial color="#1b6f5c" metalness={0.9} roughness={0.3} emissive="#0a3a2c" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={liquid} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.15, 40]} />
        <meshStandardMaterial color="#1f7a3a" emissive="#5BE36A" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} intensity={erupting ? 80 : 24} distance={7} color="#5BE36A" />
      <group position={[0, 0.25, 0]}>
        <Bubbles count={erupting ? 90 : 42} radius={1.0} rise={erupting ? 3.4 : 1.7} color="#8BFF5A" />
      </group>
    </group>
  );
}
```

- [ ] **Step 2: Create `components/r3f/alchemy/PotionBottle.tsx`**

```tsx
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function PotionBottle({ position, color = "#8BFF5A", phase = 0 }: {
  position: [number, number, number]; color?: string; phase?: number;
}) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (g.current) g.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.2 + phase) * 0.08;
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color="#bfeede" metalness={0.1} roughness={0.1} transparent opacity={0.35} />
      </mesh>
      <mesh scale={[0.92, 0.7, 0.92]} position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.4, 16]} />
        <meshStandardMaterial color="#bfeede" metalness={0.1} roughness={0.1} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.12, 12]} />
        <meshStandardMaterial color="#7a5230" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 0, 0.3]} intensity={10} distance={2.6} color={color} />
    </group>
  );
}
```

- [ ] **Step 3: Create `components/r3f/alchemy/LabBackdrop.tsx`**

```tsx
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

function Beaker({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 16, 1, true]} />
        <meshStandardMaterial color="#bfeede" metalness={0.1} roughness={0.1} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.22, 16]} />
        <meshStandardMaterial color="#5BE36A" emissive="#5BE36A" emissiveIntensity={1} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

export function LabBackdrop({ reduced }: { reduced: boolean }) {
  return (
    <group>
      {!reduced && (
        <>
          <Float speed={1.5} floatIntensity={0.6} rotationIntensity={0.3}><Beaker position={[-3.6, 1.2, -2]} scale={1.1} /></Float>
          <Float speed={1.2} floatIntensity={0.5} rotationIntensity={0.2}><Beaker position={[3.7, 1.6, -2.2]} scale={0.9} /></Float>
          <Float speed={1.8} floatIntensity={0.7} rotationIntensity={0.4}><Beaker position={[3.2, -1.4, -1.6]} scale={0.8} /></Float>
        </>
      )}
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[26, 16]} />
        <meshBasicMaterial color="#0a3a2c" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 4: Wire the elements into `AlchemyLabScene.tsx`**

In `components/r3f/alchemy/AlchemyLabScene.tsx`:
1. Add imports after the theme import:
   ```tsx
   import { Cauldron } from "./Cauldron";
   import { PotionBottle } from "./PotionBottle";
   import { LabBackdrop } from "./LabBackdrop";
   ```
2. In `AlchemyLabScene`, add `const won = status === "won";` after the `useSpinScene(...)` line.
3. Replace the `<Parallax reduced={reduced}> … </Parallax>` block with:
   ```tsx
        <Parallax reduced={reduced}>
          <LabBackdrop reduced={reduced} />
          <PotionBottle position={[-2.9, -0.6, 0.6]} phase={0} />
          <PotionBottle position={[2.9, -0.6, 0.6]} phase={1.5} />
          <WheelRig rotationRef={rotationRef} reduced={reduced} />
          <Cauldron erupting={won} />
          {won && (
            <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 60 : 120)} />
          )}
          {!reduced && <Sparkles count={60} scale={[11, 8, 5]} size={2.6} speed={0.25} color="#8BFF5A" />}
        </Parallax>
   ```

- [ ] **Step 5: Verify the smoke still passes**

Run: `npx playwright test tests/e2e/alchemyLab3d.spec.ts --reporter=line`
Expected: 2 passed (the scene now has the cauldron/bottles/backdrop; win still resolves; no pageerror — the instanced `Bubbles` and physics coins are inside the scene). If a `pageerror` from the InstancedMesh appears, confirm the `args={[undefined, undefined, count]}` pattern and that the geometry/material are children (R3F attaches them).

- [ ] **Step 6: Capture screenshots (idle + win)**

Best-effort, using the reusable screenshot snippet in "Notes for the executor" (start the server, capture, kill by PID):
- idle → PATH `prototypes/3d/alchemy-lab`, OUT `docs/superpowers/stitch-assets/boomzino/alchemy3d-scene.png`
- win → same PATH with the WIN variant (click spin + wait ~6.5s), OUT `docs/superpowers/stitch-assets/boomzino/alchemy3d-win.png`

These are the visual gate: confirm the emerald wheel sits above a glowing bubbling cauldron, the two potion bottles flank it, beakers float in a green haze, and on win the cauldron erupts (brighter glow + more bubbles) with the gold coin storm.

- [ ] **Step 7: Commit**

```bash
git add components/r3f/alchemy app/prototypes/3d/alchemy-lab docs/superpowers/stitch-assets/boomzino/alchemy3d-scene.png docs/superpowers/stitch-assets/boomzino/alchemy3d-win.png
git commit -m "feat: Alchemy Lab cauldron + potion bottles + lab backdrop + win eruption"
```

---

### Task 6: Retire the Alchemy static HTML + point the gallery at the 3D route

**Files:**
- Delete: `public/prototypes/boomzino-alchemy-lab.html`
- Modify: `public/prototypes/index.html`, `tests/e2e/prototypes.spec.ts`

- [ ] **Step 1: Update the gallery link**

In `public/prototypes/index.html`, change the Alchemy card's `href="./boomzino-alchemy-lab.html"` to `href="/prototypes/3d/alchemy-lab"` and update its sub-text to `Real-time 3D · cauldron · physics · sound`.

- [ ] **Step 2: Remove the obsolete static Alchemy tests**

In `tests/e2e/prototypes.spec.ts`, delete the `test("Alchemy Lab loads standalone, …")` test and the `test.describe("reduced motion", …)` block that targets the static Alchemy HTML. Keep the `test("prototype gallery lists both Boomzino mockups", …)`. Leave the import line. (The gallery test asserts the two card links exist by name; the names — "The Alchemy Lab" / "Jackpot Boom Vault" — are unchanged.)

- [ ] **Step 3: Delete the static Alchemy page**

Run: `git rm public/prototypes/boomzino-alchemy-lab.html`

- [ ] **Step 4: Verify the full suite is green**

Run:
```bash
npx vitest run                                                   # unit incl. kit spinMath/spinController
npx playwright test tests/e2e/prototypes.spec.ts --reporter=line # gallery (1 test)
npx playwright test tests/e2e/jackpotVault3d.spec.ts --reporter=line  # 2 tests
npx playwright test tests/e2e/alchemyLab3d.spec.ts --reporter=line    # 2 tests
```
Expected: all PASS. Both gallery cards now point to 3D routes; the static landing HTML is fully retired.

- [ ] **Step 5: Commit**

```bash
git add public/prototypes/index.html tests/e2e/prototypes.spec.ts
git rm public/prototypes/boomzino-alchemy-lab.html
git commit -m "chore: retire static Alchemy mockup; gallery points to 3D route"
```

---

## Notes for the executor

- **The refactor must keep Jackpot green at every task.** Tasks 1-3 each end by running the Jackpot Playwright smoke (and Task 2/3 also screenshot it). If the Jackpot route visibly changes or a test fails, the kit extraction regressed — fix before committing, don't push past it.
- **First Playwright run per task rebuilds** with three.js bundled (~1-2 min); the runner reuses a running server (non-CI). Scope runs to the prototype spec files; never the DB-backed `landing.spec.ts`/`admin.spec.ts`.
- **WebGL warnings** (SwiftShader, THREE.Clock deprecation, Rapier "deprecated parameters") are console *warnings*, not errors; the smokes assert `pageerror` is empty — keep them that way.
- **Screenshots** need a separately-running server; kill the server you launch by PID (never a broad `pkill`). Reusable snippet — start `npm run build && npm run start`, wait until `http://localhost:3000` responds, then:
  ```bash
  # IDLE: replace PATH (e.g. prototypes/3d/alchemy-lab) and OUT
  node -e "const {chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1000,height:760}});await p.goto('http://localhost:3000/PATH');await p.getByTestId('spin-button').waitFor({state:'visible',timeout:20000});await p.waitForTimeout(1500);await p.screenshot({path:'OUT.png'});await b.close();})();"
  # WIN: same, but before the screenshot add: await p.getByTestId('spin-button').click(); await p.waitForTimeout(6500);
  ```
  Then kill the server (`kill %1` / the `next start` PID).
- **Visual quality is judged from the screenshot checkpoints** (Tasks 2/3 for Jackpot parity; Task 5 for Alchemy). Tune emissive/glow/positions if a checkpoint looks off, keeping the kit interfaces + test hooks intact.
- `createSound` calls `Howler.mute()` globally; only one route is active at a time, so the per-scene instances don't conflict. Keep sound muted by default.
- Do not change `components/r3f/kit/spinMath.ts` / `spinController.ts` behavior — their unit tests must keep passing unchanged.
