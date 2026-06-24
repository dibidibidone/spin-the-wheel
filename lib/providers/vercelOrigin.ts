import { attachDomain, verifyDomain, removeDomain, type VercelConfig } from "@/lib/vercel";
import type { OriginAttach, AttachStatus } from "./types";

// Phase 0 origin: attach each hostname to the single Vercel project. (Phase 1 replaces this
// with a no-op adapter — a VPS routes any Host header, so no per-domain origin step.)
export function createVercelOrigin(config: VercelConfig): OriginAttach {
  return {
    async attach(hostname): Promise<AttachStatus> {
      const r = await attachDomain(config, hostname);
      return { verified: r.verified };
    },
    async verify(hostname): Promise<AttachStatus> {
      const r = await verifyDomain(config, hostname);
      return { verified: r.verified };
    },
    async detach(hostname): Promise<void> {
      await removeDomain(config, hostname);
    },
  };
}
