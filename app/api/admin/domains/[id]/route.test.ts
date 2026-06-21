import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));

const { removeDomain, refreshDomain } = vi.hoisted(() => ({
  removeDomain: vi.fn(),
  refreshDomain: vi.fn(),
}));
vi.mock("@/lib/domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/domains")>();
  return { ...actual, removeDomain, refreshDomain };
});

vi.mock("@/lib/vercel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vercel")>();
  return { ...actual, vercelConfigFromEnv: () => ({ token: "t", projectId: "p" }) };
});

import { DELETE } from "@/app/api/admin/domains/[id]/route";
import { POST } from "@/app/api/admin/domains/[id]/verify/route";

const authed = { ok: true, session: { user: { email: "admin@x.com" } } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  requireApiSession.mockReset().mockResolvedValue(authed);
  removeDomain.mockReset().mockResolvedValue(undefined);
  refreshDomain.mockReset();
});

describe("DELETE /api/admin/domains/[id]", () => {
  it("401s when not authenticated", async () => {
    requireApiSession.mockResolvedValue(denied);
    const res = await DELETE(new Request("http://admin.local/x", { method: "DELETE" }), params("d1"));
    expect(res.status).toBe(401);
  });

  it("removes the domain and returns 204", async () => {
    const res = await DELETE(new Request("http://admin.local/x", { method: "DELETE" }), params("d1"));
    expect(res.status).toBe(204);
    expect(removeDomain).toHaveBeenCalledWith("d1", { token: "t", projectId: "p" });
  });
});

describe("POST /api/admin/domains/[id]/verify", () => {
  it("401s when not authenticated", async () => {
    requireApiSession.mockResolvedValue(denied);
    const res = await POST(new Request("http://admin.local/x", { method: "POST" }), params("d1"));
    expect(res.status).toBe(401);
  });

  it("re-checks verification and returns the updated domain", async () => {
    refreshDomain.mockResolvedValue({ id: "d1", hostname: "promo.com", verified: true });
    const res = await POST(new Request("http://admin.local/x", { method: "POST" }), params("d1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ domain: { id: "d1", hostname: "promo.com", verified: true } });
    expect(refreshDomain).toHaveBeenCalledWith("d1", { token: "t", projectId: "p" });
  });
});
