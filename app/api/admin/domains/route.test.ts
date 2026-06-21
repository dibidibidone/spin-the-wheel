import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));

const { addDomain, listDomains } = vi.hoisted(() => ({
  addDomain: vi.fn(),
  listDomains: vi.fn(),
}));
vi.mock("@/lib/domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domains")>();
  return { ...actual, addDomain, listDomains };
});

vi.mock("@/lib/vercel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vercel")>();
  return { ...actual, vercelConfigFromEnv: () => ({ token: "t", projectId: "p" }) };
});

import { GET, POST } from "@/app/api/admin/domains/route";
import { InvalidHostnameError } from "@/lib/domains";
import { VercelApiError } from "@/lib/vercel";

const authed = { ok: true, session: { user: { email: "admin@x.com" } } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

function postReq(body: unknown) {
  return new Request("http://admin.local/api/admin/domains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  requireApiSession.mockReset().mockResolvedValue(authed);
  addDomain.mockReset();
  listDomains.mockReset();
});

describe("GET /api/admin/domains", () => {
  it("401s when not authenticated", async () => {
    requireApiSession.mockResolvedValue(denied);
    const res = await GET(new Request("http://admin.local/api/admin/domains?landingId=L1"));
    expect(res.status).toBe(401);
  });

  it("400s without a landingId", async () => {
    const res = await GET(new Request("http://admin.local/api/admin/domains"));
    expect(res.status).toBe(400);
  });

  it("returns the landing's domains", async () => {
    listDomains.mockResolvedValue([{ id: "d1", hostname: "promo.com" }]);
    const res = await GET(new Request("http://admin.local/api/admin/domains?landingId=L1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ domains: [{ id: "d1", hostname: "promo.com" }] });
    expect(listDomains).toHaveBeenCalledWith("L1");
  });
});

describe("POST /api/admin/domains", () => {
  it("401s when not authenticated", async () => {
    requireApiSession.mockResolvedValue(denied);
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(401);
  });

  it("400s when fields are missing", async () => {
    const res = await POST(postReq({ landingId: "L1" }));
    expect(res.status).toBe(400);
  });

  it("creates a domain and returns 201", async () => {
    addDomain.mockResolvedValue({ id: "d1", hostname: "promo.com", verified: false });
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ domain: { id: "d1", hostname: "promo.com", verified: false } });
    expect(addDomain).toHaveBeenCalledWith("L1", "promo.com", { token: "t", projectId: "p" });
  });

  it("maps an invalid hostname to 400", async () => {
    addDomain.mockRejectedValue(new InvalidHostnameError("bad"));
    const res = await POST(postReq({ landingId: "L1", hostname: "bad" }));
    expect(res.status).toBe(400);
  });

  it("maps a duplicate (Prisma P2002) to 409", async () => {
    addDomain.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(409);
  });

  it("maps a Vercel API error to 502", async () => {
    addDomain.mockRejectedValue(new VercelApiError(403, "forbidden", "no access"));
    const res = await POST(postReq({ landingId: "L1", hostname: "promo.com" }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/no access/);
  });
});
