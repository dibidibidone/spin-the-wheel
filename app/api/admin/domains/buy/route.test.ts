import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin/guard", () => ({ requireApiSession: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/providers", () => ({ providersFromEnv: vi.fn(() => ({})) }));
vi.mock("@/lib/domains/service", () => ({
  purchaseDomainForLanding: vi.fn(async () => "dom-1"),
  advanceDomain: vi.fn(async () => "dns_pending"),
}));

import { POST } from "./route";
import { purchaseDomainForLanding, advanceDomain } from "@/lib/domains/service";

beforeEach(() => vi.clearAllMocks());

describe("POST /api/admin/domains/buy", () => {
  it("400s without landingId + hostname", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({}) }));
    expect(res.status).toBe(400);
  });
  it("purchases then kicks off the first advance", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ landingId: "l1", hostname: "boomzino.click" }) }));
    expect(res.status).toBe(201);
    expect(purchaseDomainForLanding).toHaveBeenCalledWith({}, "l1", "boomzino.click");
    expect(advanceDomain).toHaveBeenCalledWith({}, "dom-1");
    expect(await res.json()).toEqual({ domainId: "dom-1", status: "dns_pending" });
  });
});
