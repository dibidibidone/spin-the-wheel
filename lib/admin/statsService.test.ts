import { describe, it, expect, vi, beforeEach } from "vitest";

const { $queryRaw } = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw } }));

import { computeFunnel, getFunnelStats } from "./statsService";

beforeEach(() => $queryRaw.mockReset());

describe("computeFunnel", () => {
  it("computes the three conversion rates, rounded to one decimal", () => {
    const [r] = computeFunnel([{ landingId: "l1", name: "Promo", visits: 200, downloads: 50, opens: 10 }]);
    expect(r.visitToDownloadPct).toBe(25);     // 50/200
    expect(r.downloadToOpenPct).toBe(20);      // 10/50
    expect(r.visitToOpenPct).toBe(5);          // 10/200
  });

  it("returns 0 for every rate when there are zero visits/downloads (no divide-by-zero)", () => {
    const [r] = computeFunnel([{ landingId: "l2", name: "Empty", visits: 0, downloads: 0, opens: 0 }]);
    expect([r.visitToDownloadPct, r.downloadToOpenPct, r.visitToOpenPct]).toEqual([0, 0, 0]);
  });
});

describe("getFunnelStats", () => {
  it("maps bigint counts to numbers and applies computeFunnel", async () => {
    $queryRaw.mockResolvedValue([{ landingId: "l1", name: "Promo", visits: 200n, downloads: 50n, opens: 10n }]);
    const rows = await getFunnelStats({});
    expect(rows).toEqual([
      { landingId: "l1", name: "Promo", visits: 200, downloads: 50, opens: 10,
        visitToDownloadPct: 25, downloadToOpenPct: 20, visitToOpenPct: 5 },
    ]);
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });
});
