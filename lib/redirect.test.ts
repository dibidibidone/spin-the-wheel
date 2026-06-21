import { describe, it, expect } from "vitest";
import { buildRedirectUrl } from "@/lib/redirect";

describe("buildRedirectUrl", () => {
  it("returns the url unchanged when no prize param is configured", () => {
    expect(buildRedirectUrl("https://casino.com/signup", null, "100 Free Spins"))
      .toBe("https://casino.com/signup");
  });

  it("appends the encoded prize as a query param", () => {
    expect(buildRedirectUrl("https://casino.com/signup", "bonus", "100 Free Spins"))
      .toBe("https://casino.com/signup?bonus=100+Free+Spins");
  });

  it("uses & when the url already has a query string", () => {
    expect(buildRedirectUrl("https://casino.com/signup?ref=promo1", "bonus", "€20"))
      .toBe("https://casino.com/signup?ref=promo1&bonus=%E2%82%AC20");
  });
});
