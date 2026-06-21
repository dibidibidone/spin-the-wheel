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
