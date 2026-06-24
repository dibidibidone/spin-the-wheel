export const DOMAIN_STATUSES = [
  "purchasing", "dns_pending", "attaching", "ssl_pending",
  "live", "flagged", "retiring", "retired", "failed",
] as const;

export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

// Non-terminal statuses the reconciler keeps advancing toward `live`.
export const ACTIVE_STATUSES: DomainStatus[] = ["purchasing", "dns_pending", "attaching", "ssl_pending"];

export function isTerminal(s: DomainStatus): boolean {
  return s === "live" || s === "retired" || s === "failed";
}
