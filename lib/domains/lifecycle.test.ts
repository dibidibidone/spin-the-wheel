import { describe, it, expect } from "vitest";
import { nextStep, type LifecycleRecord } from "./lifecycle";

const rec = (status: LifecycleRecord["status"], registrarOrderId: string | null = null): LifecycleRecord =>
  ({ status, registrarOrderId });

describe("nextStep", () => {
  it("buys when purchasing and not yet bought", () => {
    expect(nextStep(rec("purchasing"))).toBe("register");
  });
  it("skips buying when already bought (buy-once guard) and moves to edge", () => {
    expect(nextStep(rec("purchasing", "order-1"))).toBe("provision_edge");
  });
  it("provisions edge, then attaches origin, then verifies", () => {
    expect(nextStep(rec("dns_pending", "o"))).toBe("provision_edge");
    expect(nextStep(rec("attaching", "o"))).toBe("attach_origin");
    expect(nextStep(rec("ssl_pending", "o"))).toBe("verify");
  });
  it("does nothing for terminal/holding statuses", () => {
    for (const s of ["live", "retired", "failed", "flagged", "retiring"] as const) {
      expect(nextStep(rec(s, "o"))).toBe("none");
    }
  });
});
