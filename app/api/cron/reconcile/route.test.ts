import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/domains/reconcile", () => ({ reconcilePending: vi.fn(async () => ({ advanced: 3 })) }));
vi.mock("@/lib/providers", () => ({ providersFromEnv: vi.fn(() => ({})) }));

import { GET } from "./route";
import { reconcilePending } from "@/lib/domains/reconcile";

beforeEach(() => { process.env.CRON_SECRET = "secret"; vi.clearAllMocks(); });

describe("GET /api/cron/reconcile", () => {
  it("rejects without the cron secret", async () => {
    const res = await GET(new Request("http://x/api/cron/reconcile"));
    expect(res.status).toBe(401);
    expect(reconcilePending).not.toHaveBeenCalled();
  });
  it("runs the reconciler with the bearer secret", async () => {
    const res = await GET(new Request("http://x/api/cron/reconcile", { headers: { authorization: "Bearer secret" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ advanced: 3 });
  });
});
