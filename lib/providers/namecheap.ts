import type { NamecheapConfig } from "./config";
import type { Registrar, DomainCandidate, RegisterResult } from "./types";

const PROD = "https://api.namecheap.com/xml.response";
const SANDBOX = "https://api.sandbox.namecheap.com/xml.response";

export class NamecheapError extends Error {
  constructor(message: string) { super(message); this.name = "NamecheapError"; }
}

// Pull an attribute value out of the (small, known) Namecheap XML responses.
function attr(xml: string, tag: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}
function splitDomain(name: string): { sld: string; tld: string } {
  const i = name.indexOf(".");
  return { sld: name.slice(0, i), tld: name.slice(i + 1) };
}

export function createNamecheapRegistrar(config: NamecheapConfig): Registrar {
  const base = config.sandbox ? SANDBOX : PROD;

  async function call(command: string, params: Record<string, string>): Promise<string> {
    const url = new URL(base);
    url.searchParams.set("ApiUser", config.apiUser);
    url.searchParams.set("ApiKey", config.apiKey);
    url.searchParams.set("UserName", config.userName);
    url.searchParams.set("ClientIp", config.clientIp);
    url.searchParams.set("Command", command);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString(), { method: "GET" });
    const body = await res.text();
    if (/Status="ERROR"/i.test(body) || !res.ok) {
      const err = body.match(/<Error[^>]*>([^<]+)<\/Error>/i)?.[1] ?? `Namecheap request failed (${res.status})`;
      throw new NamecheapError(err);
    }
    return body;
  }

  return {
    async checkAvailability(name): Promise<DomainCandidate> {
      const body = await call("namecheap.domains.check", { DomainList: name });
      const available = attr(body, "DomainCheckResult", "Available") === "true";
      const price = Number(attr(body, "DomainCheckResult", "PremiumRegistrationPrice") ?? "0");
      return { name, available, priceUsd: Number.isFinite(price) ? price : 0 };
    },

    async suggest(keyword, tlds): Promise<DomainCandidate[]> {
      // Namecheap has no first-class "suggest"; check `keyword.<tld>` across the requested TLDs.
      const names = tlds.map((t) => `${keyword}.${t.replace(/^\./, "")}`);
      const body = await call("namecheap.domains.check", { DomainList: names.join(",") });
      return names.map((name) => ({
        name,
        available: new RegExp(`Domain="${name}"[^>]*Available="true"`, "i").test(body),
        priceUsd: 0,
      }));
    },

    async register(name): Promise<RegisterResult> {
      const { sld, tld } = splitDomain(name);
      const r = config.registrant;
      const contact = {
        RegistrantFirstName: r.firstName, RegistrantLastName: r.lastName,
        RegistrantAddress1: r.address1, RegistrantCity: r.city, RegistrantStateProvince: r.stateProvince,
        RegistrantPostalCode: r.postalCode, RegistrantCountry: r.country, RegistrantPhone: r.phone,
        RegistrantEmailAddress: r.email,
      };
      // Namecheap requires the same contact for Tech/Admin/AuxBilling.
      const all: Record<string, string> = { DomainName: name, Years: "1" };
      for (const role of ["Registrant", "Tech", "Admin", "AuxBilling"]) {
        for (const [k, v] of Object.entries(contact)) all[k.replace("Registrant", role)] = v;
      }
      const body = await call("namecheap.domains.create", all);
      const orderId = attr(body, "DomainCreateResult", "OrderID");
      if (!orderId || attr(body, "DomainCreateResult", "Registered") !== "true") {
        throw new NamecheapError(`Registration not confirmed for ${name}`);
      }
      const expiresAt = new Date();
      expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
      void sld; void tld; // (split kept for future per-TLD handling)
      return { orderId, expiresAt };
    },

    async setNameservers(name, nameservers): Promise<void> {
      const { sld, tld } = splitDomain(name);
      await call("namecheap.domains.dns.setCustom", { SLD: sld, TLD: tld, Nameservers: nameservers.join(",") });
    },
  };
}
