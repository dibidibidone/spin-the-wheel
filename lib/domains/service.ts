import { prisma } from "@/lib/db";
import type { Providers } from "@/lib/providers/types";
import { nextStep } from "./lifecycle";
import type { DomainStatus } from "./status";

export async function purchaseDomainForLanding(
  _providers: Providers, landingId: string, hostname: string,
): Promise<string> {
  const row = await prisma.domain.create({
    data: { landingId, hostname, status: "purchasing", registrar: "namecheap", edgeProvider: "cloudflare", registrarOrderId: null, nameservers: [], verified: false },
  });
  return row.id;
}

export async function advanceDomain(providers: Providers, domainId: string): Promise<DomainStatus> {
  const d = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!d) throw new Error(`Domain not found: ${domainId}`);
  const status = d.status as DomainStatus;

  try {
    const step = nextStep({ status, registrarOrderId: d.registrarOrderId });
    switch (step) {
      case "register": {
        const r = await providers.registrar.register(d.hostname);
        return persist(domainId, { status: "dns_pending", registrarOrderId: r.orderId, expiresAt: r.expiresAt });
      }
      case "provision_edge": {
        const zone = await providers.edge.createZone(d.hostname);
        await providers.registrar.setNameservers(d.hostname, zone.nameservers);
        const target = providers.originTarget;
        const record = target.cname
          ? { type: "CNAME" as const, name: d.hostname, content: target.cname, proxied: false }
          : { type: "A" as const, name: d.hostname, content: target.ip ?? "", proxied: false };
        await providers.edge.upsertRecords(zone.zoneId, [record]);
        return persist(domainId, { status: "attaching", edgeZoneId: zone.zoneId, nameservers: zone.nameservers });
      }
      case "attach_origin": {
        const a = await providers.origin.attach(d.hostname);
        return persist(domainId, { status: "ssl_pending", verified: a.verified, vercelStatus: a.verified ? "verified" : "pending" });
      }
      case "verify": {
        const ssl = d.edgeZoneId ? await providers.edge.ensureSsl(d.edgeZoneId) : "none";
        const att = await providers.origin.verify(d.hostname);
        if (ssl === "active" && att.verified) {
          const out = await persist(domainId, { status: "live", sslStatus: ssl, verified: true, vercelStatus: "verified", lastCheckedAt: new Date() });
          await prisma.landing.update({ where: { id: d.landingId }, data: { primaryDomainId: domainId } });
          return out;
        }
        return persist(domainId, { status: "ssl_pending", sslStatus: ssl, verified: att.verified, lastCheckedAt: new Date() });
      }
      default:
        return status; // terminal / holding — nothing to do
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return persist(domainId, { status: "failed", statusReason: reason });
  }
}

async function persist(id: string, data: Record<string, unknown>): Promise<DomainStatus> {
  const row = await prisma.domain.update({ where: { id }, data });
  return row.status as DomainStatus;
}
