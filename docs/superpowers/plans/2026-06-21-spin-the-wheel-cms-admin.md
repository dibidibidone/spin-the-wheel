# Spin-the-Wheel — Plan 2: CMS / Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-admin CMS that creates and edits landings — authenticated dashboard, tabbed editor (Content, Branding, Wheel, Settings), Vercel Blob image uploads, and a draft preview — all writing to the same Postgres tables the public landing (Plan 1) reads, so edits go live instantly.

**Architecture:** The admin is served on `ADMIN_HOST` (Plan 1's `middleware.ts` already passes that host through untouched). Auth.js (NextAuth v5) credentials provider verifies the single seeded admin against a bcrypt hash and issues a JWT session cookie. Admin pages live under route groups: `app/admin/(panel)/*` (auth-guarded chrome: dashboard + editor) and `app/admin/(preview)/*` (auth-guarded, no chrome: full-screen landing preview); `app/admin/login` is public. Mutations go through thin, auth-guarded `/api/admin/*` route handlers that validate input with zod and delegate to a server-only service layer (`lib/admin/landingService.ts`) over Prisma. Editor tabs are client components that call those endpoints through a small fetch helper.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6 + PostgreSQL, NextAuth v5 (Credentials), bcryptjs, zod, `@vercel/blob`, Vitest + Testing Library (unit/component), Playwright (E2E).

**Scope note:** This is Plan 2 of 3. **Plan 1** delivered the foundation + public landing (Prisma schema incl. `Admin` & `Domain` models, `lib/types.ts`, `lib/db.ts`, `lib/tenant.ts`, `lib/spin.ts`, `lib/theme.ts`, `lib/redirect.ts`, the wheel components, `app/[domain]/page.tsx`, and `middleware.ts`). **This plan assumes Plan 1 is complete and merged.** **Plan 3** adds the **Domains** tab (attach custom domains via the Vercel Domains API) — so this plan deliberately ships the editor with **four** tabs (Content, Branding, Wheel, Settings) and **no** Domains tab.

## Global Constraints

- **Node** ≥ 20 (dev env is v22). **Package manager:** npm.
- **TypeScript strict mode** on. No `any` in committed code except where a third-party type is genuinely missing (comment why).
- **Next.js App Router** only. React Server Components by default; mark interactive files `'use client'`.
- **Database provider:** PostgreSQL via Prisma. `DATABASE_URL` from env; never hardcode credentials. Reuse the singleton `prisma` from `lib/db.ts` (Plan 1) everywhere server-side. **Client components must never import the service layer or `lib/db.ts`** — only `lib/admin/types.ts` (type-only) and `lib/adminClient.ts` (fetch).
- **Auth:** single seeded admin (email + bcrypt hash in the `Admin` table). NextAuth v5 Credentials provider, **JWT session strategy** (no sessions table). Every `/admin/(panel)` and `/admin/(preview)` page is guarded; every `/api/admin/*` route returns **401** without a session.
- **Brand (Boomzino):** the editor itself is a plain dark utilitarian CMS; the *landing it edits* keeps the Plan 1 theme tokens (`bg #0A1410`, `surface #13251A`, `accent #27C24C`, `gold #F5C24B`, `text #EAF6EE`, `muted #7FA88E`). New landings default to those tokens.
- **Instant go-live:** the public landing SSR-reads the DB per request (Plan 1), so a successful save needs **no** rebuild/publish — published edits appear on the next landing request.
- **Validation:** all mutation inputs validated with zod on the server before any DB write. Slugs match `^[a-z0-9]+(?:-[a-z0-9]+)*$`; theme colors are 6-digit hex; uploads are images ≤ 2 MB.
- **TDD:** write the failing test first for every logic/component/route task. **Commit after every task.**
- **Test commands:** unit/component `npm test`; E2E `npm run e2e`.

---

## File Structure

```
package.json                         # + next-auth, bcryptjs, zod, @vercel/blob (Task 1)
.env.example                         # + AUTH_SECRET, ADMIN_EMAIL/PASSWORD, BLOB token (Task 1)
lib/
  auth/
    password.ts                      # hashPassword / verifyPassword (bcryptjs)   [Task 1]
    authorize.ts                     # authorizeAdmin(creds, deps) — pure-ish      [Task 2]
    session.ts                       # requireAdminSession() page guard            [Task 2]
  auth.ts                            # NextAuth() config: handlers/auth/signIn     [Task 2]
  admin/
    guard.ts                         # requireApiSession() -> 401 or session       [Task 2]
    types.ts                         # EditableLanding, EditablePrize, ListItem     [Task 4]
    validation.ts                    # zod schemas + parse* helpers                 [Task 4]
    landingService.ts                # list/create/get/update/saveWheel + slugify   [Task 5]
    upload.ts                        # validateUpload({type,size})                  [Task 7]
  adminClient.ts                     # browser fetch helpers (PATCH/PUT/POST/upload)[Task 8]
  tenant.ts                          # + getLandingViewById(id)  (modify Plan 1)    [Task 5]
app/
  api/
    auth/[...nextauth]/route.ts      # NextAuth handlers                            [Task 2]
    admin/
      landings/route.ts             # GET list, POST create                        [Task 6]
      landings/[id]/route.ts        # PATCH fields (content/branding/settings)      [Task 6]
      landings/[id]/wheel/route.ts  # PUT prizes + spin config                      [Task 6]
      upload/route.ts               # POST image -> Vercel Blob                     [Task 7]
  admin/
    admin.css                        # CMS styling (placeholder Task 9, full Task 17)
    login/page.tsx                   # public login page                            [Task 8]
    (panel)/
      layout.tsx                     # auth guard + admin chrome                    [Task 9]
      page.tsx                       # dashboard (list + create)                    [Task 9]
      landings/[id]/page.tsx         # tabbed editor                                [Task 15]
    (preview)/
      layout.tsx                     # auth guard, no chrome                        [Task 16]
      landings/[id]/preview/page.tsx # full-screen landing preview                  [Task 16]
  [domain]/page.tsx                  # modify: render <LandingScene>  (Task 16)
components/
  landing/LandingScene.tsx           # extracted presentational landing (Task 16)
  admin/
    LoginForm.tsx                    # credentials form                            [Task 8]
    NewLandingButton.tsx             # create + navigate                            [Task 9]
    Field.tsx                        # labelled input/textarea                     [Task 10]
    ContentTab.tsx                                                                  [Task 11]
    BrandingTab.tsx                                                                 [Task 12]
    WheelTab.tsx                                                                    [Task 13]
    SettingsTab.tsx                                                                 [Task 14]
    LandingEditor.tsx                # tab shell                                    [Task 15]
prisma/
  seedAdmin.ts                       # seedAdmin(prisma, email, password)          [Task 3]
  seed.ts                            # modify: also seed the admin                 [Task 3]
tests/e2e/admin.spec.ts             # login -> edit -> live on landing             [Task 18]
```

---

## Task 1: CMS dependencies + password hashing

**Files:**
- Modify: `package.json`, `.env.example`
- Create: `lib/auth/password.ts`
- Test: `lib/auth/password.test.ts`

**Interfaces:**
- Produces:
  - `hashPassword(plain: string): Promise<string>` — bcrypt hash (cost 10).
  - `verifyPassword(plain: string, hash: string): Promise<boolean>` — bcrypt compare.

- [ ] **Step 1: Add dependencies to `package.json`**

Add these entries (merge into the existing `dependencies` / `devDependencies` objects created in Plan 1; keep the rest unchanged):

```jsonc
// dependencies:
    "next-auth": "5.0.0-beta.25",
    "bcryptjs": "2.4.3",
    "zod": "3.24.1",
    "@vercel/blob": "0.27.0",
// devDependencies:
    "@types/bcryptjs": "2.4.6"
```

> Any `5.0.0-beta.x` of `next-auth` that targets Next 15 / React 19 is acceptable if `beta.25` is unavailable; pin whatever installs cleanly.

- [ ] **Step 2: Extend `.env.example`**

Append (keep the Plan 1 `DATABASE_URL` and `ADMIN_HOST` lines):

```
# Auth.js (NextAuth v5)
AUTH_SECRET="dev-only-change-me-generate-with-npx-auth-secret"
AUTH_TRUST_HOST="true"
# Seeded admin credentials (used by prisma/seed.ts)
ADMIN_EMAIL="admin@boomzino.example"
ADMIN_PASSWORD="changeme123"
# Vercel Blob (required for image uploads; from the Vercel dashboard)
BLOB_READ_WRITE_TOKEN=""
```

- [ ] **Step 3: Install**

Run:
```bash
npm install
```
Expected: installs `next-auth`, `bcryptjs`, `zod`, `@vercel/blob`, `@types/bcryptjs` with no peer-dep errors.

- [ ] **Step 4: Write the failing test** — `lib/auth/password.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("produces a bcrypt hash that is not the plaintext", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(hash).not.toBe("s3cret-pass");
    expect(hash.startsWith("$2")).toBe(true);
  });

  it("verifies the correct password", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("s3cret-pass", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("s3cret-pass");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- lib/auth/password.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Implement** — `lib/auth/password.ts`

```ts
import bcrypt from "bcryptjs";

const COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- lib/auth/password.test.ts`
Expected: PASS (all three).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.example lib/auth/password.ts lib/auth/password.test.ts
git commit -m "feat: cms deps and bcrypt password hashing"
```

---

## Task 2: NextAuth credentials + guards

**Files:**
- Create: `lib/auth/authorize.ts`, `lib/auth.ts`, `lib/auth/session.ts`, `lib/admin/guard.ts`, `app/api/auth/[...nextauth]/route.ts`
- Test: `lib/auth/authorize.test.ts`, `lib/admin/guard.test.ts`

**Interfaces:**
- Consumes: `verifyPassword` (Task 1); `prisma` (`lib/db.ts`, Plan 1); `auth()` from `lib/auth.ts`.
- Produces:
  - `authorizeAdmin(raw, deps): Promise<{ id: string; email: string } | null>` — pure-ish credentials check (DB + verify injected via `deps`).
  - `lib/auth.ts` exporting `{ handlers, auth, signIn, signOut }` from `NextAuth(...)`.
  - `requireAdminSession(): Promise<Session>` — redirects to `/admin/login` when unauthenticated (for server pages/layouts).
  - `requireApiSession(): Promise<{ ok: true; session } | { ok: false; response: Response }>` — 401 `Response` when unauthenticated (for route handlers).

- [ ] **Step 1: Write the failing test** — `lib/auth/authorize.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { authorizeAdmin } from "@/lib/auth/authorize";

const admin = { id: "a1", email: "admin@x.com", passwordHash: "HASH" };

describe("authorizeAdmin", () => {
  it("returns the admin identity for valid credentials", async () => {
    const findAdmin = vi.fn().mockResolvedValue(admin);
    const verify = vi.fn().mockResolvedValue(true);
    const result = await authorizeAdmin({ email: "Admin@X.com", password: "pw" }, { findAdmin, verify });
    expect(findAdmin).toHaveBeenCalledWith("admin@x.com"); // trimmed + lowercased
    expect(verify).toHaveBeenCalledWith("pw", "HASH");
    expect(result).toEqual({ id: "a1", email: "admin@x.com" });
  });

  it("returns null when the email is unknown", async () => {
    const result = await authorizeAdmin(
      { email: "nobody@x.com", password: "pw" },
      { findAdmin: vi.fn().mockResolvedValue(null), verify: vi.fn() },
    );
    expect(result).toBeNull();
  });

  it("returns null on a bad password", async () => {
    const result = await authorizeAdmin(
      { email: "admin@x.com", password: "bad" },
      { findAdmin: vi.fn().mockResolvedValue(admin), verify: vi.fn().mockResolvedValue(false) },
    );
    expect(result).toBeNull();
  });

  it("returns null when fields are missing", async () => {
    const deps = { findAdmin: vi.fn(), verify: vi.fn() };
    expect(await authorizeAdmin({ email: "", password: "pw" }, deps)).toBeNull();
    expect(await authorizeAdmin(undefined, deps)).toBeNull();
    expect(deps.findAdmin).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/auth/authorize.test.ts`
Expected: FAIL — `authorizeAdmin` not defined.

- [ ] **Step 3: Implement** — `lib/auth/authorize.ts`

```ts
export type AdminRecord = { id: string; email: string; passwordHash: string };

export type AuthorizeDeps = {
  findAdmin: (email: string) => Promise<AdminRecord | null>;
  verify: (plain: string, hash: string) => Promise<boolean>;
};

export async function authorizeAdmin(
  raw: Partial<Record<"email" | "password", unknown>> | undefined,
  deps: AuthorizeDeps,
): Promise<{ id: string; email: string } | null> {
  const email = String(raw?.email ?? "").trim().toLowerCase();
  const password = String(raw?.password ?? "");
  if (!email || !password) return null;

  const admin = await deps.findAdmin(email);
  if (!admin) return null;

  const ok = await deps.verify(password, admin.passwordHash);
  return ok ? { id: admin.id, email: admin.email } : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/auth/authorize.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the NextAuth config** — `lib/auth.ts`

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { authorizeAdmin } from "@/lib/auth/authorize";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (creds) =>
        authorizeAdmin(creds, {
          findAdmin: (email) => prisma.admin.findUnique({ where: { email } }),
          verify: verifyPassword,
        }),
    }),
  ],
});
```

- [ ] **Step 6: Wire the route handler** — `app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 7: Implement the page guard** — `lib/auth/session.ts`

```ts
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export async function requireAdminSession(): Promise<Session> {
  const session = await auth();
  if (!session) redirect("/admin/login");
  return session;
}
```

> This thin redirect wrapper is exercised by the Task 18 E2E (visiting a guarded page while logged out bounces to `/admin/login`); the unit tests below cover the API guard, which carries the testable branching logic.

- [ ] **Step 8: Write the failing test for the API guard** — `lib/admin/guard.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

import { requireApiSession } from "@/lib/admin/guard";

beforeEach(() => authMock.mockReset());

describe("requireApiSession", () => {
  it("returns a 401 response when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireApiSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: "Unauthorized" });
    }
  });

  it("returns the session when authenticated", async () => {
    const session = { user: { email: "admin@x.com" } };
    authMock.mockResolvedValue(session);
    const result = await requireApiSession();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session).toBe(session);
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npm test -- lib/admin/guard.test.ts`
Expected: FAIL — `requireApiSession` not defined.

- [ ] **Step 10: Implement the API guard** — `lib/admin/guard.ts`

```ts
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

export type GuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: Response };

export async function requireApiSession(): Promise<GuardResult> {
  const session = await auth();
  if (!session) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `npm test -- lib/auth/authorize.test.ts lib/admin/guard.test.ts`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add lib/auth.ts lib/auth/authorize.ts lib/auth/authorize.test.ts lib/auth/session.ts lib/admin/guard.ts lib/admin/guard.test.ts "app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: nextauth credentials provider and admin session guards"
```

---

## Task 3: Seed the admin account

**Files:**
- Create: `prisma/seedAdmin.ts`
- Modify: `prisma/seed.ts` (Plan 1)
- Test: `prisma/seedAdmin.test.ts`

**Interfaces:**
- Consumes: `hashPassword` (Task 1).
- Produces: `seedAdmin(client, email, password): Promise<void>` — upserts a single admin (lowercased email) with a freshly hashed password. `client` is the minimal Prisma surface used (`{ admin: { upsert } }`) so it is unit-testable.

- [ ] **Step 1: Write the failing test** — `prisma/seedAdmin.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { seedAdmin } from "@/prisma/seedAdmin";
import { verifyPassword } from "@/lib/auth/password";

describe("seedAdmin", () => {
  it("upserts a lowercased admin with a verifiable bcrypt hash", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    await seedAdmin({ admin: { upsert } }, "Admin@Boomzino.Example", "changeme123");

    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ email: "admin@boomzino.example" });
    expect(arg.create.email).toBe("admin@boomzino.example");

    const hash = arg.create.passwordHash;
    expect(arg.update.passwordHash).toBe(hash);
    expect(await verifyPassword("changeme123", hash)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- prisma/seedAdmin.test.ts`
Expected: FAIL — `seedAdmin` not defined.

- [ ] **Step 3: Implement** — `prisma/seedAdmin.ts`

```ts
import { hashPassword } from "@/lib/auth/password";

type AdminUpsertClient = {
  admin: {
    upsert: (args: {
      where: { email: string };
      create: { email: string; passwordHash: string };
      update: { passwordHash: string };
    }) => Promise<unknown>;
  };
};

export async function seedAdmin(
  client: AdminUpsertClient,
  email: string,
  password: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  await client.admin.upsert({
    where: { email: normalized },
    create: { email: normalized, passwordHash },
    update: { passwordHash },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- prisma/seedAdmin.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the seed script** — modify `prisma/seed.ts`

Add the import near the top:

```ts
import { seedAdmin } from "./seedAdmin";
```

Inside `main()`, **after** the landing/prizes are seeded and **before** the final `console.log`, add:

```ts
  await seedAdmin(
    prisma,
    process.env.ADMIN_EMAIL ?? "admin@boomzino.example",
    process.env.ADMIN_PASSWORD ?? "changeme123",
  );
  console.log(`Seeded admin ${process.env.ADMIN_EMAIL ?? "admin@boomzino.example"}`);
```

- [ ] **Step 6: Re-run the seed**

> Requires Postgres running and `.env` populated (see Plan 1, Task 5).

Run:
```bash
npm run db:seed
```
Expected: prints the Plan 1 landing line **and** `Seeded admin admin@boomzino.example`.

- [ ] **Step 7: Commit**

```bash
git add prisma/seedAdmin.ts prisma/seedAdmin.test.ts prisma/seed.ts
git commit -m "feat: seed the single admin account"
```

---

## Task 4: Admin types + validation schemas

**Files:**
- Create: `lib/admin/types.ts`, `lib/admin/validation.ts`
- Test: `lib/admin/validation.test.ts`

**Interfaces:**
- Consumes: `ThemeColors` (`lib/types.ts`, Plan 1).
- Produces:
  - Types `EditablePrize`, `EditableLanding`, `LandingListItem`.
  - `parseLandingPatch(d)`, `parseWheelInput(d)`, `parseCreateLanding(d)` — each returns `{ ok: true; value } | { ok: false; error: string }`.
  - Inferred input types `LandingPatch`, `WheelInput`, `CreateLandingInput`.

- [ ] **Step 1: Create the editor types** — `lib/admin/types.ts`

```ts
import type { ThemeColors } from "@/lib/types";

export type EditablePrize = {
  id: string;
  order: number;
  label: string;
  icon: string;
  color: string;
  weight: number;
};

export type EditableLanding = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
  heading: string;
  subtitle: string;
  backLabel: string;
  winTitle: string;
  claimLabel: string;
  almostText: string;
  theme: ThemeColors;
  logoUrl: string | null;
  faviconUrl: string | null;
  coinImageUrl: string | null;
  bgImageUrl: string | null;
  spinsBeforeWin: number;
  redirectUrl: string;
  redirectPrizeParam: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  winningPrizeId: string | null;
  prizes: EditablePrize[];
};

export type LandingListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  domainCount: number;
};
```

- [ ] **Step 2: Write the failing test** — `lib/admin/validation.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parseLandingPatch, parseWheelInput, parseCreateLanding } from "@/lib/admin/validation";

const theme = { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" };

describe("parseLandingPatch", () => {
  it("accepts a partial patch of known fields", () => {
    const r = parseLandingPatch({ heading: "New", theme });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ heading: "New", theme });
  });

  it("accepts nullable asset URLs and meta fields", () => {
    const r = parseLandingPatch({ logoUrl: null, metaTitle: null, faviconUrl: "https://cdn.x/f.png" });
    expect(r.ok).toBe(true);
  });

  it("rejects an unknown key", () => {
    expect(parseLandingPatch({ nope: 1 }).ok).toBe(false);
  });

  it("rejects a bad slug", () => {
    expect(parseLandingPatch({ slug: "Has Spaces" }).ok).toBe(false);
  });

  it("rejects a non-hex theme color", () => {
    expect(parseLandingPatch({ theme: { ...theme, accent: "green" } }).ok).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(parseLandingPatch({ status: "live" }).ok).toBe(false);
  });
});

describe("parseWheelInput", () => {
  const prizes = [
    { label: "A", icon: "", color: "#1E7A3A", weight: 1 },
    { label: "B", icon: "👑", color: "#F5C24B", weight: 1 },
  ];

  it("accepts a valid wheel payload", () => {
    const r = parseWheelInput({ spinsBeforeWin: 3, winningIndex: 1, redirectUrl: "https://x.com", redirectPrizeParam: "bonus", prizes });
    expect(r.ok).toBe(true);
  });

  it("rejects winningIndex out of range", () => {
    expect(parseWheelInput({ spinsBeforeWin: 3, winningIndex: 2, redirectUrl: "https://x.com", redirectPrizeParam: null, prizes }).ok).toBe(false);
  });

  it("rejects fewer than two prizes", () => {
    expect(parseWheelInput({ spinsBeforeWin: 1, winningIndex: 0, redirectUrl: "https://x.com", redirectPrizeParam: null, prizes: [prizes[0]] }).ok).toBe(false);
  });

  it("rejects a non-URL redirect", () => {
    expect(parseWheelInput({ spinsBeforeWin: 1, winningIndex: 0, redirectUrl: "not-a-url", redirectPrizeParam: null, prizes }).ok).toBe(false);
  });
});

describe("parseCreateLanding", () => {
  it("requires a name", () => {
    expect(parseCreateLanding({ name: "Promo" }).ok).toBe(true);
    expect(parseCreateLanding({}).ok).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- lib/admin/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement** — `lib/admin/validation.ts`

```ts
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");
const url = z.string().url("Must be a valid URL");

const themeSchema = z.object({
  bg: hex, surface: hex, accent: hex, gold: hex, text: hex, muted: hex,
});

const patchSchema = z
  .object({
    name: z.string().min(1),
    slug,
    status: z.enum(["draft", "published"]),
    heading: z.string().min(1),
    subtitle: z.string(),
    backLabel: z.string().min(1),
    winTitle: z.string().min(1),
    claimLabel: z.string().min(1),
    almostText: z.string().min(1),
    metaTitle: z.string().nullable(),
    metaDescription: z.string().nullable(),
    theme: themeSchema,
    logoUrl: url.nullable(),
    faviconUrl: url.nullable(),
    coinImageUrl: url.nullable(),
    bgImageUrl: url.nullable(),
  })
  .partial()
  .strict();

const wheelPrizeSchema = z.object({
  label: z.string().min(1),
  icon: z.string().default(""),
  color: hex,
  weight: z.number().int().min(0),
});

const wheelSchema = z
  .object({
    spinsBeforeWin: z.number().int().min(1),
    winningIndex: z.number().int().min(0),
    redirectUrl: url,
    redirectPrizeParam: z.string().min(1).nullable(),
    prizes: z.array(wheelPrizeSchema).min(2),
  })
  .refine((v) => v.winningIndex < v.prizes.length, {
    message: "winningIndex is out of range",
    path: ["winningIndex"],
  });

const createSchema = z.object({ name: z.string().min(1) }).strict();

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): Parsed<z.infer<S>> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "Invalid input" };
}

export const parseLandingPatch = (d: unknown) => parse(patchSchema, d);
export const parseWheelInput = (d: unknown) => parse(wheelSchema, d);
export const parseCreateLanding = (d: unknown) => parse(createSchema, d);

export type LandingPatch = z.infer<typeof patchSchema>;
export type WheelInput = z.infer<typeof wheelSchema>;
export type CreateLandingInput = z.infer<typeof createSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/admin/validation.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/admin/types.ts lib/admin/validation.ts lib/admin/validation.test.ts
git commit -m "feat: admin editor types and zod validation"
```

---

## Task 5: Landing service + preview lookup

**Files:**
- Create: `lib/admin/landingService.ts`
- Modify: `lib/tenant.ts` (Plan 1 — add `getLandingViewById`)
- Test: `lib/admin/landingService.test.ts`, `lib/tenant.byId.test.ts`

**Interfaces:**
- Consumes: `prisma` (`lib/db.ts`); `boomzinoTheme` (`prisma/seedData.ts`, Plan 1); validation input types (Task 4); `toLandingView` (`lib/tenant.ts`, Plan 1).
- Produces:
  - `slugify(name: string): string` (pure).
  - `listLandings(): Promise<LandingListItem[]>`.
  - `createLanding(input: CreateLandingInput): Promise<{ id: string }>` — draft with default theme + 6 starter prizes, last prize set as winner.
  - `getEditableLanding(id: string): Promise<EditableLanding | null>`.
  - `updateLanding(id: string, patch: LandingPatch): Promise<void>`.
  - `saveWheel(id: string, input: WheelInput): Promise<void>` — replaces prizes and re-points `winningPrizeId` inside one transaction.
  - `getLandingViewById(id: string): Promise<LandingView | null>` (in `lib/tenant.ts`) — preview lookup that ignores `status`.

- [ ] **Step 1: Write the failing test** — `lib/admin/landingService.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const landing = {
  findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
};
const prize = { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() };
const $transaction = vi.fn();

vi.mock("@/lib/db", () => ({ prisma: { landing, prize, $transaction } }));

import {
  slugify, listLandings, createLanding, getEditableLanding, saveWheel,
} from "@/lib/admin/landingService";

beforeEach(() => {
  for (const fn of [landing.findMany, landing.findUnique, landing.create, landing.update, prize.deleteMany, prize.createMany, prize.findMany, $transaction]) {
    fn.mockReset();
  }
});

describe("slugify", () => {
  it("lowercases, trims and dashes", () => {
    expect(slugify("  Summer Promo 2026!! ")).toBe("summer-promo-2026");
  });
  it("falls back to 'landing' when empty", () => {
    expect(slugify("!!!")).toBe("landing");
  });
});

describe("listLandings", () => {
  it("maps rows including the domain count", async () => {
    landing.findMany.mockResolvedValue([
      { id: "l1", name: "Promo", slug: "promo", status: "published", _count: { domains: 2 } },
    ]);
    expect(await listLandings()).toEqual([
      { id: "l1", name: "Promo", slug: "promo", status: "published", domainCount: 2 },
    ]);
  });
});

describe("createLanding", () => {
  it("creates a draft, then sets the last prize as winner", async () => {
    landing.findUnique.mockResolvedValue(null); // slug is free
    landing.create.mockResolvedValue({
      id: "new1",
      prizes: [{ id: "p0" }, { id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }],
    });
    landing.update.mockResolvedValue({});

    const result = await createLanding({ name: "Big Promo" });
    expect(result).toEqual({ id: "new1" });

    const created = landing.create.mock.calls[0][0];
    expect(created.data.slug).toBe("big-promo");
    expect(created.data.status).toBe("draft");
    expect(created.data.prizes.create).toHaveLength(6);

    expect(landing.update).toHaveBeenCalledWith({ where: { id: "new1" }, data: { winningPrizeId: "p5" } });
  });
});

describe("getEditableLanding", () => {
  it("returns null when missing", async () => {
    landing.findUnique.mockResolvedValue(null);
    expect(await getEditableLanding("nope")).toBeNull();
  });

  it("maps a row to EditableLanding with ordered prizes", async () => {
    landing.findUnique.mockResolvedValue({
      id: "l1", slug: "promo", name: "Promo", status: "draft",
      heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
      claimLabel: "Claim", almostText: "Almost!",
      theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
      logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
      spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
      metaTitle: null, metaDescription: null, winningPrizeId: "p1",
      prizes: [{ id: "p1", order: 1, label: "B", icon: "👑", color: "#F5C24B", weight: 1 }],
    });
    const view = await getEditableLanding("l1");
    expect(view?.name).toBe("Promo");
    expect(view?.prizes[0].id).toBe("p1");
  });
});

describe("saveWheel", () => {
  it("clears the winner, replaces prizes, and re-points winningPrizeId in one transaction", async () => {
    const tx = {
      landing: { update: vi.fn().mockResolvedValue({}) },
      prize: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([{ id: "n0", order: 0 }, { id: "n1", order: 1 }]),
      },
    };
    $transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    await saveWheel("l1", {
      spinsBeforeWin: 2, winningIndex: 1, redirectUrl: "https://x.com", redirectPrizeParam: null,
      prizes: [
        { label: "A", icon: "", color: "#1E7A3A", weight: 1 },
        { label: "B", icon: "👑", color: "#F5C24B", weight: 1 },
      ],
    });

    expect(tx.landing.update).toHaveBeenNthCalledWith(1, { where: { id: "l1" }, data: { winningPrizeId: null } });
    expect(tx.prize.deleteMany).toHaveBeenCalledWith({ where: { landingId: "l1" } });
    expect(tx.prize.createMany).toHaveBeenCalledOnce();
    const finalUpdate = tx.landing.update.mock.calls[1][0];
    expect(finalUpdate.data.winningPrizeId).toBe("n1");
    expect(finalUpdate.data.spinsBeforeWin).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/admin/landingService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `lib/admin/landingService.ts`

```ts
import { prisma } from "@/lib/db";
import { boomzinoTheme } from "@/prisma/seedData";
import type { EditableLanding, EditablePrize, LandingListItem } from "@/lib/admin/types";
import type { CreateLandingInput, LandingPatch, WheelInput } from "@/lib/admin/validation";
import type { ThemeColors } from "@/lib/types";

const DEFAULT_PRIZES = [
  { label: "€5", icon: "💶", color: "#1E7A3A", weight: 30 },
  { label: "50 FS", icon: "🎰", color: "#2BA552", weight: 25 },
  { label: "€10", icon: "💶", color: "#1E7A3A", weight: 20 },
  { label: "100 FS", icon: "🎰", color: "#2BA552", weight: 12 },
  { label: "€20", icon: "💶", color: "#1E7A3A", weight: 8 },
  { label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
];

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "landing";
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.landing.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function listLandings(): Promise<LandingListItem[]> {
  const rows = await prisma.landing.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { domains: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    domainCount: r._count.domains,
  }));
}

export async function createLanding(input: CreateLandingInput): Promise<{ id: string }> {
  const slug = await uniqueSlug(slugify(input.name));
  const landing = await prisma.landing.create({
    data: {
      slug,
      name: input.name,
      status: "draft",
      heading: "Spin the Wheel",
      subtitle: "and win bonuses",
      theme: boomzinoTheme,
      spinsBeforeWin: 3,
      redirectUrl: "https://example.com",
      prizes: { create: DEFAULT_PRIZES.map((p, i) => ({ ...p, order: i })) },
    },
    include: { prizes: { orderBy: { order: "asc" } } },
  });

  const winner = landing.prizes[landing.prizes.length - 1];
  await prisma.landing.update({ where: { id: landing.id }, data: { winningPrizeId: winner.id } });
  return { id: landing.id };
}

export async function getEditableLanding(id: string): Promise<EditableLanding | null> {
  const l = await prisma.landing.findUnique({
    where: { id },
    include: { prizes: { orderBy: { order: "asc" } } },
  });
  if (!l) return null;

  const prizes: EditablePrize[] = l.prizes.map((p) => ({
    id: p.id, order: p.order, label: p.label, icon: p.icon, color: p.color, weight: p.weight,
  }));

  return {
    id: l.id,
    slug: l.slug,
    name: l.name,
    status: l.status as "draft" | "published",
    heading: l.heading,
    subtitle: l.subtitle,
    backLabel: l.backLabel,
    winTitle: l.winTitle,
    claimLabel: l.claimLabel,
    almostText: l.almostText,
    theme: l.theme as ThemeColors,
    logoUrl: l.logoUrl,
    faviconUrl: l.faviconUrl,
    coinImageUrl: l.coinImageUrl,
    bgImageUrl: l.bgImageUrl,
    spinsBeforeWin: l.spinsBeforeWin,
    redirectUrl: l.redirectUrl,
    redirectPrizeParam: l.redirectPrizeParam,
    metaTitle: l.metaTitle,
    metaDescription: l.metaDescription,
    winningPrizeId: l.winningPrizeId,
    prizes,
  };
}

export async function updateLanding(id: string, patch: LandingPatch): Promise<void> {
  await prisma.landing.update({ where: { id }, data: patch });
}

export async function saveWheel(id: string, input: WheelInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.landing.update({ where: { id }, data: { winningPrizeId: null } });
    await tx.prize.deleteMany({ where: { landingId: id } });
    await tx.prize.createMany({
      data: input.prizes.map((p, i) => ({
        landingId: id, order: i, label: p.label, icon: p.icon, color: p.color, weight: p.weight,
      })),
    });
    const created = await tx.prize.findMany({ where: { landingId: id }, orderBy: { order: "asc" } });
    const winner = created[input.winningIndex];
    await tx.landing.update({
      where: { id },
      data: {
        winningPrizeId: winner.id,
        spinsBeforeWin: input.spinsBeforeWin,
        redirectUrl: input.redirectUrl,
        redirectPrizeParam: input.redirectPrizeParam,
      },
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/admin/landingService.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test for the preview lookup** — `lib/tenant.byId.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/db", () => ({ prisma: { landing: { findUnique } } }));

import { getLandingViewById } from "@/lib/tenant";

beforeEach(() => findUnique.mockReset());

function row(status: string) {
  const prizes = [
    { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A", weight: 1 },
    { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
  ];
  return {
    slug: "demo", status,
    heading: "Spin the Wheel", subtitle: "and win", backLabel: "Back",
    winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null,
    winningPrizeId: "p1", winningPrize: prizes[1], prizes,
  };
}

describe("getLandingViewById", () => {
  it("returns a view even for a draft landing (preview ignores status)", async () => {
    findUnique.mockResolvedValue(row("draft"));
    const view = await getLandingViewById("l1");
    expect(view?.slug).toBe("demo");
    expect(view?.spin.winningIndex).toBe(1);
  });

  it("returns null when the landing does not exist", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getLandingViewById("missing")).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- lib/tenant.byId.test.ts`
Expected: FAIL — `getLandingViewById` not exported.

- [ ] **Step 7: Add `getLandingViewById`** — append to `lib/tenant.ts`

```ts
export async function getLandingViewById(id: string): Promise<LandingView | null> {
  const landing = await prisma.landing.findUnique({
    where: { id },
    include: { prizes: true, winningPrize: true },
  });
  if (!landing) return null;
  return toLandingView(landing as unknown as Parameters<typeof toLandingView>[0]);
}
```

> `toLandingView` and the `LandingRow` shape were defined in Plan 1's `lib/tenant.ts`. The `Parameters<...>[0]` cast reuses that local type without re-exporting it. If Plan 1 exported `LandingRow`, prefer importing and casting to it directly.

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- lib/tenant.byId.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/admin/landingService.ts lib/admin/landingService.test.ts lib/tenant.ts lib/tenant.byId.test.ts
git commit -m "feat: landing service crud and preview lookup"
```

---

## Task 6: Admin landing API routes

**Files:**
- Create: `app/api/admin/landings/route.ts`, `app/api/admin/landings/[id]/route.ts`, `app/api/admin/landings/[id]/wheel/route.ts`
- Test: `app/api/admin/landings/route.test.ts`, `app/api/admin/landings/[id]/route.test.ts`, `app/api/admin/landings/[id]/wheel/route.test.ts`

**Interfaces:**
- Consumes: `requireApiSession` (Task 2); service functions (Task 5); `parse*` (Task 4).
- Produces:
  - `GET /api/admin/landings` → `LandingListItem[]`; `POST` → `{ id }` (201).
  - `PATCH /api/admin/landings/[id]` → `{ ok: true }` (validates with `parseLandingPatch`).
  - `PUT /api/admin/landings/[id]/wheel` → `{ ok: true }` (validates with `parseWheelInput`).
  - All return **401** without a session and **400** on invalid input.

- [ ] **Step 1: Write the failing test (collection)** — `app/api/admin/landings/route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));

const listLandings = vi.fn();
const createLanding = vi.fn();
vi.mock("@/lib/admin/landingService", () => ({
  listLandings: () => listLandings(),
  createLanding: (i: unknown) => createLanding(i),
}));

import { GET, POST } from "@/app/api/admin/landings/route";

const authed = { ok: true, session: { user: {} } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

beforeEach(() => {
  requireApiSession.mockReset();
  listLandings.mockReset();
  createLanding.mockReset();
});

describe("GET /api/admin/landings", () => {
  it("401 without a session", async () => {
    requireApiSession.mockResolvedValue(denied);
    expect((await GET()).status).toBe(401);
  });

  it("returns the list when authed", async () => {
    requireApiSession.mockResolvedValue(authed);
    listLandings.mockResolvedValue([{ id: "l1" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([{ id: "l1" }]);
  });
});

describe("POST /api/admin/landings", () => {
  it("400 on invalid body", async () => {
    requireApiSession.mockResolvedValue(authed);
    const res = await POST(new Request("http://x/api", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
    expect(createLanding).not.toHaveBeenCalled();
  });

  it("creates and returns 201", async () => {
    requireApiSession.mockResolvedValue(authed);
    createLanding.mockResolvedValue({ id: "new1" });
    const res = await POST(new Request("http://x/api", { method: "POST", body: JSON.stringify({ name: "Promo" }) }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ id: "new1" });
    expect(createLanding).toHaveBeenCalledWith({ name: "Promo" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- "app/api/admin/landings/route.test.ts"`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement** — `app/api/admin/landings/route.ts`

```ts
import { requireApiSession } from "@/lib/admin/guard";
import { listLandings, createLanding } from "@/lib/admin/landingService";
import { parseCreateLanding } from "@/lib/admin/validation";

export async function GET() {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;
  return Response.json(await listLandings());
}

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = parseCreateLanding(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const created = await createLanding(parsed.value);
  return Response.json(created, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- "app/api/admin/landings/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Write the failing test (item PATCH)** — `app/api/admin/landings/[id]/route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));

const updateLanding = vi.fn();
vi.mock("@/lib/admin/landingService", () => ({ updateLanding: (...a: unknown[]) => updateLanding(...a) }));

import { PATCH } from "@/app/api/admin/landings/[id]/route";

const authed = { ok: true, session: { user: {} } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  requireApiSession.mockReset();
  updateLanding.mockReset();
});

describe("PATCH /api/admin/landings/[id]", () => {
  it("401 without a session", async () => {
    requireApiSession.mockResolvedValue(denied);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: "{}" }), ctx("l1"));
    expect(res.status).toBe(401);
  });

  it("400 on an unknown field", async () => {
    requireApiSession.mockResolvedValue(authed);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ nope: 1 }) }), ctx("l1"));
    expect(res.status).toBe(400);
    expect(updateLanding).not.toHaveBeenCalled();
  });

  it("updates and returns ok", async () => {
    requireApiSession.mockResolvedValue(authed);
    updateLanding.mockResolvedValue(undefined);
    const res = await PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify({ heading: "Hi" }) }), ctx("l1"));
    expect(res.status).toBe(200);
    expect(updateLanding).toHaveBeenCalledWith("l1", { heading: "Hi" });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- "app/api/admin/landings/[id]/route.test.ts"`
Expected: FAIL — route module not found.

- [ ] **Step 7: Implement** — `app/api/admin/landings/[id]/route.ts`

```ts
import { requireApiSession } from "@/lib/admin/guard";
import { updateLanding } from "@/lib/admin/landingService";
import { parseLandingPatch } from "@/lib/admin/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseLandingPatch(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  await updateLanding(id, parsed.value);
  return Response.json({ ok: true });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- "app/api/admin/landings/[id]/route.test.ts"`
Expected: PASS.

- [ ] **Step 9: Write the failing test (wheel PUT)** — `app/api/admin/landings/[id]/wheel/route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));

const saveWheel = vi.fn();
vi.mock("@/lib/admin/landingService", () => ({ saveWheel: (...a: unknown[]) => saveWheel(...a) }));

import { PUT } from "@/app/api/admin/landings/[id]/wheel/route";

const authed = { ok: true, session: { user: {} } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const validBody = {
  spinsBeforeWin: 2, winningIndex: 1, redirectUrl: "https://x.com", redirectPrizeParam: null,
  prizes: [
    { label: "A", icon: "", color: "#1E7A3A", weight: 1 },
    { label: "B", icon: "👑", color: "#F5C24B", weight: 1 },
  ],
};

beforeEach(() => {
  requireApiSession.mockReset();
  saveWheel.mockReset();
});

describe("PUT /api/admin/landings/[id]/wheel", () => {
  it("400 when winningIndex is out of range", async () => {
    requireApiSession.mockResolvedValue(authed);
    const res = await PUT(new Request("http://x", { method: "PUT", body: JSON.stringify({ ...validBody, winningIndex: 5 }) }), ctx("l1"));
    expect(res.status).toBe(400);
    expect(saveWheel).not.toHaveBeenCalled();
  });

  it("saves and returns ok", async () => {
    requireApiSession.mockResolvedValue(authed);
    saveWheel.mockResolvedValue(undefined);
    const res = await PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(validBody) }), ctx("l1"));
    expect(res.status).toBe(200);
    expect(saveWheel).toHaveBeenCalledWith("l1", expect.objectContaining({ winningIndex: 1 }));
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- "app/api/admin/landings/[id]/wheel/route.test.ts"`
Expected: FAIL — route module not found.

- [ ] **Step 11: Implement** — `app/api/admin/landings/[id]/wheel/route.ts`

```ts
import { requireApiSession } from "@/lib/admin/guard";
import { saveWheel } from "@/lib/admin/landingService";
import { parseWheelInput } from "@/lib/admin/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = parseWheelInput(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  await saveWheel(id, parsed.value);
  return Response.json({ ok: true });
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- "app/api/admin/landings/[id]/wheel/route.test.ts"`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add "app/api/admin/landings/route.ts" "app/api/admin/landings/route.test.ts" "app/api/admin/landings/[id]/route.ts" "app/api/admin/landings/[id]/route.test.ts" "app/api/admin/landings/[id]/wheel/route.ts" "app/api/admin/landings/[id]/wheel/route.test.ts"
git commit -m "feat: admin landing crud api routes"
```

---

## Task 7: Image upload (validation + Vercel Blob route)

**Files:**
- Create: `lib/admin/upload.ts`, `app/api/admin/upload/route.ts`
- Test: `lib/admin/upload.test.ts`, `app/api/admin/upload/route.test.ts`

**Interfaces:**
- Consumes: `requireApiSession` (Task 2); `put` from `@vercel/blob`.
- Produces:
  - `validateUpload(file: { type: string; size: number }): { ok: true } | { ok: false; error: string }` — image types only, ≤ 2 MB.
  - `POST /api/admin/upload` (multipart `file`) → `{ url }`; 401 without a session, 400 on missing/invalid file.

- [ ] **Step 1: Write the failing test** — `lib/admin/upload.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { validateUpload } from "@/lib/admin/upload";

describe("validateUpload", () => {
  it("accepts a small png", () => {
    expect(validateUpload({ type: "image/png", size: 1024 })).toEqual({ ok: true });
  });

  it("rejects a non-image type", () => {
    const r = validateUpload({ type: "application/pdf", size: 1024 });
    expect(r.ok).toBe(false);
  });

  it("rejects files over 2MB", () => {
    const r = validateUpload({ type: "image/png", size: 2 * 1024 * 1024 + 1 });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/admin/upload.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `lib/admin/upload.ts`

```ts
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const MAX_BYTES = 2 * 1024 * 1024;

export function validateUpload(file: { type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type || "unknown"}` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File exceeds the 2 MB limit" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/admin/upload.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test (route)** — `app/api/admin/upload/route.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));

const put = vi.fn();
vi.mock("@vercel/blob", () => ({ put: (...a: unknown[]) => put(...a) }));

import { POST } from "@/app/api/admin/upload/route";

const authed = { ok: true, session: { user: {} } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

function formWith(file: File | null): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://x/api/admin/upload", { method: "POST", body: form });
}

beforeEach(() => {
  requireApiSession.mockReset();
  put.mockReset();
});

describe("POST /api/admin/upload", () => {
  it("401 without a session", async () => {
    requireApiSession.mockResolvedValue(denied);
    expect((await POST(formWith(null))).status).toBe(401);
  });

  it("400 when no file is provided", async () => {
    requireApiSession.mockResolvedValue(authed);
    expect((await POST(formWith(null))).status).toBe(400);
  });

  it("400 when the file is not an allowed image", async () => {
    requireApiSession.mockResolvedValue(authed);
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect((await POST(formWith(file))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it("uploads and returns the blob url", async () => {
    requireApiSession.mockResolvedValue(authed);
    put.mockResolvedValue({ url: "https://blob.vercel-storage.com/logo.png" });
    const file = new File(["data"], "logo.png", { type: "image/png" });
    const res = await POST(formWith(file));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: "https://blob.vercel-storage.com/logo.png" });
    expect(put).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- "app/api/admin/upload/route.test.ts"`
Expected: FAIL — route module not found.

- [ ] **Step 7: Implement** — `app/api/admin/upload/route.ts`

```ts
import { put } from "@vercel/blob";
import { requireApiSession } from "@/lib/admin/guard";
import { validateUpload } from "@/lib/admin/upload";

export async function POST(req: Request) {
  const guard = await requireApiSession();
  if (!guard.ok) return guard.response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const check = validateUpload({ type: file.type, size: file.size });
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const blob = await put(`landings/${crypto.randomUUID()}-${file.name}`, file, { access: "public" });
  return Response.json({ url: blob.url });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- "app/api/admin/upload/route.test.ts"`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/admin/upload.ts lib/admin/upload.test.ts "app/api/admin/upload/route.ts" "app/api/admin/upload/route.test.ts"
git commit -m "feat: image upload validation and vercel blob route"
```

---

## Task 8: Admin client helper + login

**Files:**
- Create: `lib/adminClient.ts`, `components/admin/LoginForm.tsx`, `app/admin/login/page.tsx`
- Test: `lib/adminClient.test.ts`, `components/admin/LoginForm.test.tsx`

**Interfaces:**
- Produces:
  - `lib/adminClient.ts` (browser fetch helpers): `patchLanding(id, body)`, `putWheel(id, body)`, `createLandingReq(body)`, `uploadFile(file)`. Each throws `Error(message)` on non-2xx.
  - `<LoginForm />` — email/password form calling `signIn("credentials", { redirect: false })`; on success routes to `/admin`, on failure shows an error.
  - `app/admin/login/page.tsx` — public page rendering `<LoginForm />`.

- [ ] **Step 1: Write the failing test (client helper)** — `lib/adminClient.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { patchLanding, uploadFile } from "@/lib/adminClient";

beforeEach(() => vi.restoreAllMocks());

describe("patchLanding", () => {
  it("PATCHes JSON and returns the parsed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(patchLanding("l1", { heading: "Hi" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/landings/l1", expect.objectContaining({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading: "Hi" }),
    }));
  });

  it("throws the server error message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "bad slug" }), { status: 400 })));
    await expect(patchLanding("l1", { slug: "X" })).rejects.toThrow("bad slug");
  });
});

describe("uploadFile", () => {
  it("POSTs multipart form data and returns the url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://blob/x.png" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["d"], "x.png", { type: "image/png" });

    await expect(uploadFile(file)).resolves.toEqual({ url: "https://blob/x.png" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/adminClient.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement** — `lib/adminClient.ts`

```ts
async function sendJson<T>(method: string, url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function createLandingReq(body: { name: string }): Promise<{ id: string }> {
  return sendJson("POST", "/api/admin/landings", body);
}

export function patchLanding(id: string, body: unknown): Promise<{ ok: true }> {
  return sendJson("PATCH", `/api/admin/landings/${id}`, body);
}

export function putWheel(id: string, body: unknown): Promise<{ ok: true }> {
  return sendJson("PUT", `/api/admin/landings/${id}/wheel`, body);
}

export async function uploadFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Upload failed");
  }
  return res.json() as Promise<{ url: string }>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/adminClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test (login form)** — `components/admin/LoginForm.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signIn = vi.fn();
vi.mock("next-auth/react", () => ({ signIn: (...a: unknown[]) => signIn(...a) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { LoginForm } from "@/components/admin/LoginForm";

beforeEach(() => {
  signIn.mockReset();
  push.mockReset();
});

describe("LoginForm", () => {
  it("signs in and routes to the dashboard on success", async () => {
    signIn.mockResolvedValue({ ok: true, error: null });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "admin@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(signIn).toHaveBeenCalledWith("credentials", { email: "admin@x.com", password: "pw", redirect: false });
    expect(push).toHaveBeenCalledWith("/admin");
  });

  it("shows an error and does not route on failure", async () => {
    signIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "admin@x.com");
    await userEvent.type(screen.getByLabelText("Password"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
```

> Component tests use React Testing Library's `getByLabelText` (label-wrapped inputs). The Playwright E2E in Task 18 uses `page.getByLabel`, which is the Playwright equivalent — do not confuse the two.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- components/admin/LoginForm.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 7: Implement** — `components/admin/LoginForm.tsx`

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (!res || res.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/admin");
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <h1 className="login-title">Spin CMS</h1>
      <label className="field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>Sign in</button>
    </form>
  );
}
```

- [ ] **Step 8: Implement the page** — `app/admin/login/page.tsx`

```tsx
import { LoginForm } from "@/components/admin/LoginForm";
import "../admin.css";

export default function LoginPage() {
  return (
    <main className="login">
      <LoginForm />
    </main>
  );
}
```

> `../admin.css` resolves to `app/admin/admin.css`, created as a placeholder in Task 9 and fully written in Task 17. If you reach this step before Task 9, create an empty `app/admin/admin.css` first so the import resolves.

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- components/admin/LoginForm.test.tsx`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/adminClient.ts lib/adminClient.test.ts components/admin/LoginForm.tsx components/admin/LoginForm.test.tsx app/admin/login/page.tsx
git commit -m "feat: admin fetch client and login page"
```

---

## Task 9: Admin chrome layout + dashboard

**Files:**
- Create: `app/admin/admin.css` (placeholder), `app/admin/(panel)/layout.tsx`, `app/admin/(panel)/page.tsx`, `components/admin/NewLandingButton.tsx`
- Test: `components/admin/NewLandingButton.test.tsx`

**Interfaces:**
- Consumes: `requireAdminSession` (Task 2); `signOut` (`lib/auth.ts`); `listLandings` (Task 5); `createLandingReq` (Task 8).
- Produces:
  - `(panel)/layout.tsx` — guarded chrome (brand + sign-out) wrapping dashboard & editor.
  - `(panel)/page.tsx` — dashboard listing landings (link each to `/admin/landings/[id]`) with the create control.
  - `<NewLandingButton />` — name input + Create button → POST → navigate to the new editor.

- [ ] **Step 1: Create the stylesheet placeholder** — `app/admin/admin.css`

```css
/* Admin CMS styling — full theme added in Task 17. */
* { box-sizing: border-box; }
```

- [ ] **Step 2: Write the failing test** — `components/admin/NewLandingButton.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createLandingReq = vi.fn();
vi.mock("@/lib/adminClient", () => ({ createLandingReq: (...a: unknown[]) => createLandingReq(...a) }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { NewLandingButton } from "@/components/admin/NewLandingButton";

beforeEach(() => {
  createLandingReq.mockReset();
  push.mockReset();
});

describe("NewLandingButton", () => {
  it("creates a landing and navigates to its editor", async () => {
    createLandingReq.mockResolvedValue({ id: "new1" });
    render(<NewLandingButton />);
    await userEvent.type(screen.getByPlaceholderText("New landing name"), "Summer Promo");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(createLandingReq).toHaveBeenCalledWith({ name: "Summer Promo" });
    expect(push).toHaveBeenCalledWith("/admin/landings/new1");
  });

  it("does nothing when the name is blank", async () => {
    render(<NewLandingButton />);
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(createLandingReq).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- components/admin/NewLandingButton.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 4: Implement** — `components/admin/NewLandingButton.tsx`

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createLandingReq } from "@/lib/adminClient";

export function NewLandingButton() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { id } = await createLandingReq({ name: name.trim() });
      router.push(`/admin/landings/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="new-landing">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New landing name"
        aria-label="New landing name"
      />
      <button className="btn-primary" onClick={create} disabled={busy}>Create</button>
      {error && <span className="err">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 5: Implement the guarded layout** — `app/admin/(panel)/layout.tsx`

```tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/session";
import { signOut } from "@/lib/auth";
import "../admin.css";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();
  return (
    <div className="admin">
      <header className="admin-bar">
        <Link href="/admin" className="admin-brand">Spin CMS</Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button className="admin-signout" type="submit">Sign out</button>
        </form>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
```

- [ ] **Step 6: Implement the dashboard** — `app/admin/(panel)/page.tsx`

```tsx
import Link from "next/link";
import { listLandings } from "@/lib/admin/landingService";
import { NewLandingButton } from "@/components/admin/NewLandingButton";

export default async function Dashboard() {
  const landings = await listLandings();
  return (
    <section>
      <div className="dash-head">
        <h1>Landings</h1>
        <NewLandingButton />
      </div>

      <table className="landings-table">
        <thead>
          <tr><th>Name</th><th>Slug</th><th>Status</th><th>Domains</th></tr>
        </thead>
        <tbody>
          {landings.map((l) => (
            <tr key={l.id}>
              <td><Link href={`/admin/landings/${l.id}`}>{l.name}</Link></td>
              <td>{l.slug}</td>
              <td><span className={`status-pill status-${l.status}`}>{l.status}</span></td>
              <td>{l.domainCount}</td>
            </tr>
          ))}
          {landings.length === 0 && (
            <tr><td colSpan={4} className="empty">No landings yet — create your first one.</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- components/admin/NewLandingButton.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/admin/admin.css "app/admin/(panel)/layout.tsx" "app/admin/(panel)/page.tsx" components/admin/NewLandingButton.tsx components/admin/NewLandingButton.test.tsx
git commit -m "feat: admin chrome layout and dashboard"
```

---

## Task 10: Field component (shared editor input)

**Files:**
- Create: `components/admin/Field.tsx`
- Test: `components/admin/Field.test.tsx`

**Interfaces:**
- Produces: `<Field label value onChange type? textarea? />` — a labelled `<input>` (or `<textarea>` when `textarea`); `onChange` receives the new string value. Used by every editor tab.

- [ ] **Step 1: Write the failing test** — `components/admin/Field.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field } from "@/components/admin/Field";

describe("Field", () => {
  it("renders a labelled input and emits string changes", async () => {
    const onChange = vi.fn();
    render(<Field label="Heading" value="Hi" onChange={onChange} />);
    const input = screen.getByLabelText("Heading");
    expect(input).toHaveValue("Hi");
    await userEvent.type(input, "!");
    expect(onChange).toHaveBeenLastCalledWith("Hi!");
  });

  it("renders a textarea when asked", () => {
    render(<Field label="Subtitle" value="x" onChange={() => {}} textarea />);
    expect(screen.getByLabelText("Subtitle").tagName).toBe("TEXTAREA");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/admin/Field.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `components/admin/Field.tsx`

```tsx
"use client";

export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/admin/Field.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/Field.tsx components/admin/Field.test.tsx
git commit -m "feat: shared labelled Field component"
```

---

## Task 11: Content tab

**Files:**
- Create: `components/admin/ContentTab.tsx`
- Test: `components/admin/ContentTab.test.tsx`

**Interfaces:**
- Consumes: `Field` (Task 10); `patchLanding` (Task 8); `EditableLanding` (Task 4).
- Produces: `<ContentTab landing={EditableLanding} />` — edits the six texts + SEO meta; **Save** PATCHes them. Empty meta fields are sent as `null`.

- [ ] **Step 1: Write the failing test** — `components/admin/ContentTab.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
vi.mock("@/lib/adminClient", () => ({ patchLanding: (...a: unknown[]) => patchLanding(...a) }));

import { ContentTab } from "@/components/admin/ContentTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => patchLanding.mockReset());

describe("ContentTab", () => {
  it("saves edited texts (empty meta sent as null)", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<ContentTab landing={landing()} />);

    const heading = screen.getByLabelText("Heading");
    await userEvent.clear(heading);
    await userEvent.type(heading, "Spin & Win");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", expect.objectContaining({
      heading: "Spin & Win",
      metaTitle: null,
      metaDescription: null,
    }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/admin/ContentTab.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `components/admin/ContentTab.tsx`

```tsx
"use client";

import { useState } from "react";
import { Field } from "./Field";
import { patchLanding } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

export function ContentTab({ landing }: { landing: EditableLanding }) {
  const [f, setF] = useState({
    heading: landing.heading,
    subtitle: landing.subtitle,
    backLabel: landing.backLabel,
    winTitle: landing.winTitle,
    claimLabel: landing.claimLabel,
    almostText: landing.almostText,
    metaTitle: landing.metaTitle ?? "",
    metaDescription: landing.metaDescription ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, {
        heading: f.heading,
        subtitle: f.subtitle,
        backLabel: f.backLabel,
        winTitle: f.winTitle,
        claimLabel: f.claimLabel,
        almostText: f.almostText,
        metaTitle: f.metaTitle.trim() || null,
        metaDescription: f.metaDescription.trim() || null,
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
      <Field label="Heading" value={f.heading} onChange={set("heading")} />
      <Field label="Subtitle" value={f.subtitle} onChange={set("subtitle")} textarea />
      <Field label="Back button label" value={f.backLabel} onChange={set("backLabel")} />
      <Field label="Win title (use {prize})" value={f.winTitle} onChange={set("winTitle")} />
      <Field label="Claim button label" value={f.claimLabel} onChange={set("claimLabel")} />
      <Field label="Near-miss text" value={f.almostText} onChange={set("almostText")} />
      <Field label="SEO title" value={f.metaTitle} onChange={set("metaTitle")} />
      <Field label="SEO description" value={f.metaDescription} onChange={set("metaDescription")} textarea />
      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/admin/ContentTab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/ContentTab.tsx components/admin/ContentTab.test.tsx
git commit -m "feat: content editor tab"
```

---

## Task 12: Branding tab (theme + uploads)

**Files:**
- Create: `components/admin/BrandingTab.tsx`
- Test: `components/admin/BrandingTab.test.tsx`

**Interfaces:**
- Consumes: `Field` (Task 10); `patchLanding`, `uploadFile` (Task 8); `themeToCssVars` (`lib/theme.ts`, Plan 1); `EditableLanding`, `ThemeColors`.
- Produces: `<BrandingTab landing={EditableLanding} />` — six color inputs with a live preview swatch, four image uploaders (logo/favicon/coin/background). **Save** PATCHes `{ theme, logoUrl, faviconUrl, coinImageUrl, bgImageUrl }`.

- [ ] **Step 1: Write the failing test** — `components/admin/BrandingTab.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
const uploadFile = vi.fn();
vi.mock("@/lib/adminClient", () => ({
  patchLanding: (...a: unknown[]) => patchLanding(...a),
  uploadFile: (...a: unknown[]) => uploadFile(...a),
}));

import { BrandingTab } from "@/components/admin/BrandingTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => {
  patchLanding.mockReset();
  uploadFile.mockReset();
});

describe("BrandingTab", () => {
  it("saves theme colors and asset urls", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<BrandingTab landing={landing()} />);

    const accent = screen.getByLabelText("Accent");
    await userEvent.clear(accent);
    await userEvent.type(accent, "#00FF00");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", expect.objectContaining({
      theme: expect.objectContaining({ accent: "#00FF00" }),
      logoUrl: null,
    }));
  });

  it("uploads a logo and stores the returned url", async () => {
    uploadFile.mockResolvedValue({ url: "https://blob/logo.png" });
    patchLanding.mockResolvedValue({ ok: true });
    render(<BrandingTab landing={landing()} />);

    const file = new File(["d"], "logo.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Logo"), file);
    expect(uploadFile).toHaveBeenCalledWith(file);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(patchLanding).toHaveBeenCalledWith("l1", expect.objectContaining({ logoUrl: "https://blob/logo.png" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/admin/BrandingTab.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `components/admin/BrandingTab.tsx`

```tsx
"use client";

import { useState, type CSSProperties, type ChangeEvent } from "react";
import { Field } from "./Field";
import { patchLanding, uploadFile } from "@/lib/adminClient";
import { themeToCssVars } from "@/lib/theme";
import type { EditableLanding } from "@/lib/admin/types";
import type { ThemeColors } from "@/lib/types";

type AssetKey = "logoUrl" | "faviconUrl" | "coinImageUrl" | "bgImageUrl";
const COLOR_LABELS: Array<[keyof ThemeColors, string]> = [
  ["bg", "Background"], ["surface", "Surface"], ["accent", "Accent"],
  ["gold", "Gold"], ["text", "Text"], ["muted", "Muted"],
];
const ASSETS: Array<[AssetKey, string]> = [
  ["logoUrl", "Logo"], ["faviconUrl", "Favicon"], ["coinImageUrl", "Coin"], ["bgImageUrl", "Background image"],
];

export function BrandingTab({ landing }: { landing: EditableLanding }) {
  const [theme, setTheme] = useState<ThemeColors>(landing.theme);
  const [assets, setAssets] = useState<Record<AssetKey, string | null>>({
    logoUrl: landing.logoUrl,
    faviconUrl: landing.faviconUrl,
    coinImageUrl: landing.coinImageUrl,
    bgImageUrl: landing.bgImageUrl,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const setColor = (k: keyof ThemeColors) => (v: string) => setTheme((p) => ({ ...p, [k]: v }));

  async function onUpload(key: AssetKey, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("");
    try {
      const { url } = await uploadFile(file);
      setAssets((p) => ({ ...p, [key]: url }));
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, { theme, ...assets });
      setMsg("Saved");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tab-panel">
      <div className="theme-grid">
        {COLOR_LABELS.map(([key, label]) => (
          <Field key={key} label={label} type="text" value={theme[key]} onChange={setColor(key)} />
        ))}
      </div>

      <div className="theme-preview" style={themeToCssVars(theme) as CSSProperties}>
        <div className="theme-preview-card">
          <span className="theme-preview-title">Aa</span>
          <span className="theme-preview-prize">JACKPOT</span>
          <button type="button" className="theme-preview-btn">Spin</button>
        </div>
      </div>

      <div className="assets">
        {ASSETS.map(([key, label]) => (
          <div key={key} className="asset">
            <label className="field">
              <span>{label}</span>
              <input type="file" accept="image/*" onChange={(e) => onUpload(key, e)} />
            </label>
            {assets[key] && <img className="asset-preview" src={assets[key] as string} alt="" />}
          </div>
        ))}
      </div>

      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/admin/BrandingTab.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add components/admin/BrandingTab.tsx components/admin/BrandingTab.test.tsx
git commit -m "feat: branding editor tab with theme and uploads"
```

---

## Task 13: Wheel tab

**Files:**
- Create: `components/admin/WheelTab.tsx`
- Test: `components/admin/WheelTab.test.tsx`

**Interfaces:**
- Consumes: `putWheel` (Task 8); `EditableLanding`, `EditablePrize`.
- Produces: `<WheelTab landing={EditableLanding} />` — editable prize rows (label/icon/color/weight), add/remove/move-up-down, choose the winning row (radio), set `spinsBeforeWin`, `redirectUrl`, `redirectPrizeParam`. **Save** PUTs the wheel payload (`winningIndex` = chosen row position; `prizes` in display order).

- [ ] **Step 1: Write the failing test** — `components/admin/WheelTab.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const putWheel = vi.fn();
vi.mock("@/lib/adminClient", () => ({ putWheel: (...a: unknown[]) => putWheel(...a) }));

import { WheelTab } from "@/components/admin/WheelTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1",
    prizes: [
      { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A", weight: 1 },
      { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
    ],
  };
}

beforeEach(() => putWheel.mockReset());

describe("WheelTab", () => {
  it("saves the prizes, winning index and spin config", async () => {
    putWheel.mockResolvedValue({ ok: true });
    render(<WheelTab landing={landing()} />);

    // winning radio for the 2nd prize (index 1) is pre-selected from winningPrizeId
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(putWheel).toHaveBeenCalledWith("l1", expect.objectContaining({
      spinsBeforeWin: 3,
      winningIndex: 1,
      redirectUrl: "https://x.com",
      redirectPrizeParam: "bonus",
      prizes: [
        expect.objectContaining({ label: "€5" }),
        expect.objectContaining({ label: "JACKPOT" }),
      ],
    }));
  });

  it("adds a prize row", async () => {
    putWheel.mockResolvedValue({ ok: true });
    render(<WheelTab landing={landing()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add prize" }));
    expect(screen.getAllByTestId("prize-row")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/admin/WheelTab.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `components/admin/WheelTab.tsx`

```tsx
"use client";

import { useState } from "react";
import { putWheel } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

type Row = { label: string; icon: string; color: string; weight: number };

export function WheelTab({ landing }: { landing: EditableLanding }) {
  const [rows, setRows] = useState<Row[]>(
    landing.prizes.map((p) => ({ label: p.label, icon: p.icon, color: p.color, weight: p.weight })),
  );
  const [winningIndex, setWinningIndex] = useState(
    Math.max(0, landing.prizes.findIndex((p) => p.id === landing.winningPrizeId)),
  );
  const [spinsBeforeWin, setSpins] = useState(landing.spinsBeforeWin);
  const [redirectUrl, setRedirectUrl] = useState(landing.redirectUrl);
  const [prizeParam, setPrizeParam] = useState(landing.redirectPrizeParam ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function setRow(i: number, patch: Partial<Row>) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((p) => [...p, { label: "New prize", icon: "", color: "#1E7A3A", weight: 1 }]);
  }
  function removeRow(i: number) {
    setRows((p) => p.filter((_, idx) => idx !== i));
    setWinningIndex((w) => (w >= i && w > 0 ? w - 1 : w));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    setRows((p) => {
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setWinningIndex((w) => (w === i ? j : w === j ? i : w));
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await putWheel(landing.id, {
        spinsBeforeWin: Number(spinsBeforeWin),
        winningIndex,
        redirectUrl,
        redirectPrizeParam: prizeParam.trim() || null,
        prizes: rows.map((r) => ({ label: r.label, icon: r.icon, color: r.color, weight: Number(r.weight) })),
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
      <div className="prize-list">
        {rows.map((r, i) => (
          <div className="prize-row" data-testid="prize-row" key={i}>
            <input type="radio" name="winner" aria-label={`Winner: ${r.label}`} checked={winningIndex === i} onChange={() => setWinningIndex(i)} />
            <input aria-label={`Label ${i}`} value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} />
            <input aria-label={`Icon ${i}`} className="icon-input" value={r.icon} onChange={(e) => setRow(i, { icon: e.target.value })} />
            <input aria-label={`Color ${i}`} type="color" value={r.color} onChange={(e) => setRow(i, { color: e.target.value })} />
            <input aria-label={`Weight ${i}`} className="weight-input" type="number" min={0} value={r.weight} onChange={(e) => setRow(i, { weight: Number(e.target.value) })} />
            <button type="button" onClick={() => move(i, -1)} aria-label={`Move up ${i}`}>↑</button>
            <button type="button" onClick={() => move(i, 1)} aria-label={`Move down ${i}`}>↓</button>
            <button type="button" onClick={() => removeRow(i)} aria-label={`Remove ${i}`}>✕</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={addRow}>Add prize</button>

      <div className="wheel-config">
        <label className="field">
          <span>Spins before win (N)</span>
          <input type="number" min={1} value={spinsBeforeWin} onChange={(e) => setSpins(Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Redirect URL</span>
          <input type="url" value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>Prize query param (optional)</span>
          <input value={prizeParam} onChange={(e) => setPrizeParam(e.target.value)} />
        </label>
      </div>

      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/admin/WheelTab.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add components/admin/WheelTab.tsx components/admin/WheelTab.test.tsx
git commit -m "feat: wheel editor tab with prize list and spin config"
```

---

## Task 14: Settings tab

**Files:**
- Create: `components/admin/SettingsTab.tsx`
- Test: `components/admin/SettingsTab.test.tsx`

**Interfaces:**
- Consumes: `Field` (Task 10); `patchLanding` (Task 8); `EditableLanding`.
- Produces: `<SettingsTab landing={EditableLanding} />` — edit `name`, `slug`, and toggle `status` (draft/published). **Save** PATCHes `{ name, slug, status }`.

- [ ] **Step 1: Write the failing test** — `components/admin/SettingsTab.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
vi.mock("@/lib/adminClient", () => ({ patchLanding: (...a: unknown[]) => patchLanding(...a) }));

import { SettingsTab } from "@/components/admin/SettingsTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => patchLanding.mockReset());

describe("SettingsTab", () => {
  it("publishes the landing", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<SettingsTab landing={landing()} />);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "published");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", { name: "Promo", slug: "promo", status: "published" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/admin/SettingsTab.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `components/admin/SettingsTab.tsx`

```tsx
"use client";

import { useState } from "react";
import { Field } from "./Field";
import { patchLanding } from "@/lib/adminClient";
import type { EditableLanding } from "@/lib/admin/types";

export function SettingsTab({ landing }: { landing: EditableLanding }) {
  const [name, setName] = useState(landing.name);
  const [slug, setSlug] = useState(landing.slug);
  const [status, setStatus] = useState<"draft" | "published">(landing.status);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await patchLanding(landing.id, { name, slug, status });
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
      <div className="save-row">
        <button className="btn-primary" onClick={save} disabled={busy}>Save</button>
        {msg && <span className="save-msg">{msg}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/admin/SettingsTab.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/admin/SettingsTab.tsx components/admin/SettingsTab.test.tsx
git commit -m "feat: settings editor tab (slug, name, publish)"
```

---

## Task 15: Editor shell + editor page

**Files:**
- Create: `components/admin/LandingEditor.tsx`, `app/admin/(panel)/landings/[id]/page.tsx`
- Test: `components/admin/LandingEditor.test.tsx`

**Interfaces:**
- Consumes: the four tabs (Tasks 11–14); `getEditableLanding` (Task 5); `EditableLanding`.
- Produces:
  - `<LandingEditor landing={EditableLanding} />` — tab bar (`data-testid="tab-content|branding|wheel|settings"`) switching the four panels.
  - `app/admin/(panel)/landings/[id]/page.tsx` — server page fetching the editable landing, rendering a header with a Preview link + `<LandingEditor>`; `notFound()` when missing.

- [ ] **Step 1: Write the failing test** — `components/admin/LandingEditor.test.tsx`

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

vi.mock("@/lib/adminClient", () => ({
  patchLanding: vi.fn(), putWheel: vi.fn(), uploadFile: vi.fn(), createLandingReq: vi.fn(),
}));

import { LandingEditor } from "@/components/admin/LandingEditor";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

describe("LandingEditor", () => {
  it("shows the Content tab first and switches to Settings", async () => {
    render(<LandingEditor landing={landing()} />);
    expect(screen.getByLabelText("Heading")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("tab-settings"));
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/admin/LandingEditor.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the shell** — `components/admin/LandingEditor.tsx`

```tsx
"use client";

import { useState } from "react";
import { ContentTab } from "./ContentTab";
import { BrandingTab } from "./BrandingTab";
import { WheelTab } from "./WheelTab";
import { SettingsTab } from "./SettingsTab";
import type { EditableLanding } from "@/lib/admin/types";

const TABS = ["Content", "Branding", "Wheel", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function LandingEditor({ landing }: { landing: EditableLanding }) {
  const [tab, setTab] = useState<Tab>("Content");
  return (
    <div className="editor">
      <nav className="tabs">
        {TABS.map((t) => (
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
      {tab === "Branding" && <BrandingTab landing={landing} />}
      {tab === "Wheel" && <WheelTab landing={landing} />}
      {tab === "Settings" && <SettingsTab landing={landing} />}
    </div>
  );
}
```

- [ ] **Step 4: Implement the editor page** — `app/admin/(panel)/landings/[id]/page.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditableLanding } from "@/lib/admin/landingService";
import { LandingEditor } from "@/components/admin/LandingEditor";

type Params = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: Params) {
  const { id } = await params;
  const landing = await getEditableLanding(id);
  if (!landing) notFound();

  return (
    <section className="editor-page">
      <div className="editor-head">
        <div>
          <Link href="/admin" className="back-link">‹ All landings</Link>
          <h1>{landing.name}</h1>
        </div>
        <Link href={`/admin/landings/${landing.id}/preview`} target="_blank" className="btn-secondary">Preview ↗</Link>
      </div>
      <LandingEditor landing={landing} />
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- components/admin/LandingEditor.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/admin/LandingEditor.tsx components/admin/LandingEditor.test.tsx "app/admin/(panel)/landings/[id]/page.tsx"
git commit -m "feat: tabbed landing editor and editor page"
```

---

## Task 16: Draft preview + LandingScene refactor

**Files:**
- Create: `components/landing/LandingScene.tsx`, `app/admin/(preview)/layout.tsx`, `app/admin/(preview)/landings/[id]/preview/page.tsx`
- Modify: `app/[domain]/page.tsx` (Plan 1 — render `<LandingScene>`)
- Test: `components/landing/LandingScene.test.tsx`

**Interfaces:**
- Consumes: `themeToCssVars` (Plan 1); `WheelClient` (Plan 1); `getLandingViewById` (Task 5); `requireAdminSession` (Task 2); `LandingView`.
- Produces:
  - `<LandingScene view={LandingView} />` — the presentational landing (theme vars + header + hero + coin + `<WheelClient>`), extracted from Plan 1's page so both the public route and the preview render identically.
  - `app/admin/(preview)/landings/[id]/preview/page.tsx` — guarded; renders `<LandingScene>` for any landing (draft included).

- [ ] **Step 1: Write the failing test** — `components/landing/LandingScene.test.tsx`

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingScene } from "@/components/landing/LandingScene";
import type { LandingView } from "@/lib/types";

function view(): LandingView {
  return {
    slug: "demo",
    texts: { heading: "Spin & Win Big", subtitle: "and win bonuses", backLabel: "Back", winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost!" },
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
    segments: [
      { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A" },
      { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B" },
    ],
    spin: { segmentCount: 2, spinsBeforeWin: 3, winningIndex: 1, behavior: "near-miss" },
    redirectUrl: "https://x.com", redirectPrizeParam: "bonus", winningPrizeLabel: "JACKPOT",
    metaTitle: "Spin & Win Big", metaDescription: "and win bonuses",
  };
}

describe("LandingScene", () => {
  it("renders the heading and applies theme CSS variables", () => {
    const { container } = render(<LandingScene view={view()} />);
    expect(screen.getByRole("heading", { name: "Spin & Win Big" })).toBeInTheDocument();
    const main = container.querySelector("main.landing") as HTMLElement;
    expect(main.style.getPropertyValue("--bg")).toBe("#0A1410");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/landing/LandingScene.test.tsx`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement** — `components/landing/LandingScene.tsx`

```tsx
import type { CSSProperties } from "react";
import { themeToCssVars } from "@/lib/theme";
import { WheelClient } from "@/app/[domain]/Wheel.client";
import type { LandingView } from "@/lib/types";

export function LandingScene({ view }: { view: LandingView }) {
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

- [ ] **Step 4: Refactor the public page** — modify `app/[domain]/page.tsx`

Replace the `LandingPage` component body's returned JSX (the `<main className="landing"> ... </main>` block from Plan 1) so it delegates to `LandingScene`. Keep `generateMetadata` and the `notFound()` guard unchanged. Add the import and simplify the return:

```tsx
import { LandingScene } from "@/components/landing/LandingScene";

// ...generateMetadata stays exactly as in Plan 1...

export default async function LandingPage({ params }: Params) {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) notFound();
  return <LandingScene view={view} />;
}
```

> Remove the now-unused `themeToCssVars` / `CSSProperties` imports from `app/[domain]/page.tsx` if they are no longer referenced there (they moved into `LandingScene`). Leave `getLandingByHost`, `notFound`, `buildMetadata`, and `Metadata` imports in place.

- [ ] **Step 5: Implement the preview guard layout** — `app/admin/(preview)/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/auth/session";

export default async function PreviewLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();
  return <>{children}</>;
}
```

- [ ] **Step 6: Implement the preview page** — `app/admin/(preview)/landings/[id]/preview/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { getLandingViewById } from "@/lib/tenant";
import { LandingScene } from "@/components/landing/LandingScene";

type Params = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Params) {
  const { id } = await params;
  const view = await getLandingViewById(id);
  if (!view) notFound();
  return <LandingScene view={view} />;
}
```

- [ ] **Step 7: Run the unit suite and build**

Run: `npm test`
Expected: all unit/component suites PASS (including the new `LandingScene` test and the unchanged Plan 1 suites).

Run: `npm run build`
Expected: build succeeds; routes include `/[domain]`, `/admin/login`, `/admin` (panel), `/admin/landings/[id]`, and `/admin/landings/[id]/preview`. The two route groups produce distinct URLs, so there is no collision.

- [ ] **Step 8: Commit**

```bash
git add components/landing/LandingScene.tsx components/landing/LandingScene.test.tsx "app/[domain]/page.tsx" "app/admin/(preview)/layout.tsx" "app/admin/(preview)/landings/[id]/preview/page.tsx"
git commit -m "feat: draft preview page and shared LandingScene"
```

---

## Task 17: Admin styling

**Files:**
- Modify: `app/admin/admin.css`
- Test: covered by Task 18 (Playwright) + manual review.

**Interfaces:**
- Consumes: the class names used across Tasks 8–16 (`admin`, `admin-bar`, `admin-brand`, `admin-signout`, `admin-main`, `login`, `login-form`, `login-title`, `field`, `err`, `btn-primary`, `btn-secondary`, `dash-head`, `new-landing`, `landings-table`, `status-pill`, `status-draft`, `status-published`, `empty`, `editor-page`, `editor-head`, `back-link`, `editor`, `tabs`, `tab`, `tab.active`, `tab-panel`, `save-row`, `save-msg`, `theme-grid`, `theme-preview`, `theme-preview-card`, `theme-preview-title`, `theme-preview-prize`, `theme-preview-btn`, `assets`, `asset`, `asset-preview`, `prize-list`, `prize-row`, `icon-input`, `weight-input`, `wheel-config`).

- [ ] **Step 1: Replace `app/admin/admin.css`** with the full CMS theme

```css
* { box-sizing: border-box; }

.admin, .login {
  --cms-bg: #0c1410;
  --cms-surface: #15211b;
  --cms-border: #24352c;
  --cms-text: #e7f1ea;
  --cms-muted: #8aa697;
  --cms-accent: #27c24c;
  min-height: 100dvh;
  margin: 0;
  background: var(--cms-bg);
  color: var(--cms-text);
  font-family: var(--font-outfit), system-ui, sans-serif;
}

/* Chrome */
.admin-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-bottom: 1px solid var(--cms-border); background: var(--cms-surface);
}
.admin-brand { color: var(--cms-text); font-weight: 800; text-decoration: none; letter-spacing: -0.3px; }
.admin-signout {
  background: transparent; color: var(--cms-muted); border: 1px solid var(--cms-border);
  border-radius: 8px; padding: 6px 12px; cursor: pointer;
}
.admin-main { max-width: 920px; margin: 0 auto; padding: 28px 24px; }

/* Buttons */
.btn-primary {
  background: var(--cms-accent); color: #04140a; border: none; border-radius: 10px;
  padding: 10px 18px; font-weight: 800; cursor: pointer;
}
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-secondary {
  background: var(--cms-surface); color: var(--cms-text); border: 1px solid var(--cms-border);
  border-radius: 10px; padding: 10px 16px; font-weight: 600; cursor: pointer; text-decoration: none;
}
.err { color: #ff8585; font-size: 14px; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 14px; }
.field > span { color: var(--cms-muted); }
.field input, .field textarea, .field select, .prize-row input {
  background: var(--cms-bg); color: var(--cms-text); border: 1px solid var(--cms-border);
  border-radius: 8px; padding: 9px 11px; font: inherit;
}
.field input[type="color"] { padding: 2px; height: 38px; }

/* Login */
.login { display: grid; place-items: center; }
.login-form {
  width: min(360px, 90vw); background: var(--cms-surface); border: 1px solid var(--cms-border);
  border-radius: 16px; padding: 28px; display: flex; flex-direction: column; gap: 6px;
}
.login-title { margin: 0 0 12px; text-align: center; }

/* Dashboard */
.dash-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
.new-landing { display: flex; gap: 8px; align-items: center; }
.new-landing input { background: var(--cms-bg); color: var(--cms-text); border: 1px solid var(--cms-border); border-radius: 8px; padding: 9px 11px; }
.landings-table { width: 100%; border-collapse: collapse; }
.landings-table th, .landings-table td { text-align: left; padding: 12px 10px; border-bottom: 1px solid var(--cms-border); }
.landings-table a { color: var(--cms-text); font-weight: 700; }
.landings-table .empty { color: var(--cms-muted); text-align: center; padding: 28px; }
.status-pill { font-size: 12px; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.4px; }
.status-draft { background: #3a2f12; color: #f5c24b; }
.status-published { background: #11341f; color: #51e07a; }

/* Editor */
.editor-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 16px; }
.editor-head h1 { margin: 6px 0 0; }
.back-link { color: var(--cms-muted); text-decoration: none; font-size: 14px; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--cms-border); margin-bottom: 20px; }
.tab {
  background: transparent; color: var(--cms-muted); border: none; border-bottom: 2px solid transparent;
  padding: 10px 16px; cursor: pointer; font: inherit; font-weight: 600;
}
.tab.active { color: var(--cms-text); border-bottom-color: var(--cms-accent); }
.tab-panel { max-width: 560px; }
.save-row { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.save-msg { color: var(--cms-muted); font-size: 14px; }

/* Branding */
.theme-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 16px; }
.theme-preview {
  margin: 8px 0 20px; padding: 18px; border-radius: 14px;
  background: var(--bg); border: 1px solid var(--surface);
}
.theme-preview-card { display: flex; align-items: center; gap: 16px; }
.theme-preview-title { font-size: 26px; font-weight: 800; color: var(--text); }
.theme-preview-prize { font-size: 20px; font-weight: 800; color: var(--gold); }
.theme-preview-btn { margin-left: auto; background: var(--accent); color: #04140a; border: none; border-radius: 999px; padding: 8px 18px; font-weight: 800; }
.assets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 12px; }
.asset-preview { max-height: 56px; border-radius: 8px; border: 1px solid var(--cms-border); }

/* Wheel */
.prize-list { display: flex; flex-direction: column; gap: 8px; }
.prize-row { display: flex; align-items: center; gap: 8px; }
.prize-row .icon-input { width: 56px; text-align: center; }
.prize-row .weight-input { width: 72px; }
.prize-row input[type="color"] { width: 40px; height: 36px; padding: 2px; border-radius: 8px; border: 1px solid var(--cms-border); background: var(--cms-bg); }
.prize-row button { background: var(--cms-surface); color: var(--cms-text); border: 1px solid var(--cms-border); border-radius: 8px; width: 34px; height: 34px; cursor: pointer; }
.wheel-config { margin-top: 20px; max-width: 420px; }
```

- [ ] **Step 2: Manually verify the CMS look**

Run: `npm run dev`, then open `http://admin.localhost:3000/admin/login`.
Expected: dark CMS login card. Sign in with the seeded `ADMIN_EMAIL`/`ADMIN_PASSWORD`; the dashboard lists the seeded `Boomzino Demo`; opening it shows the four tabs; the Branding tab's preview swatch reflects the chosen colors; the Preview link opens the full landing.

> Requires `admin.localhost` to resolve. On Linux/macOS add `127.0.0.1 admin.localhost` to `/etc/hosts` if `*.localhost` does not resolve automatically, and ensure `ADMIN_HOST="admin.localhost:3000"` is set (Plan 1's `.env.example`).

- [ ] **Step 3: Commit**

```bash
git add app/admin/admin.css
git commit -m "style: admin cms theme"
```

---

## Task 18: End-to-end admin flow (Playwright)

**Files:**
- Create: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: the running app + seeded admin and `Boomzino Demo` landing (Tasks 3 + Plan 1 seed). Drives labels/roles from Tasks 8–15.

> **Preconditions:** Postgres running; `.env` set with `ADMIN_HOST="admin.localhost:3000"`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`; schema pushed and seeded (`npm run db:push && npm run db:seed`); `admin.localhost` resolves to `127.0.0.1` (add to `/etc/hosts` if needed). The Playwright `webServer` (Plan 1 config) builds and starts the app.

- [ ] **Step 1: Write the E2E test** — `tests/e2e/admin.spec.ts`

```ts
import { test, expect } from "@playwright/test";

const ADMIN = "http://admin.localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL ?? "admin@boomzino.example";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme123";

test("admin logs in, edits the heading, and the landing reflects it", async ({ page }) => {
  // Guard redirects an anonymous visitor to login.
  await page.goto(`${ADMIN}/admin`);
  await expect(page).toHaveURL(/\/admin\/login/);

  // Log in.
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(`${ADMIN}/admin`);

  // Open the seeded landing.
  await page.getByRole("link", { name: "Boomzino Demo" }).click();
  await expect(page.getByTestId("tab-content")).toBeVisible();

  // Edit the heading on the Content tab (default) and save.
  const heading = page.getByLabel("Heading");
  await heading.fill("Spin & Win Big");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  // The public landing (different host) reflects the edit immediately.
  await page.goto("http://localhost:3000/");
  await expect(page.getByRole("heading", { name: "Spin & Win Big" })).toBeVisible();
});

test.afterAll(async () => {
  // Note: this test mutates the seeded heading. Re-run `npm run db:seed`
  // to reset demo data between full E2E runs if needed.
});
```

- [ ] **Step 2: Run the E2E test**

Run: `npm run e2e -- admin.spec.ts`
Expected: 1 passed — anonymous `/admin` redirects to login, login succeeds, the heading edit saves, and the public landing on `localhost:3000` shows `Spin & Win Big`.

- [ ] **Step 3: Reset demo data (optional) and commit**

```bash
npm run db:seed   # restore the original heading
git add tests/e2e/admin.spec.ts
git commit -m "test: e2e admin login, edit, and live landing"
```

---

## Done criteria for Plan 2

- `npm test` — all unit/component suites green (auth, validation, service, routes, all editor components, LandingScene).
- `npm run e2e` — both the Plan 1 landing spec and the new admin spec green.
- `npm run build` — succeeds; both route groups resolve without collision.
- Manually: sign in at `admin.localhost:3000`, create a landing, edit content/branding/wheel/settings, upload an image, publish, and preview; published edits appear on the landing host with no rebuild.
- All work committed in small, per-task commits.

**Next:** Plan 3 adds the **Domains** tab — attach custom domains to a landing via the Vercel Domains API, surface DNS instructions, and poll verification — writing to the `Domain` table this plan already reads (its count is shown on the dashboard).

---

## Self-Review (performed against the spec)

- **Auth (spec §2, §7):** seeded single admin (Task 3), Auth.js Credentials + JWT session (Task 2), every `/admin` page guarded (Tasks 9, 16) and every `/api/admin/*` route 401-guarded (Tasks 6, 7). ✔
- **Dashboard (spec §7):** list with name/domains/status + create (Task 9). ✔
- **Editor tabs (spec §7):** Content (Task 11), Branding incl. uploads + theme + live preview (Task 12), Wheel incl. segment CRUD/reorder, winner, `spinsBeforeWin`, redirect + prize param (Task 13), Settings incl. slug + publish (Task 14). **Domains tab intentionally deferred to Plan 3** (matches Plan 1's scope note). ✔
- **Uploads → Vercel Blob (spec §4, §7):** validation (Task 7) + Blob `put` route (Task 7), wired in Branding (Task 12). ✔
- **Preview (spec §7):** `/admin/.../preview` renders current DB values incl. drafts (Tasks 5 + 16). ✔
- **Instant go-live (spec §1, §3):** mutations write the same tables the SSR landing reads; published edits need no rebuild (verified by Task 18). ✔
- **Error handling (spec §8):** zod 400s on bad input, 401 on missing auth, upload type/size errors, `notFound()` for missing landings, in-form error messages. ✔
- **Testing strategy (spec §9):** unit (validation, service, password, authorize, upload), integration-style route tests with mocked auth/prisma, component tests for every tab, E2E admin login → edit → live. ✔
```
