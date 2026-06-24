import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { namecheapConfigFromEnv, cloudflareConfigFromEnv, originTargetFromEnv } from "./config";

const saved = { ...process.env };
beforeEach(() => { process.env = { ...saved }; });
afterEach(() => { process.env = { ...saved }; });

describe("namecheapConfigFromEnv", () => {
  it("throws when a required var is missing", () => {
    Object.assign(process.env, {
      NAMECHEAP_API_USER: "u", NAMECHEAP_USERNAME: "u",
      NAMECHEAP_CLIENT_IP: "1.2.3.4", NAMECHEAP_SANDBOX: "true",
      REGISTRANT_FIRST_NAME: "A", REGISTRANT_LAST_NAME: "B", REGISTRANT_ADDRESS1: "1 St",
      REGISTRANT_CITY: "C", REGISTRANT_STATE: "S", REGISTRANT_POSTAL: "00000",
      REGISTRANT_COUNTRY: "US", REGISTRANT_PHONE: "+1.5550000000", REGISTRANT_EMAIL: "a@b.test",
    });
    delete process.env.NAMECHEAP_API_KEY;
    expect(() => namecheapConfigFromEnv()).toThrow(/NAMECHEAP_API_KEY/);
  });
  it("parses the sandbox flag and registrant contact", () => {
    Object.assign(process.env, {
      NAMECHEAP_API_USER: "u", NAMECHEAP_API_KEY: "k", NAMECHEAP_USERNAME: "u",
      NAMECHEAP_CLIENT_IP: "1.2.3.4", NAMECHEAP_SANDBOX: "true",
      REGISTRANT_FIRST_NAME: "A", REGISTRANT_LAST_NAME: "B", REGISTRANT_ADDRESS1: "1 St",
      REGISTRANT_CITY: "C", REGISTRANT_STATE: "S", REGISTRANT_POSTAL: "00000",
      REGISTRANT_COUNTRY: "US", REGISTRANT_PHONE: "+1.5550000000", REGISTRANT_EMAIL: "a@b.test",
    });
    const c = namecheapConfigFromEnv();
    expect(c.sandbox).toBe(true);
    expect(c.clientIp).toBe("1.2.3.4");
    expect(c.registrant.country).toBe("US");
  });
});

describe("originTargetFromEnv", () => {
  it("defaults to the Vercel anycast A record when unset", () => {
    delete process.env.ORIGIN_DNS_TARGET;
    expect(originTargetFromEnv()).toEqual({ ip: "76.76.21.21" });
  });
  it("uses an explicit A target", () => {
    process.env.ORIGIN_DNS_TARGET = "203.0.113.7";
    expect(originTargetFromEnv()).toEqual({ ip: "203.0.113.7" });
  });
});

describe("cloudflareConfigFromEnv", () => {
  it("throws when token missing", () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    expect(() => cloudflareConfigFromEnv()).toThrow(/CLOUDFLARE_API_TOKEN/);
  });
});
