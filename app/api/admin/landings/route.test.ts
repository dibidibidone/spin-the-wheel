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
