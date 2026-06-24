import { prisma } from "@/lib/db";
import type { Providers } from "@/lib/providers/types";
import { nextStep } from "./lifecycle";
import type { DomainStatus } from "./status";
import { isTerminal } from "./status";

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
          // Only set the primary pointer if the landing has none yet — a second "buy" must
          // not steal the pointer from an already-established primary domain.
          const existingLanding = await prisma.landing.findUnique({ where: { id: d.landingId }, select: { primaryDomainId: true } });
          if (!existingLanding?.primaryDomainId) {
            await prisma.landing.update({ where: { id: d.landingId }, data: { primaryDomainId: domainId } });
          }
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

export async function flagDomain(domainId: string, reason: string): Promise<void> {
  await prisma.domain.update({ where: { id: domainId }, data: { status: "flagged", statusReason: reason } });
}

export async function retireDomain(providers: Providers, domainId: string): Promise<void> {
  const d = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!d) return;
  await prisma.domain.update({ where: { id: domainId }, data: { status: "retiring" } });

  // If this domain is the landing's primary, clear the pointer before tearing down.
  const landingRow = await prisma.landing.findUnique({ where: { id: d.landingId }, select: { primaryDomainId: true } });
  if (landingRow?.primaryDomainId === domainId) {
    await prisma.landing.update({ where: { id: d.landingId }, data: { primaryDomainId: null } });
  }

  if (d.edgeZoneId) {
    await providers.edge.deleteZone(d.edgeZoneId).catch((err: unknown) => {
      if (!isAlreadyGone(err)) {
        const reason = err instanceof Error ? err.message : String(err);
        return prisma.domain.update({ where: { id: domainId }, data: { statusReason: reason } });
      }
    });
  }
  await providers.origin.detach(d.hostname).catch((err: unknown) => {
    if (!isAlreadyGone(err)) {
      const reason = err instanceof Error ? err.message : String(err);
      return prisma.domain.update({ where: { id: domainId }, data: { statusReason: reason } });
    }
  });
  await prisma.domain.update({ where: { id: domainId }, data: { status: "retired", retiredAt: new Date() } });
}

function isAlreadyGone(err: unknown): boolean {
  return (typeof err === "object" && err !== null && "status" in err && (err as { status: number }).status === 404);
}

// Zero-downtime swap: the old domain keeps serving until the new one is fully live.
export async function rotateDomain(providers: Providers, landingId: string, newHostname: string): Promise<string> {
  const newId = await purchaseDomainForLanding(providers, landingId, newHostname);
  // Drive to a terminal status (live or failed). Bounded by the number of lifecycle steps.
  for (let i = 0; i < 6; i++) {
    const status = await advanceDomain(providers, newId);
    if (isTerminal(status)) break;
  }
  const fresh = await prisma.domain.findUnique({ where: { id: newId } });
  if (fresh?.status !== "live") throw new Error(`Rotation failed: new domain ${newHostname} is ${fresh?.status}`);

  // Atomic read+write of the primary pointer to close the TOCTOU window.
  // Network calls (retireDomain) happen OUTSIDE the transaction.
  const oldPrimaryId = await prisma.$transaction(async (tx) => {
    const landing = await tx.landing.findUnique({ where: { id: landingId }, select: { primaryDomainId: true } });
    const old = landing?.primaryDomainId ?? null;
    await tx.landing.update({ where: { id: landingId }, data: { primaryDomainId: newId } });
    return old;
  });

  if (oldPrimaryId && oldPrimaryId !== newId) await retireDomain(providers, oldPrimaryId);
  return newId;
}
