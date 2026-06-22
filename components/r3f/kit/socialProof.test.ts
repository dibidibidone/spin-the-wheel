import { describe, it, expect } from "vitest";
import { formatWinner, nextIndex } from "./socialProof";

describe("socialProof", () => {
  it("formats a winner line deterministically", () => {
    expect(formatWinner({ name: "Aisha", amount: "€200", minutesAgo: 2 })).toBe("🔥 Aisha won €200 · 2m ago");
  });

  it("uses 'just now' for zero minutes", () => {
    expect(formatWinner({ name: "Eva", amount: "€50", minutesAgo: 0 })).toBe("🔥 Eva won €50 · just now");
  });

  it("rotates the index and wraps", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(0, 0)).toBe(0);
  });
});
