import type { DomainStatus } from "./status";

// Only the fields the pure decision needs — the service passes a real Domain row.
export type LifecycleRecord = { status: DomainStatus; registrarOrderId: string | null };

export type Step = "register" | "provision_edge" | "attach_origin" | "verify" | "none";

// The single source of truth for "what happens next" given a domain's persisted status.
// The buy-once guard lives here: a `purchasing` row that already has an order skips `register`.
export function nextStep(d: LifecycleRecord): Step {
  switch (d.status) {
    case "purchasing":
      return d.registrarOrderId ? "provision_edge" : "register";
    case "dns_pending":
      return "provision_edge";
    case "attaching":
      return "attach_origin";
    case "ssl_pending":
      return "verify";
    default:
      return "none";
  }
}
