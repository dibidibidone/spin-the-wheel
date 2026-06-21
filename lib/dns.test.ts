import { describe, it, expect } from "vitest";
import {
  normalizeHostname,
  isValidHostname,
  dnsInstructionsFor,
  VERCEL_A_RECORD,
  VERCEL_CNAME_TARGET,
} from "@/lib/dns";

describe("normalizeHostname", () => {
  it("lowercases and strips scheme, path, and port", () => {
    expect(normalizeHostname("  HTTPS://Promo.Boomzino.com:443/win?x=1 ")).toBe("promo.boomzino.com");
    expect(normalizeHostname("boomzino.com")).toBe("boomzino.com");
  });
});

describe("isValidHostname", () => {
  it("accepts multi-label hostnames", () => {
    expect(isValidHostname("boomzino.com")).toBe(true);
    expect(isValidHostname("promo.boomzino.com")).toBe(true);
  });

  it("rejects single labels, bad characters, and leading/trailing hyphens", () => {
    expect(isValidHostname("localhost")).toBe(false);
    expect(isValidHostname("bad_underscore.com")).toBe(false);
    expect(isValidHostname("-bad.com")).toBe(false);
    expect(isValidHostname("bad-.com")).toBe(false);
  });
});

describe("dnsInstructionsFor", () => {
  it("returns an apex A record for two-label domains", () => {
    expect(dnsInstructionsFor("boomzino.com")).toEqual({
      type: "A",
      name: "@",
      value: VERCEL_A_RECORD,
    });
  });

  it("returns a CNAME for sub-domains, with the sub-domain as the record name", () => {
    expect(dnsInstructionsFor("promo.boomzino.com")).toEqual({
      type: "CNAME",
      name: "promo",
      value: VERCEL_CNAME_TARGET,
    });
    expect(dnsInstructionsFor("a.b.boomzino.com")).toEqual({
      type: "CNAME",
      name: "a.b",
      value: VERCEL_CNAME_TARGET,
    });
  });
});
