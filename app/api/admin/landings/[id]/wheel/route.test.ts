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
