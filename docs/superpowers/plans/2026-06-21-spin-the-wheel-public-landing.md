# Spin-the-Wheel — Plan 1: Foundation + Public Landing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js foundation and the public, Boomzino-styled "Spin the Wheel" landing page — served by hostname from the database — with the scripted "guaranteed win on the Nth spin" mechanic working end-to-end and covered by tests.

**Architecture:** A single Next.js (App Router) app. `middleware.ts` rewrites any non-admin hostname to `app/[domain]/page.tsx`, which server-renders one landing from Postgres (via Prisma). The wheel and spin logic live in pure, unit-tested modules (`lib/spin.ts`, `lib/redirect.ts`, `lib/theme.ts`) consumed by a client component. Per-landing colors are injected as inline CSS variables.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6 + PostgreSQL, Vitest + Testing Library (unit/component), Playwright (E2E), `next/font` (Outfit).

**Scope note:** This is Plan 1 of 3. Plan 2 = CMS/admin (auth, CRUD, editors, uploads, preview). Plan 3 = multi-domain attach via the Vercel Domains API. This plan delivers a working landing driven by seed data; the CMS in Plan 2 will write the same tables this plan reads.

## Global Constraints

- **Node** ≥ 20 (dev env is v22). **Package manager:** npm.
- **TypeScript strict mode** on. No `any` in committed code except where a third-party type is genuinely missing (comment why).
- **Next.js App Router** only (no `pages/`). React Server Components by default; mark interactive files `'use client'`.
- **Database provider:** PostgreSQL via Prisma. `DATABASE_URL` from env; never hardcode credentials.
- **Brand (Boomzino):** extremely dark-green background, slightly-brighter green accent buttons, casino-gold prize accents, minimalist/clean. Default theme tokens: `bg #0A1410`, `surface #13251A`, `accent #27C24C`, `gold #F5C24B`, `text #EAF6EE`, `muted #7FA88E`.
- **Spin mechanic:** scripted. Win is guaranteed on spin number `spinsBeforeWin` (N). Earlier spins land on a **near-miss** wedge adjacent to the winning wedge. Journey is **replayable** — spin counter is in-memory only (no cookies/persistence).
- **Wheel orientation:** pointer fixed at top (12 o'clock); segment `i`'s center sits at `i * (360/K)` degrees clockwise from top in the wheel's own frame.
- **TDD:** write the failing test first for every logic/component task. **Commit after every task.**
- **Test commands:** unit/component `npm test`; E2E `npm run e2e`.

---

## File Structure

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, playwright.config.ts
.env.example
app/
  layout.tsx                      # root layout, Outfit font, base html
  globals.css                     # Boomzino theme (CSS variables) + layout
  [domain]/
    page.tsx                      # SSR landing by host; injects theme vars
    not-found.tsx                 # unknown/unpublished host
    Wheel.client.tsx              # interactive wheel (client component)
    useSpinController.ts          # spin state hook
middleware.ts                     # host -> rewrite to /[domain] / passthrough admin+api
lib/
  types.ts                        # shared types
  spin.ts                         # planSpin + rotationForIndex (pure)
  redirect.ts                     # buildRedirectUrl (pure)
  theme.ts                        # themeToCssVars (pure)
  hostRoute.ts                    # decideHostRoute (pure, used by middleware)
  tenant.ts                       # toLandingView (pure) + getLandingByHost (prisma)
  db.ts                           # Prisma client singleton
components/
  wheel/WheelSvg.tsx              # presentational SVG wheel
  wheel/Pointer.tsx               # gold pointer
  wheel/WinModal.tsx              # win popup
prisma/
  schema.prisma
  seed.ts                         # Boomzino demo landing + 8 prizes + localhost domain
tests/
  e2e/landing.spec.ts             # Playwright
  unit/*.test.ts(x)               # Vitest (colocated under lib/components where simpler)
```

---

## Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `vitest.setup.ts`
- Create: `app/layout.tsx`, `app/globals.css` (minimal placeholder, fully styled in Task 12)
- Test: `lib/smoke.test.ts`

**Interfaces:**
- Produces: a booting Next app; `npm test` (Vitest) and `npm run e2e` (Playwright) wired; path alias `@/*` → repo root.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "spin-the-wheel",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@prisma/client": "6.1.0"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "@types/node": "22.10.2",
    "@types/react": "19.0.2",
    "@types/react-dom": "19.0.2",
    "prisma": "6.1.0",
    "tsx": "4.19.2",
    "vitest": "2.1.8",
    "@vitejs/plugin-react": "4.3.4",
    "jsdom": "25.0.1",
    "@testing-library/react": "16.1.0",
    "@testing-library/dom": "10.4.0",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/user-event": "14.5.2",
    "@playwright/test": "1.49.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create config files**

`next.config.ts`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
export default nextConfig;
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
});
```

`.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spinwheel?schema=public"
ADMIN_HOST="admin.localhost:3000"
```

- [ ] **Step 4: Create root layout and placeholder global stylesheet**

`app/globals.css` (placeholder — replaced in Task 12):
```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
```

`app/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Write the smoke test** — `lib/smoke.test.ts`

```ts
import { describe, it, expect } from "vitest";

describe("toolchain smoke test", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Install deps and run the smoke test**

Run:
```bash
npm install
npx playwright install --with-deps chromium
npm test
```
Expected: Vitest reports `1 passed` for `lib/smoke.test.ts`.

- [ ] **Step 7: Verify the app boots**

Run: `npm run build`
Expected: build succeeds (no routes yet besides layout is fine; if Next errors on "no pages", proceed — Task 11 adds the route. If build fails for missing page, skip this check until Task 11.)

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and Playwright"
```

---

## Task 2: Spin engine (pure)

**Files:**
- Create: `lib/types.ts`, `lib/spin.ts`
- Test: `lib/spin.test.ts`

**Interfaces:**
- Produces:
  - `type SpinConfig = { segmentCount: number; spinsBeforeWin: number; winningIndex: number; behavior: "near-miss" }`
  - `type SpinPlan = { targetIndex: number; isWin: boolean }`
  - `planSpin(spinNumber: number, config: SpinConfig): SpinPlan` — `spinNumber` is 1-based.
  - `rotationForIndex(targetIndex: number, segmentCount: number, accumulatedRotation: number, minTurns?: number): number` — returns absolute (always-increasing) degrees to land `targetIndex` centered under the top pointer.

- [ ] **Step 1: Create shared types** — `lib/types.ts`

```ts
export type ThemeColors = {
  bg: string;
  surface: string;
  accent: string;
  gold: string;
  text: string;
  muted: string;
};

export type WheelSegment = {
  id: string;
  order: number;
  label: string;
  icon: string;
  color: string;
};

export type SpinConfig = {
  segmentCount: number;
  spinsBeforeWin: number;
  winningIndex: number;
  behavior: "near-miss";
};
```

- [ ] **Step 2: Write the failing tests** — `lib/spin.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { planSpin, rotationForIndex } from "@/lib/spin";
import type { SpinConfig } from "@/lib/types";

const cfg: SpinConfig = { segmentCount: 8, spinsBeforeWin: 3, winningIndex: 4, behavior: "near-miss" };

describe("planSpin", () => {
  it("returns a near-miss adjacent wedge before the winning spin", () => {
    expect(planSpin(1, cfg)).toEqual({ targetIndex: 3, isWin: false }); // offset -1
    expect(planSpin(2, cfg)).toEqual({ targetIndex: 5, isWin: false }); // offset +1
  });

  it("wins exactly on the Nth spin", () => {
    expect(planSpin(3, cfg)).toEqual({ targetIndex: 4, isWin: true });
  });

  it("wins on the first spin when spinsBeforeWin is 1", () => {
    const c: SpinConfig = { ...cfg, spinsBeforeWin: 1, winningIndex: 2 };
    expect(planSpin(1, c)).toEqual({ targetIndex: 2, isWin: true });
  });

  it("wraps the near-miss index around the wheel", () => {
    const c: SpinConfig = { ...cfg, winningIndex: 0 };
    expect(planSpin(1, c).targetIndex).toBe(7); // (0 - 1 + 8) % 8
  });
});

describe("rotationForIndex", () => {
  it("lands index 0 with at least minTurns full rotations", () => {
    expect(rotationForIndex(0, 8, 0)).toBe(1800); // 5*360 + 0
  });

  it("lands index 2 centered under the pointer", () => {
    const r = rotationForIndex(2, 8, 0); // segAngle 45 -> targetMod 270
    expect(r).toBe(2070); // 1800 + 270
    expect(r % 360).toBe((360 - (2 * 45)) % 360);
  });

  it("always advances forward across successive spins", () => {
    const r1 = rotationForIndex(2, 8, 0);
    const r2 = rotationForIndex(0, 8, r1);
    expect(r2).toBeGreaterThan(r1);
    expect(r2 % 360).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- lib/spin.test.ts`
Expected: FAIL — `planSpin`/`rotationForIndex` not exported.

- [ ] **Step 4: Implement** — `lib/spin.ts`

```ts
import type { SpinConfig } from "./types";

export type SpinPlan = { targetIndex: number; isWin: boolean };

export function planSpin(spinNumber: number, config: SpinConfig): SpinPlan {
  const { spinsBeforeWin, winningIndex, segmentCount } = config;
  if (spinNumber >= spinsBeforeWin) {
    return { targetIndex: winningIndex, isWin: true };
  }
  const offset = spinNumber % 2 === 1 ? -1 : 1;
  const targetIndex = ((winningIndex + offset) % segmentCount + segmentCount) % segmentCount;
  return { targetIndex, isWin: false };
}

export function rotationForIndex(
  targetIndex: number,
  segmentCount: number,
  accumulatedRotation: number,
  minTurns = 5,
): number {
  const segAngle = 360 / segmentCount;
  const targetMod = (((-(targetIndex * segAngle)) % 360) + 360) % 360;
  const currentMod = ((accumulatedRotation % 360) + 360) % 360;
  const advance = (((targetMod - currentMod) % 360) + 360) % 360;
  return accumulatedRotation + minTurns * 360 + advance;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- lib/spin.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/spin.ts lib/spin.test.ts
git commit -m "feat: scripted spin engine (planSpin, rotationForIndex)"
```

---

## Task 3: Theme → CSS variables (pure)

**Files:**
- Create: `lib/theme.ts`
- Test: `lib/theme.test.ts`

**Interfaces:**
- Consumes: `ThemeColors` from `lib/types.ts`.
- Produces: `themeToCssVars(theme: ThemeColors): Record<string, string>` returning the six `--bg/--surface/--accent/--gold/--text/--muted` custom properties.

- [ ] **Step 1: Write the failing test** — `lib/theme.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { themeToCssVars } from "@/lib/theme";
import type { ThemeColors } from "@/lib/types";

const theme: ThemeColors = {
  bg: "#0A1410", surface: "#13251A", accent: "#27C24C",
  gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E",
};

describe("themeToCssVars", () => {
  it("maps every theme color to its CSS variable", () => {
    expect(themeToCssVars(theme)).toEqual({
      "--bg": "#0A1410", "--surface": "#13251A", "--accent": "#27C24C",
      "--gold": "#F5C24B", "--text": "#EAF6EE", "--muted": "#7FA88E",
    });
  });

  it("returns exactly six variables", () => {
    expect(Object.keys(themeToCssVars(theme))).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/theme.test.ts`
Expected: FAIL — `themeToCssVars` not defined.

- [ ] **Step 3: Implement** — `lib/theme.ts`

```ts
import type { ThemeColors } from "./types";

export function themeToCssVars(theme: ThemeColors): Record<string, string> {
  return {
    "--bg": theme.bg,
    "--surface": theme.surface,
    "--accent": theme.accent,
    "--gold": theme.gold,
    "--text": theme.text,
    "--muted": theme.muted,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/theme.ts lib/theme.test.ts
git commit -m "feat: theme-to-CSS-variables mapping"
```

---

## Task 4: Redirect URL builder (pure)

**Files:**
- Create: `lib/redirect.ts`
- Test: `lib/redirect.test.ts`

**Interfaces:**
- Produces: `buildRedirectUrl(redirectUrl: string, prizeParam: string | null, prizeLabel: string): string` — appends `?<prizeParam>=<encoded prizeLabel>` (or `&` if the URL already has a query) when `prizeParam` is set; otherwise returns `redirectUrl` unchanged.

- [ ] **Step 1: Write the failing test** — `lib/redirect.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildRedirectUrl } from "@/lib/redirect";

describe("buildRedirectUrl", () => {
  it("returns the url unchanged when no prize param is configured", () => {
    expect(buildRedirectUrl("https://casino.com/signup", null, "100 Free Spins"))
      .toBe("https://casino.com/signup");
  });

  it("appends the encoded prize as a query param", () => {
    expect(buildRedirectUrl("https://casino.com/signup", "bonus", "100 Free Spins"))
      .toBe("https://casino.com/signup?bonus=100+Free+Spins");
  });

  it("uses & when the url already has a query string", () => {
    expect(buildRedirectUrl("https://casino.com/signup?ref=promo1", "bonus", "€20"))
      .toBe("https://casino.com/signup?ref=promo1&bonus=%E2%82%AC20");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/redirect.test.ts`
Expected: FAIL — `buildRedirectUrl` not defined.

- [ ] **Step 3: Implement** — `lib/redirect.ts`

```ts
export function buildRedirectUrl(
  redirectUrl: string,
  prizeParam: string | null,
  prizeLabel: string,
): string {
  if (!prizeParam) return redirectUrl;
  const sep = redirectUrl.includes("?") ? "&" : "?";
  const value = encodeURIComponent(prizeLabel).replace(/%20/g, "+");
  return `${redirectUrl}${sep}${prizeParam}=${value}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/redirect.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/redirect.ts lib/redirect.test.ts
git commit -m "feat: redirect URL builder with optional prize param"
```

---

## Task 5: Prisma schema, client, and seed

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `prisma/seed.ts`, `prisma/seedData.ts`
- Test: `prisma/seedData.test.ts`

**Interfaces:**
- Produces:
  - Prisma models `Landing`, `Prize`, `Domain`, `Admin`.
  - `prisma` (singleton `PrismaClient`) from `lib/db.ts`.
  - `boomzinoSeed` from `prisma/seedData.ts` — a plain object describing the demo landing, its 8 prizes (ordered), the winning prize order index, and the `localhost:3000` domain. Used by both the seed script and its test.

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Landing {
  id                 String   @id @default(cuid())
  slug               String   @unique
  name               String
  status             String   @default("draft") // draft | published

  heading            String
  subtitle           String
  backLabel          String   @default("Back")
  winTitle           String   @default("You won {prize}!")
  claimLabel         String   @default("Claim")
  almostText         String   @default("Almost! Spin again")

  theme              Json
  logoUrl            String?
  faviconUrl         String?
  coinImageUrl       String?
  bgImageUrl         String?

  spinsBeforeWin     Int      @default(3)
  preWinBehavior     String   @default("near-miss")
  redirectUrl        String
  redirectPrizeParam String?

  metaTitle          String?
  metaDescription    String?

  winningPrizeId     String?  @unique
  winningPrize       Prize?   @relation("WinningPrize", fields: [winningPrizeId], references: [id])
  prizes             Prize[]  @relation("LandingPrizes")
  domains            Domain[]

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Prize {
  id           String   @id @default(cuid())
  landingId    String
  landing      Landing  @relation("LandingPrizes", fields: [landingId], references: [id], onDelete: Cascade)
  order        Int
  label        String
  icon         String   @default("")
  color        String
  weight       Int      @default(1)
  wonByLanding Landing? @relation("WinningPrize")
}

model Domain {
  id           String   @id @default(cuid())
  landingId    String
  landing      Landing  @relation(fields: [landingId], references: [id], onDelete: Cascade)
  hostname     String   @unique
  verified     Boolean  @default(false)
  vercelStatus String?
  createdAt    DateTime @default(now())
}

model Admin {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
}
```

- [ ] **Step 2: Create the Prisma client singleton** — `lib/db.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Create the seed data** — `prisma/seedData.ts`

```ts
import type { ThemeColors } from "@/lib/types";

export type SeedPrize = { order: number; label: string; icon: string; color: string; weight: number };

export const boomzinoTheme: ThemeColors = {
  bg: "#0A1410",
  surface: "#13251A",
  accent: "#27C24C",
  gold: "#F5C24B",
  text: "#EAF6EE",
  muted: "#7FA88E",
};

export const boomzinoSeed = {
  slug: "boomzino-demo",
  name: "Boomzino Demo",
  status: "published" as const,
  heading: "Spin the Wheel",
  subtitle: "and win bonuses",
  backLabel: "Back",
  winTitle: "You won {prize}!",
  claimLabel: "Claim bonus",
  almostText: "Almost! Spin again",
  theme: boomzinoTheme,
  spinsBeforeWin: 3,
  preWinBehavior: "near-miss" as const,
  redirectUrl: "https://boomzino.example/signup",
  redirectPrizeParam: "bonus",
  hostname: "localhost:3000",
  winningOrder: 7, // JACKPOT
  prizes: [
    { order: 0, label: "€5",       icon: "💶", color: "#1E7A3A", weight: 30 },
    { order: 1, label: "50 FS",    icon: "🎰", color: "#2BA552", weight: 25 },
    { order: 2, label: "€10",      icon: "💶", color: "#1E7A3A", weight: 20 },
    { order: 3, label: "100 FS",   icon: "🎰", color: "#2BA552", weight: 12 },
    { order: 4, label: "€20",      icon: "💶", color: "#1E7A3A", weight: 8 },
    { order: 5, label: "200 FS",   icon: "🎰", color: "#2BA552", weight: 3 },
    { order: 6, label: "50% Bonus",icon: "🔥", color: "#1E7A3A", weight: 1 },
    { order: 7, label: "JACKPOT",  icon: "👑", color: "#F5C24B", weight: 1 },
  ] satisfies SeedPrize[],
};
```

- [ ] **Step 4: Write the failing test** — `prisma/seedData.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { boomzinoSeed } from "@/prisma/seedData";

describe("boomzinoSeed", () => {
  it("has eight prizes with unique, contiguous order 0..7", () => {
    const orders = boomzinoSeed.prizes.map((p) => p.order).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("points winningOrder at an existing prize", () => {
    const winner = boomzinoSeed.prizes.find((p) => p.order === boomzinoSeed.winningOrder);
    expect(winner?.label).toBe("JACKPOT");
  });

  it("is published and has a redirect URL", () => {
    expect(boomzinoSeed.status).toBe("published");
    expect(boomzinoSeed.redirectUrl).toMatch(/^https?:\/\//);
  });
});
```

- [ ] **Step 5: Run test to verify it fails, then passes**

Run: `npm test -- prisma/seedData.test.ts`
Expected: FAIL first (module missing), then after Step 3 exists, PASS. (If you authored Step 3 before running, it should PASS directly — that is fine for a pure-data module.)

- [ ] **Step 6: Create the seed script** — `prisma/seed.ts`

```ts
import { PrismaClient } from "@prisma/client";
import { boomzinoSeed } from "./seedData";

const prisma = new PrismaClient();

async function main() {
  const { prizes, winningOrder, hostname, theme, ...landingFields } = boomzinoSeed;

  await prisma.domain.deleteMany({ where: { hostname } });
  await prisma.landing.deleteMany({ where: { slug: landingFields.slug } });

  const landing = await prisma.landing.create({
    data: {
      ...landingFields,
      theme,
      prizes: { create: prizes },
      domains: { create: { hostname, verified: true } },
    },
    include: { prizes: true },
  });

  const winner = landing.prizes.find((p) => p.order === winningOrder)!;
  await prisma.landing.update({
    where: { id: landing.id },
    data: { winningPrizeId: winner.id },
  });

  console.log(`Seeded landing "${landing.slug}" on ${hostname}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 7: Generate the client and apply the schema**

> Requires a running PostgreSQL and `DATABASE_URL` set (copy `.env.example` to `.env`). For local dev you can start one with Docker:
> `docker run --name spinwheel-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=spinwheel -p 5432:5432 -d postgres:16`

Run:
```bash
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
```
Expected: `prisma generate` succeeds, `db push` creates tables, seed prints `Seeded landing "boomzino-demo" on localhost:3000`.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma lib/db.ts prisma/seed.ts prisma/seedData.ts prisma/seedData.test.ts
git commit -m "feat: prisma schema, client singleton, and Boomzino seed"
```

---

## Task 6: Tenant resolution

**Files:**
- Create: `lib/tenant.ts`
- Test: `lib/tenant.test.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/db.ts`; types from `lib/types.ts`.
- Produces:
  - `type LandingView` (the render-ready shape) — see code below.
  - `toLandingView(landing): LandingView` — pure mapper from a Prisma landing (with `prizes` + `winningPrize`) to `LandingView`.
  - `getLandingByHost(host: string): Promise<LandingView | null>` — looks up the domain (lowercased host), returns `null` if missing, unpublished, or missing a winning prize.

- [ ] **Step 1: Extend shared types** — append to `lib/types.ts`

```ts
export type LandingTexts = {
  heading: string;
  subtitle: string;
  backLabel: string;
  winTitle: string;
  claimLabel: string;
  almostText: string;
};

export type LandingAssets = {
  logoUrl: string | null;
  faviconUrl: string | null;
  coinImageUrl: string | null;
  bgImageUrl: string | null;
};

export type LandingView = {
  slug: string;
  texts: LandingTexts;
  theme: ThemeColors;
  assets: LandingAssets;
  segments: WheelSegment[];
  spin: SpinConfig;
  redirectUrl: string;
  redirectPrizeParam: string | null;
  winningPrizeLabel: string;
  metaTitle: string;
  metaDescription: string;
};
```

- [ ] **Step 2: Write the failing test** — `lib/tenant.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { domain: { findUnique } } }));

import { toLandingView, getLandingByHost } from "@/lib/tenant";

function fakeLanding(overrides: Record<string, unknown> = {}) {
  const prizes = [
    { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A", weight: 1 },
    { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
  ];
  return {
    slug: "demo",
    status: "published",
    heading: "Spin the Wheel",
    subtitle: "and win bonuses",
    backLabel: "Back",
    winTitle: "You won {prize}!",
    claimLabel: "Claim",
    almostText: "Almost! Spin again",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3,
    redirectUrl: "https://casino.example/signup",
    redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null,
    winningPrizeId: "p1",
    winningPrize: prizes[1],
    prizes,
    ...overrides,
  };
}

beforeEach(() => findUnique.mockReset());

describe("toLandingView", () => {
  it("maps prizes to segments and computes the winning index", () => {
    const view = toLandingView(fakeLanding() as never);
    expect(view.segments.map((s) => s.label)).toEqual(["€5", "JACKPOT"]);
    expect(view.spin).toEqual({ segmentCount: 2, spinsBeforeWin: 3, winningIndex: 1, behavior: "near-miss" });
    expect(view.winningPrizeLabel).toBe("JACKPOT");
    expect(view.metaTitle).toBe("Spin the Wheel"); // falls back to heading
  });
});

describe("getLandingByHost", () => {
  it("lowercases the host and returns the mapped view when published", async () => {
    findUnique.mockResolvedValue({ landing: fakeLanding() });
    const view = await getLandingByHost("LOCALHOST:3000");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { hostname: "localhost:3000" } }));
    expect(view?.slug).toBe("demo");
  });

  it("returns null for an unknown host", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getLandingByHost("nope.com")).toBeNull();
  });

  it("returns null for an unpublished landing", async () => {
    findUnique.mockResolvedValue({ landing: fakeLanding({ status: "draft" }) });
    expect(await getLandingByHost("draft.com")).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- lib/tenant.test.ts`
Expected: FAIL — `toLandingView`/`getLandingByHost` not defined.

- [ ] **Step 4: Implement** — `lib/tenant.ts`

```ts
import { prisma } from "./db";
import type { LandingView, ThemeColors, WheelSegment } from "./types";

type PrizeRow = { id: string; order: number; label: string; icon: string; color: string; weight: number };
type LandingRow = {
  slug: string; status: string;
  heading: string; subtitle: string; backLabel: string; winTitle: string; claimLabel: string; almostText: string;
  theme: ThemeColors;
  logoUrl: string | null; faviconUrl: string | null; coinImageUrl: string | null; bgImageUrl: string | null;
  spinsBeforeWin: number; redirectUrl: string; redirectPrizeParam: string | null;
  metaTitle: string | null; metaDescription: string | null;
  winningPrizeId: string | null;
  winningPrize: PrizeRow | null;
  prizes: PrizeRow[];
};

export function toLandingView(landing: LandingRow): LandingView {
  const segments: WheelSegment[] = [...landing.prizes]
    .sort((a, b) => a.order - b.order)
    .map((p) => ({ id: p.id, order: p.order, label: p.label, icon: p.icon, color: p.color }));
  const winningIndex = segments.findIndex((s) => s.id === landing.winningPrizeId);
  return {
    slug: landing.slug,
    texts: {
      heading: landing.heading, subtitle: landing.subtitle, backLabel: landing.backLabel,
      winTitle: landing.winTitle, claimLabel: landing.claimLabel, almostText: landing.almostText,
    },
    theme: landing.theme,
    assets: {
      logoUrl: landing.logoUrl, faviconUrl: landing.faviconUrl,
      coinImageUrl: landing.coinImageUrl, bgImageUrl: landing.bgImageUrl,
    },
    segments,
    spin: { segmentCount: segments.length, spinsBeforeWin: landing.spinsBeforeWin, winningIndex, behavior: "near-miss" },
    redirectUrl: landing.redirectUrl,
    redirectPrizeParam: landing.redirectPrizeParam,
    winningPrizeLabel: landing.winningPrize?.label ?? "",
    metaTitle: landing.metaTitle ?? landing.heading,
    metaDescription: landing.metaDescription ?? landing.subtitle,
  };
}

export async function getLandingByHost(host: string): Promise<LandingView | null> {
  const hostname = host.toLowerCase();
  const domain = await prisma.domain.findUnique({
    where: { hostname },
    include: { landing: { include: { prizes: true, winningPrize: true } } },
  });
  const landing = domain?.landing as LandingRow | undefined;
  if (!landing || landing.status !== "published" || !landing.winningPrize) return null;
  return toLandingView(landing);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/tenant.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/tenant.ts lib/types.ts lib/tenant.test.ts
git commit -m "feat: host-to-landing resolution and view mapping"
```

---

## Task 7: Wheel SVG component

**Files:**
- Create: `components/wheel/WheelSvg.tsx`
- Test: `components/wheel/WheelSvg.test.tsx`

**Interfaces:**
- Consumes: `WheelSegment` from `lib/types.ts`.
- Produces: `<WheelSvg segments={...} size={number} />` — renders one `<svg>` containing K wedge `<path>` elements (each `data-testid="wheel-segment"`) and K labels. Pure/presentational; rotation is applied by the parent via a wrapping transform.

- [ ] **Step 1: Write the failing test** — `components/wheel/WheelSvg.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import type { WheelSegment } from "@/lib/types";

const segments: WheelSegment[] = [
  { id: "a", order: 0, label: "€5", icon: "💶", color: "#1E7A3A" },
  { id: "b", order: 1, label: "50 FS", icon: "🎰", color: "#2BA552" },
  { id: "c", order: 2, label: "€10", icon: "💶", color: "#1E7A3A" },
  { id: "d", order: 3, label: "JACKPOT", icon: "👑", color: "#F5C24B" },
];

describe("WheelSvg", () => {
  it("renders one wedge per segment", () => {
    render(<WheelSvg segments={segments} size={300} />);
    expect(screen.getAllByTestId("wheel-segment")).toHaveLength(4);
  });

  it("renders each segment label", () => {
    render(<WheelSvg segments={segments} size={300} />);
    expect(screen.getByText("JACKPOT")).toBeInTheDocument();
    expect(screen.getByText("€5")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/wheel/WheelSvg.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `components/wheel/WheelSvg.tsx`

```tsx
import type { WheelSegment } from "@/lib/types";

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x1, y1] = polar(cx, cy, r, end);
  const [x2, y2] = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2} Z`;
}

export function WheelSvg({ segments, size }: { segments: WheelSegment[]; size: number }) {
  const K = segments.length;
  const seg = 360 / K;
  const c = size / 2;
  const r = c - 4;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Prize wheel">
      <circle cx={c} cy={c} r={r + 3} fill="var(--surface)" />
      {segments.map((s, i) => {
        const center = i * seg;
        const start = center - seg / 2;
        const end = center + seg / 2;
        const [lx, ly] = polar(c, c, r * 0.62, center);
        return (
          <g key={s.id}>
            <path data-testid="wheel-segment" d={wedgePath(c, c, r, start, end)} fill={s.color} stroke="var(--bg)" strokeWidth={2} />
            <text
              x={lx} y={ly}
              fill="var(--text)" fontSize={size * 0.05} fontWeight={700}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${center} ${lx} ${ly})`}
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/wheel/WheelSvg.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/wheel/WheelSvg.tsx components/wheel/WheelSvg.test.tsx
git commit -m "feat: presentational SVG prize wheel"
```

---

## Task 8: Pointer and WinModal components

**Files:**
- Create: `components/wheel/Pointer.tsx`, `components/wheel/WinModal.tsx`
- Test: `components/wheel/WinModal.test.tsx`

**Interfaces:**
- Produces:
  - `<Pointer />` — a gold downward-pointing triangle (presentational).
  - `<WinModal open title prizeLabel claimLabel onClaim />` where `title` already has `{prize}` substituted. Renders nothing when `open` is false; the claim button calls `onClaim`.

- [ ] **Step 1: Write the failing test** — `components/wheel/WinModal.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WinModal } from "@/components/wheel/WinModal";

describe("WinModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <WinModal open={false} title="You won JACKPOT!" prizeLabel="JACKPOT" claimLabel="Claim" onClaim={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the title and fires onClaim", async () => {
    const onClaim = vi.fn();
    render(<WinModal open title="You won JACKPOT!" prizeLabel="JACKPOT" claimLabel="Claim bonus" onClaim={onClaim} />);
    expect(screen.getByText("You won JACKPOT!")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Claim bonus" }));
    expect(onClaim).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/wheel/WinModal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `components/wheel/Pointer.tsx`

```tsx
export function Pointer() {
  return (
    <svg width={36} height={44} viewBox="0 0 36 44" data-testid="wheel-pointer" aria-hidden="true">
      <path d="M18 40 L2 6 Q18 16 34 6 Z" fill="var(--gold)" stroke="var(--bg)" strokeWidth={2} />
    </svg>
  );
}
```

- [ ] **Step 4: Implement** — `components/wheel/WinModal.tsx`

```tsx
export function WinModal({
  open, title, prizeLabel, claimLabel, onClaim,
}: {
  open: boolean;
  title: string;
  prizeLabel: string;
  claimLabel: string;
  onClaim: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="You won">
      <div className="modal-card">
        <div className="modal-emoji" aria-hidden="true">🎉</div>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-prize">{prizeLabel}</p>
        <button className="btn-claim" onClick={onClaim}>{claimLabel}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- components/wheel/WinModal.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/wheel/Pointer.tsx components/wheel/WinModal.tsx components/wheel/WinModal.test.tsx
git commit -m "feat: gold pointer and win modal components"
```

---

## Task 9: Spin controller hook

**Files:**
- Create: `app/[domain]/useSpinController.ts`
- Test: `app/[domain]/useSpinController.test.ts`

**Interfaces:**
- Consumes: `planSpin`, `rotationForIndex` from `lib/spin.ts`; `SpinConfig` from `lib/types.ts`.
- Produces: `useSpinController(config: SpinConfig)` returning:
  - `rotation: number` — current absolute rotation in degrees (apply as `transform: rotate(...)`).
  - `status: "idle" | "spinning" | "almost" | "won"`.
  - `spin(): void` — starts the next spin (ignored while spinning or after won).
  - `onAnimationComplete(): void` — call when the CSS transition ends; resolves the pending spin into `almost` or `won`.
  - Decoupling DOM timing from logic keeps this unit-testable.

- [ ] **Step 1: Write the failing test** — `app/[domain]/useSpinController.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpinController } from "@/app/[domain]/useSpinController";
import type { SpinConfig } from "@/lib/types";

const config: SpinConfig = { segmentCount: 8, spinsBeforeWin: 3, winningIndex: 7, behavior: "near-miss" };

describe("useSpinController", () => {
  it("near-misses before the winning spin, then wins on spin N", () => {
    const { result } = renderHook(() => useSpinController(config));
    expect(result.current.status).toBe("idle");

    // spin 1
    act(() => result.current.spin());
    expect(result.current.status).toBe("spinning");
    const r1 = result.current.rotation;
    expect(r1).toBeGreaterThan(0);
    act(() => result.current.onAnimationComplete());
    expect(result.current.status).toBe("almost");

    // spin 2
    act(() => result.current.spin());
    act(() => result.current.onAnimationComplete());
    expect(result.current.status).toBe("almost");
    expect(result.current.rotation).toBeGreaterThan(r1);

    // spin 3 -> win
    act(() => result.current.spin());
    act(() => result.current.onAnimationComplete());
    expect(result.current.status).toBe("won");
  });

  it("ignores spin() while a spin is in progress", () => {
    const { result } = renderHook(() => useSpinController(config));
    act(() => result.current.spin());
    const r = result.current.rotation;
    act(() => result.current.spin()); // ignored
    expect(result.current.rotation).toBe(r);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/[domain]/useSpinController.test.ts`
Expected: FAIL — hook not defined.

- [ ] **Step 3: Implement** — `app/[domain]/useSpinController.ts`

```ts
"use client";

import { useCallback, useRef, useState } from "react";
import { planSpin, rotationForIndex } from "@/lib/spin";
import type { SpinConfig } from "@/lib/types";

export type SpinStatus = "idle" | "spinning" | "almost" | "won";

export function useSpinController(config: SpinConfig) {
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  // Mirror status in a ref so guards don't depend on async state and stay
  // correct under React StrictMode (which double-invokes state updaters).
  const statusRef = useRef<SpinStatus>("idle");
  const countRef = useRef(0);
  const pendingWinRef = useRef(false);
  const rotationRef = useRef(0);

  const setBothStatus = useCallback((s: SpinStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const spin = useCallback(() => {
    if (statusRef.current === "spinning" || statusRef.current === "won") return;
    const spinNumber = countRef.current + 1;
    countRef.current = spinNumber;
    const plan = planSpin(spinNumber, config);
    pendingWinRef.current = plan.isWin;
    const next = rotationForIndex(plan.targetIndex, config.segmentCount, rotationRef.current);
    rotationRef.current = next;
    setRotation(next);
    setBothStatus("spinning");
  }, [config, setBothStatus]);

  const onAnimationComplete = useCallback(() => {
    if (statusRef.current !== "spinning") return;
    setBothStatus(pendingWinRef.current ? "won" : "almost");
  }, [setBothStatus]);

  return { rotation, status, spin, onAnimationComplete };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/[domain]/useSpinController.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/[domain]/useSpinController.ts" "app/[domain]/useSpinController.test.ts"
git commit -m "feat: spin controller hook"
```

---

## Task 10: Interactive wheel client component

**Files:**
- Create: `app/[domain]/Wheel.client.tsx`
- Test: `app/[domain]/Wheel.client.test.tsx`

**Interfaces:**
- Consumes: `useSpinController`, `WheelSvg`, `Pointer`, `WinModal`, `buildRedirectUrl`, `LandingView`.
- Produces: `<WheelClient landing={LandingView} />` — renders the wheel, a spin button (`data-testid="spin-button"`), the "almost" message (`data-testid="almost-text"`), and `WinModal`. On claim it navigates via an injectable `navigate` prop (defaults to `window.location.assign`) so tests can assert the redirect.

- [ ] **Step 1: Write the failing test** — `app/[domain]/Wheel.client.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WheelClient } from "@/app/[domain]/Wheel.client";
import type { LandingView } from "@/lib/types";

function view(): LandingView {
  const segments = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i}`, order: i, label: i === 7 ? "JACKPOT" : `P${i}`, icon: "🎰", color: "#1E7A3A",
  }));
  return {
    slug: "demo",
    texts: { heading: "Spin the Wheel", subtitle: "and win bonuses", backLabel: "Back", winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost! Spin again" },
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
    segments,
    spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" },
    redirectUrl: "https://casino.example/signup",
    redirectPrizeParam: "bonus",
    winningPrizeLabel: "JACKPOT",
    metaTitle: "Spin the Wheel", metaDescription: "and win bonuses",
  };
}

function fireTransitionEnd() {
  const wheel = screen.getByTestId("wheel-rotor");
  wheel.dispatchEvent(new Event("transitionend", { bubbles: true }));
}

describe("WheelClient", () => {
  it("shows the almost message before the winning spin, then the win modal with a substituted title", async () => {
    render(<WheelClient landing={view()} navigate={() => {}} />);
    const button = screen.getByTestId("spin-button");

    await userEvent.click(button);          // spin 1
    fireTransitionEnd();
    expect(screen.getByTestId("almost-text")).toHaveTextContent("Almost! Spin again");

    await userEvent.click(button);          // spin 2 -> win
    fireTransitionEnd();
    expect(screen.getByText("You won JACKPOT!")).toBeInTheDocument();
  });

  it("redirects with the prize param on claim", async () => {
    const navigate = vi.fn();
    render(<WheelClient landing={view()} navigate={navigate} />);
    const button = screen.getByTestId("spin-button");
    await userEvent.click(button); fireTransitionEnd();
    await userEvent.click(button); fireTransitionEnd();
    await userEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(navigate).toHaveBeenCalledWith("https://casino.example/signup?bonus=JACKPOT");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/[domain]/Wheel.client.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `app/[domain]/Wheel.client.tsx`

```tsx
"use client";

import { useSpinController } from "./useSpinController";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import { Pointer } from "@/components/wheel/Pointer";
import { WinModal } from "@/components/wheel/WinModal";
import { buildRedirectUrl } from "@/lib/redirect";
import type { LandingView } from "@/lib/types";

export function WheelClient({
  landing,
  navigate = (url: string) => window.location.assign(url),
}: {
  landing: LandingView;
  navigate?: (url: string) => void;
}) {
  const { rotation, status, spin, onAnimationComplete } = useSpinController(landing.spin);

  const winTitle = landing.texts.winTitle.replace("{prize}", landing.winningPrizeLabel);

  const onClaim = () => {
    navigate(buildRedirectUrl(landing.redirectUrl, landing.redirectPrizeParam, landing.winningPrizeLabel));
  };

  return (
    <div className="wheel-stage">
      <div className="wheel-pointer">
        <Pointer />
      </div>
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
        onClick={spin}
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
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/[domain]/Wheel.client.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add "app/[domain]/Wheel.client.tsx" "app/[domain]/Wheel.client.test.tsx"
git commit -m "feat: interactive wheel client with near-miss, win, and redirect"
```

---

## Task 11: Landing page (SSR) + not-found + metadata

**Files:**
- Create: `app/[domain]/page.tsx`, `app/[domain]/not-found.tsx`
- Test: `app/[domain]/metadata.test.ts`
- Create (helper): `app/[domain]/buildMetadata.ts`

**Interfaces:**
- Consumes: `getLandingByHost` from `lib/tenant.ts`; `themeToCssVars` from `lib/theme.ts`; `WheelClient`; `LandingView`.
- Produces:
  - `buildMetadata(view: LandingView): Metadata` — pure helper for title/description/icons (testable without rendering a server component).
  - `app/[domain]/page.tsx` — server component reading `params.domain`, resolving the landing, injecting theme CSS vars on the root wrapper, rendering the Boomzino layout + `<WheelClient>`. Calls `notFound()` when no landing.

- [ ] **Step 1: Write the failing test** — `app/[domain]/metadata.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildMetadata } from "@/app/[domain]/buildMetadata";
import type { LandingView } from "@/lib/types";

const base: LandingView = {
  slug: "demo",
  texts: { heading: "Spin the Wheel", subtitle: "and win bonuses", backLabel: "Back", winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost!" },
  theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
  assets: { logoUrl: null, faviconUrl: "https://cdn.example/fav.png", coinImageUrl: null, bgImageUrl: null },
  segments: [],
  spin: { segmentCount: 0, spinsBeforeWin: 1, winningIndex: 0, behavior: "near-miss" },
  redirectUrl: "https://x", redirectPrizeParam: null, winningPrizeLabel: "",
  metaTitle: "Win Big — Boomzino", metaDescription: "Spin to win",
};

describe("buildMetadata", () => {
  it("uses meta title/description and favicon when present", () => {
    const m = buildMetadata(base);
    expect(m.title).toBe("Win Big — Boomzino");
    expect(m.description).toBe("Spin to win");
    expect(m.icons).toEqual({ icon: "https://cdn.example/fav.png" });
  });

  it("omits icons when there is no favicon", () => {
    const m = buildMetadata({ ...base, assets: { ...base.assets, faviconUrl: null } });
    expect(m.icons).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/[domain]/metadata.test.ts`
Expected: FAIL — `buildMetadata` not defined.

- [ ] **Step 3: Implement the metadata helper** — `app/[domain]/buildMetadata.ts`

```ts
import type { Metadata } from "next";
import type { LandingView } from "@/lib/types";

export function buildMetadata(view: LandingView): Metadata {
  const meta: Metadata = { title: view.metaTitle, description: view.metaDescription };
  if (view.assets.faviconUrl) meta.icons = { icon: view.assets.faviconUrl };
  return meta;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/[domain]/metadata.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the not-found page** — `app/[domain]/not-found.tsx`

```tsx
export default function NotFound() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", color: "#EAF6EE", background: "#0A1410" }}>
      <p>This page isn’t configured.</p>
    </main>
  );
}
```

- [ ] **Step 6: Implement the page** — `app/[domain]/page.tsx`

```tsx
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { themeToCssVars } from "@/lib/theme";
import { buildMetadata } from "./buildMetadata";
import { WheelClient } from "./Wheel.client";

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

  const style = themeToCssVars(view.theme) as CSSProperties;

  return (
    <main className="landing" style={style}>
      <header className="landing-top">
        <button className="back-btn" aria-label={view.texts.backLabel}>‹ {view.texts.backLabel}</button>
      </header>

      <section className="landing-hero">
        {view.assets.logoUrl && <img className="landing-logo" src={view.assets.logoUrl} alt="" />}
        <h1 className="landing-title">{view.texts.heading}</h1>
        <p className="landing-subtitle">{view.texts.subtitle}</p>
      </section>

      {view.assets.coinImageUrl && <img className="landing-coin" src={view.assets.coinImageUrl} alt="" />}

      <WheelClient landing={view} />
    </main>
  );
}
```

- [ ] **Step 7: Run the unit suite and build**

Run: `npm test`
Expected: all unit/component suites PASS.

Run: `npm run build`
Expected: build succeeds; route `/[domain]` is listed.

- [ ] **Step 8: Commit**

```bash
git add "app/[domain]/page.tsx" "app/[domain]/not-found.tsx" "app/[domain]/buildMetadata.ts" "app/[domain]/metadata.test.ts"
git commit -m "feat: SSR landing page with theme injection and metadata"
```

---

## Task 12: Boomzino theme styling

**Files:**
- Modify: `app/globals.css`
- Test: covered by Task 14 (Playwright) + manual screenshot.

**Interfaces:**
- Consumes: the CSS variables injected by `page.tsx` (`--bg`, `--surface`, `--accent`, `--gold`, `--text`, `--muted`) and class names used in Tasks 8/10/11 (`landing`, `landing-top`, `back-btn`, `landing-hero`, `landing-title`, `landing-subtitle`, `landing-coin`, `wheel-stage`, `wheel-pointer`, `wheel-rotor`, `spin-button`, `almost-text`, `modal-backdrop`, `modal-card`, `modal-title`, `modal-prize`, `modal-emoji`, `btn-claim`).

- [ ] **Step 1: Replace `app/globals.css`** with the full Boomzino theme

```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: var(--font-outfit), system-ui, sans-serif; }

.landing {
  position: relative;
  min-height: 100dvh;
  max-width: 430px;
  margin: 0 auto;
  overflow: hidden;
  color: var(--text);
  background:
    radial-gradient(120% 80% at 50% 0%, #0E1F16 0%, var(--bg) 60%),
    var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.landing-top { width: 100%; padding: 16px; }
.back-btn {
  background: var(--surface);
  color: var(--text);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 15px;
  cursor: pointer;
}

.landing-hero { text-align: center; padding: 8px 16px 0; }
.landing-logo { height: 40px; margin-bottom: 12px; }
.landing-title {
  margin: 8px 0 4px;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--text);
  text-shadow: 0 0 24px color-mix(in srgb, var(--accent) 70%, transparent);
}
.landing-subtitle { margin: 0; color: var(--muted); font-size: 15px; }

.landing-coin {
  position: absolute;
  left: -18px;
  top: 220px;
  width: 64px;
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--gold) 60%, transparent));
}

/* Wheel anchored to the bottom, top three-quarters visible (cut off). */
.wheel-stage {
  position: relative;
  width: 360px;
  height: 300px;
  margin-top: auto;
  display: flex;
  justify-content: center;
}
.wheel-pointer {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
}
.wheel-rotor {
  position: absolute;
  top: 20px;
  width: 360px;
  height: 360px;
  transition: transform 4500ms cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 0 30px color-mix(in srgb, var(--accent) 40%, transparent));
}
.spin-button {
  position: absolute;
  top: calc(20px + 180px - 34px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 4px solid var(--bg);
  background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 85%, white), var(--accent));
  color: #04140A;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 80%, transparent);
}
.spin-button:disabled { opacity: 0.7; cursor: default; }
.almost-text {
  position: absolute;
  bottom: 8px;
  z-index: 5;
  color: var(--gold);
  font-weight: 700;
  text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 60%, transparent);
}

.modal-backdrop {
  position: fixed; inset: 0; z-index: 50;
  display: grid; place-items: center;
  background: rgba(2, 10, 6, 0.7);
  backdrop-filter: blur(4px);
}
.modal-card {
  width: min(340px, 86vw);
  text-align: center;
  padding: 28px 24px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
  box-shadow: 0 0 40px color-mix(in srgb, var(--accent) 35%, transparent);
}
.modal-emoji { font-size: 44px; }
.modal-title { margin: 8px 0 4px; color: var(--text); font-size: 24px; }
.modal-prize { margin: 0 0 20px; color: var(--gold); font-size: 28px; font-weight: 800; }
.btn-claim {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: #04140A;
  font-size: 17px;
  font-weight: 800;
  cursor: pointer;
}
```

- [ ] **Step 2: Manually verify the look**

Run: `npm run dev` and open `http://localhost:3000` (the seeded `localhost:3000` domain).
Expected: dark-green page, glowing "Spin the Wheel" title, gold pointer, large wheel anchored to the bottom and cut off, green glowing spin button. Tap spin → near-miss twice → win modal.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: Boomzino dark-green theme for the landing"
```

---

## Task 13: Host routing middleware

**Files:**
- Create: `lib/hostRoute.ts`, `middleware.ts`
- Test: `lib/hostRoute.test.ts`

**Interfaces:**
- Produces:
  - `decideHostRoute(host: string | null, pathname: string, adminHost: string | undefined): { kind: "pass" } | { kind: "rewrite"; path: string }` — pure decision used by middleware. Admin host or `/api`/`/_next` paths pass through; anything else rewrites to `/<host><pathname>`.
  - `middleware.ts` applying that decision via `NextResponse`.

- [ ] **Step 1: Write the failing test** — `lib/hostRoute.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { decideHostRoute } from "@/lib/hostRoute";

describe("decideHostRoute", () => {
  it("rewrites a landing host to /<host><path>", () => {
    expect(decideHostRoute("promo1.com", "/", "admin.example.com"))
      .toEqual({ kind: "rewrite", path: "/promo1.com/" });
    expect(decideHostRoute("promo1.com", "/anything", "admin.example.com"))
      .toEqual({ kind: "rewrite", path: "/promo1.com/anything" });
  });

  it("passes through the admin host", () => {
    expect(decideHostRoute("admin.example.com", "/admin", "admin.example.com"))
      .toEqual({ kind: "pass" });
  });

  it("passes through when host is missing", () => {
    expect(decideHostRoute(null, "/", "admin.example.com")).toEqual({ kind: "pass" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/hostRoute.test.ts`
Expected: FAIL — `decideHostRoute` not defined.

- [ ] **Step 3: Implement** — `lib/hostRoute.ts`

```ts
export type HostRoute = { kind: "pass" } | { kind: "rewrite"; path: string };

export function decideHostRoute(
  host: string | null,
  pathname: string,
  adminHost: string | undefined,
): HostRoute {
  if (!host) return { kind: "pass" };
  if (adminHost && host === adminHost) return { kind: "pass" };
  return { kind: "rewrite", path: `/${host}${pathname}` };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/hostRoute.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement** — `middleware.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { decideHostRoute } from "@/lib/hostRoute";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host");
  const decision = decideHostRoute(host, req.nextUrl.pathname, process.env.ADMIN_HOST);
  if (decision.kind === "pass") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = decision.path;
  return NextResponse.rewrite(url);
}

export const config = {
  // Exclude Next internals, API, and static files; those must never be host-rewritten.
  matcher: ["/((?!_next/|api/|favicon.ico|.*\\..*).*)"],
};
```

- [ ] **Step 6: Run the unit suite and build**

Run: `npm test && npm run build`
Expected: all PASS; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add lib/hostRoute.ts lib/hostRoute.test.ts middleware.ts
git commit -m "feat: host-based routing middleware"
```

---

## Task 14: End-to-end happy path (Playwright)

**Files:**
- Create: `tests/e2e/landing.spec.ts`

**Interfaces:**
- Consumes: the running app + seeded `localhost:3000` domain (Task 5). Drives `data-testid` hooks from Tasks 10/12.

> **Precondition:** Postgres running, `.env` set, schema pushed and seeded (Task 5 steps). The Playwright `webServer` builds and starts the app automatically.

- [ ] **Step 1: Write the E2E test** — `tests/e2e/landing.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("spins twice (near-miss) then wins and claims", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Spin the Wheel" })).toBeVisible();

  const spin = page.getByTestId("spin-button");

  // Spin 1 -> near-miss
  await spin.click();
  await expect(page.getByTestId("almost-text")).toBeVisible({ timeout: 10_000 });

  // Spin 2 -> near-miss (spinsBeforeWin = 3 in seed)
  await spin.click();
  await expect(page.getByTestId("almost-text")).toBeVisible({ timeout: 10_000 });

  // Spin 3 -> win
  await spin.click();
  await expect(page.getByText("You won JACKPOT!")).toBeVisible({ timeout: 10_000 });

  // Claim redirects to the configured URL with the prize param
  await page.getByRole("button", { name: "Claim bonus" }).click();
  await page.waitForURL(/boomzino\.example\/signup\?bonus=JACKPOT/, { timeout: 10_000 });
});
```

- [ ] **Step 2: Run the E2E test**

Run: `npm run e2e`
Expected: 1 passed — the wheel near-misses twice, wins on the third spin, and claim navigates to `https://boomzino.example/signup?bonus=JACKPOT`.

> Note: the seed sets `spinsBeforeWin = 3`, so the journey is near-miss, near-miss, win. The claim target host (`boomzino.example`) is not real; asserting on `waitForURL` matches the navigation attempt without needing the page to load.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/landing.spec.ts
git commit -m "test: e2e happy path for spin-to-win landing"
```

---

## Done criteria for Plan 1

- `npm test` — all unit/component suites green.
- `npm run e2e` — happy path green.
- `npm run dev` → `http://localhost:3000` shows the Boomzino-styled landing; spinning near-misses twice then wins; claim redirects with the prize param.
- All work committed in small, per-task commits.

**Next:** Plan 2 (CMS/admin: auth, landing CRUD, content/branding/wheel editors, Vercel Blob uploads, draft preview) and Plan 3 (multi-domain attach via the Vercel Domains API) write to and extend the very tables this plan reads.
