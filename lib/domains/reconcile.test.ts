import { describe, it, expect, vi, beforeEach } from "vitest";

const db: { domains: any[] } = { domains: [] };
vi.mock("@/lib/db", () => ({
  prisma: { domain: { findMany: vi.fn(async ({ where }: any) => db.domains.filter((d) => where.status.in.includes(d.status))) } },
}));
vi.mock("./service", () => ({
  advanceDomain: vi.fn(async (_p: any, id: any) => {
    const d = db.domains.find((x) => x.id === id);
    d.status = "live";
    return "live";
  }),
}));

import { reconcilePending } from "./reconcile";
import { advanceDomain } from "./service";

beforeEach(() => { db.domains = []; vi.clearAllMocks(); });

describe("reconcilePending", () => {
  it("advances every active domain and skips terminal ones", async () => {
    db.domains = [
      { id: "a", status: "ssl_pending" }, { id: "b", status: "dns_pending" }, { id: "c", status: "live" },
    ];
    const res = await reconcilePending({} as any);
    expect(res.advanced).toBe(2);
    expect(advanceDomain).toHaveBeenCalledTimes(2);
  });

  it("only counts a row as advanced when its status actually changed", async () => {
    // Mock returns the same status ("dns_pending") as if no transition happened.
    vi.mocked(advanceDomain).mockImplementation(async (_p, id) => {
      const d = db.domains.find((x) => x.id === id);
      // don't change status — advance was a no-op
      return d.status as any;
    });
    db.domains = [{ id: "a", status: "dns_pending" }, { id: "b", status: "attaching" }];
    const res = await reconcilePending({} as any);
    expect(res.advanced).toBe(0);
  });

  it("skips errored rows and continues the pass without aborting", async () => {
    db.domains = [{ id: "a", status: "dns_pending" }, { id: "b", status: "ssl_pending" }];
    // First call throws (simulates a row deleted mid-pass); second call succeeds.
    vi.mocked(advanceDomain)
      .mockRejectedValueOnce(new Error("Domain not found: a"))
      .mockImplementationOnce(async (_p, id) => {
        const d = db.domains.find((x) => x.id === id);
        d.status = "live";
        return "live";
      });
    const res = await reconcilePending({} as any);
    // "a" threw → not counted; "b" advanced (ssl_pending → live) → counted
    expect(res.advanced).toBe(1);
    expect(advanceDomain).toHaveBeenCalledTimes(2);
  });
});
