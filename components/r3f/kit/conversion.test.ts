import { describe, it, expect } from "vitest";
import { withConversionDefaults } from "./conversion";

describe("withConversionDefaults", () => {
  it("fills defaults when given an empty partial", () => {
    const c = withConversionDefaults({});
    expect(c.registerField).toBe("email");
    expect(c.urgencyMs).toBe(600_000);
    expect(c.claimLabel).toMatch(/claim/i);
    expect(Array.isArray(c.social.winners)).toBe(true);
    expect(c.social.winners.length).toBeGreaterThan(0);
    expect(c.trust).toMatch(/18\+/);
  });

  it("overrides only the provided fields", () => {
    const c = withConversionDefaults({ prize: "500 Free Spins", registerField: "tel" });
    expect(c.prize).toBe("500 Free Spins");
    expect(c.registerField).toBe("tel");
    expect(c.urgencyMs).toBe(600_000); // still default
  });

  it("applies a provided social object over the defaults", () => {
    const winners = [{ name: "Zoe", amount: "€9", minutesAgo: 3 }];
    const c = withConversionDefaults({ social: { winners, todayCount: 99 } });
    expect(c.social.todayCount).toBe(99);
    expect(c.social.winners).toEqual(winners);
    expect(c.urgencyMs).toBe(600_000); // unrelated defaults intact
  });
});
