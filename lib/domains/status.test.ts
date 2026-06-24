import { describe, it, expect } from "vitest";
import { DOMAIN_STATUSES, ACTIVE_STATUSES, isTerminal } from "./status";

describe("domain status vocabulary", () => {
  it("includes every lifecycle status", () => {
    expect(DOMAIN_STATUSES).toEqual([
      "purchasing", "dns_pending", "attaching", "ssl_pending",
      "live", "flagged", "retiring", "retired", "failed",
    ]);
  });
  it("marks live/retired/failed terminal and the rest non-terminal", () => {
    expect(isTerminal("live")).toBe(true);
    expect(isTerminal("retired")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("ssl_pending")).toBe(false);
  });
  it("active statuses are exactly the ones the reconciler advances", () => {
    expect(ACTIVE_STATUSES).toEqual(["purchasing", "dns_pending", "attaching", "ssl_pending"]);
  });
});
