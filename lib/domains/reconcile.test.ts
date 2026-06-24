import { describe, it, expect, vi, beforeEach } from "vitest";

const db: { domains: any[] } = { domains: [] };
vi.mock("@/lib/db", () => ({
  prisma: { domain: { findMany: vi.fn(async ({ where }: any) => db.domains.filter((d) => where.status.in.includes(d.status))) } },
}));
vi.mock("./service", () => ({ advanceDomain: vi.fn(async (_p, id) => { const d = db.domains.find((x) => x.id === id); d.status = "live"; return "live"; }) }));

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
});
