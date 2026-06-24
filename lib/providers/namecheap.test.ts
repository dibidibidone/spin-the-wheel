import { describe, it, expect, vi, afterEach } from "vitest";
import { createNamecheapRegistrar } from "./namecheap";
import type { NamecheapConfig } from "./config";

const config: NamecheapConfig = {
  apiUser: "u", apiKey: "k", userName: "u", clientIp: "1.2.3.4", sandbox: true,
  registrant: { firstName: "A", lastName: "B", address1: "1 St", city: "C", stateProvince: "S",
    postalCode: "00000", country: "US", phone: "+1.5550000000", email: "a@b.test" },
};

const xml = (inner: string) =>
  `<?xml version="1.0"?><ApiResponse Status="OK" xmlns="http://api.namecheap.com/xml.response">${inner}</ApiResponse>`;

let calls: { url: string; body: string | null }[];
function mockFetch(responseXml: string) {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: (init?.body as string) ?? null });
    return new Response(responseXml, { status: 200 });
  }));
}
afterEach(() => vi.unstubAllGlobals());

describe("namecheap registrar", () => {
  it("checkAvailability parses availability + price", async () => {
    mockFetch(xml(
      `<CommandResponse><DomainCheckResult Domain="boomzino.click" Available="true" PremiumRegistrationPrice="0.0"/></CommandResponse>`
    ));
    const r = createNamecheapRegistrar(config);
    const c = await r.checkAvailability("boomzino.click");
    expect(c).toMatchObject({ name: "boomzino.click", available: true });
    expect(calls[0].url).toContain("sandbox.namecheap.com");
    expect(calls[0].url).toContain("Command=namecheap.domains.check");
  });

  it("register parses the order id and returns an expiry one year out", async () => {
    mockFetch(xml(
      `<CommandResponse><DomainCreateResult Domain="boomzino.click" Registered="true" OrderID="12345" ChargedAmount="9.06"/></CommandResponse>`
    ));
    const r = createNamecheapRegistrar(config);
    const res = await r.register("boomzino.click");
    expect(res.orderId).toBe("12345");
    expect(res.expiresAt.getUTCFullYear()).toBe(new Date().getUTCFullYear() + 1);
    expect(calls[0].url).toContain("Command=namecheap.domains.create");
    expect(calls[0].url).toContain("RegistrantFirstName=A");
  });

  it("throws on an API error response", async () => {
    mockFetch(
      `<?xml version="1.0"?><ApiResponse Status="ERROR"><Errors><Error Number="2030280">Domain taken</Error></Errors></ApiResponse>`
    );
    const r = createNamecheapRegistrar(config);
    await expect(r.register("taken.com")).rejects.toThrow(/Domain taken/);
  });

  it("setNameservers calls domains.dns.setCustom with the NS list", async () => {
    mockFetch(xml(`<CommandResponse><DomainDNSSetCustomResult Domain="boomzino.click" Updated="true"/></CommandResponse>`));
    const r = createNamecheapRegistrar(config);
    await r.setNameservers("boomzino.click", ["dana.ns.cloudflare.com", "rob.ns.cloudflare.com"]);
    expect(calls[0].url).toContain("Command=namecheap.domains.dns.setCustom");
    expect(calls[0].url).toContain("Nameservers=dana.ns.cloudflare.com%2Crob.ns.cloudflare.com");
  });
});
