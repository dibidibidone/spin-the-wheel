import type { RegistrantContact, OriginTarget } from "./types";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export type NamecheapConfig = {
  apiUser: string; apiKey: string; userName: string; clientIp: string;
  sandbox: boolean; registrant: RegistrantContact;
};

export function namecheapConfigFromEnv(): NamecheapConfig {
  return {
    apiUser: req("NAMECHEAP_API_USER"),
    apiKey: req("NAMECHEAP_API_KEY"),
    userName: req("NAMECHEAP_USERNAME"),
    clientIp: req("NAMECHEAP_CLIENT_IP"),
    sandbox: process.env.NAMECHEAP_SANDBOX === "true",
    registrant: {
      firstName: req("REGISTRANT_FIRST_NAME"),
      lastName: req("REGISTRANT_LAST_NAME"),
      address1: req("REGISTRANT_ADDRESS1"),
      city: req("REGISTRANT_CITY"),
      stateProvince: req("REGISTRANT_STATE"),
      postalCode: req("REGISTRANT_POSTAL"),
      country: req("REGISTRANT_COUNTRY"),
      phone: req("REGISTRANT_PHONE"),
      email: req("REGISTRANT_EMAIL"),
    },
  };
}

export type CloudflareConfig = { apiToken: string; accountId: string };

export function cloudflareConfigFromEnv(): CloudflareConfig {
  return { apiToken: req("CLOUDFLARE_API_TOKEN"), accountId: req("CLOUDFLARE_ACCOUNT_ID") };
}

// Phase 0: the public A target for fresh apex domains. Defaults to Vercel's anycast IP.
export function originTargetFromEnv(): OriginTarget {
  return { ip: process.env.ORIGIN_DNS_TARGET || "76.76.21.21" };
}
