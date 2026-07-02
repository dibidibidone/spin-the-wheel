import { describe, it, expect, vi, beforeEach } from "vitest";

const requireApiSession = vi.fn();
vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));
const getFunnelStats = vi.fn();
vi.mock("@/lib/admin/statsService", () => ({ getFunnelStats: (f: unknown) => getFunnelStats(f) }));

import { GET } from "./route";

const authed = { ok: true, session: { user: {} } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
const url = (qs: string) => new Request(`http://admin.local/api/admin/stats${qs}`);

beforeEach(() => { requireApiSession.mockReset(); getFunnelStats.mockReset(); getFunnelStats.mockResolvedValue([]); });

describe("GET /api/admin/stats", () => {
  it("401 without a session", async () => {
    requireApiSession.mockResolvedValue(denied);
    expect((await GET(url(""))).status).toBe(401);
    expect(getFunnelStats).not.toHaveBeenCalled();
  });

  it("passes parsed filters (landingId=all dropped; from/to parsed to Dates)", async () => {
    requireApiSession.mockResolvedValue(authed);
    await GET(url("?landingId=all&from=2026-06-01T00:00:00.000Z&to=2026-07-01T00:00:00.000Z"));
    const f = getFunnelStats.mock.calls[0][0];
    expect(f.landingId).toBeUndefined();
    expect(f.from).toBeInstanceOf(Date);
    expect(f.to.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("keeps a concrete landingId and returns the stats json", async () => {
    requireApiSession.mockResolvedValue(authed);
    getFunnelStats.mockResolvedValue([{ landingId: "l1", name: "Promo", visits: 1, downloads: 0, opens: 0, visitToDownloadPct: 0, downloadToOpenPct: 0, visitToOpenPct: 0 }]);
    const res = await GET(url("?landingId=l1"));
    expect(res.status).toBe(200);
    expect(getFunnelStats.mock.calls[0][0].landingId).toBe("l1");
    await expect(res.json()).resolves.toHaveLength(1);
  });

  it("400 on an invalid date", async () => {
    requireApiSession.mockResolvedValue(authed);
    expect((await GET(url("?from=not-a-date"))).status).toBe(400);
  });
});
