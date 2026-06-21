export const VERCEL_A_RECORD = "76.76.21.21";
export const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

// One or more dot-separated labels; each 1-63 chars, no leading/trailing hyphen.
const HOSTNAME_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export function isValidHostname(host: string): boolean {
  return HOSTNAME_RE.test(host);
}

export function dnsInstructionsFor(hostname: string): DnsRecord {
  const labels = hostname.split(".");
  if (labels.length <= 2) {
    return { type: "A", name: "@", value: VERCEL_A_RECORD };
  }
  const subdomain = labels.slice(0, labels.length - 2).join(".");
  return { type: "CNAME", name: subdomain, value: VERCEL_CNAME_TARGET };
}
