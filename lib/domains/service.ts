import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
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
        // IMPORTANT 3: double-buy guard — if the sentinel is already set, a previous register()
        // call succeeded but the persist of registrarOrderId crashed. Mark failed for manual check.
        if (d.statusReason === "registering") {
          return persist(domainId, {
            status: "failed",
            statusReason: "register crashed before orderId was saved; check registrar and update registrarOrderId manually",
          });
        }
        // Write sentinel before calling the external API — if we crash here, the next advance
        // sees "registering" and does NOT call register() again.
        await persist(domainId, { statusReason: "registering" });
        const r = await providers.registrar.register(d.hostname);
        return persist(domainId, { status: "dns_pending", registrarOrderId: r.orderId, expiresAt: r.expiresAt, statusReason: null });
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
        // IMPORTANT 4: Phase-0 is DNS-only (gray-cloud); Vercel serves the cert.
        // Gate go-live on Vercel origin verification only — not on Cloudflare ensureSsl.
        const att = await providers.origin.verify(d.hostname);
        if (att.verified) {
          const out = await persist(domainId, { status: "live", verified: true, vercelStatus: "verified", lastCheckedAt: new Date() });
          await prisma.landing.update({ where: { id: d.landingId }, data: { primaryDomainId: domainId } });
          return out;
        }
        return persist(domainId, { status: "ssl_pending", verified: att.verified, lastCheckedAt: new Date() });
      }
      default:
        return status; // terminal / holding — nothing to do
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return persist(domainId, { status: "failed", statusReason: reason });
  }
}

// IMPORTANT 2: Retry a failed domain by deriving the correct resume status from persisted fields.
export async function retryDomain(providers: Providers, domainId: string): Promise<DomainStatus> {
  const d = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!d) throw new Error(`Domain not found: ${domainId}`);
  if (d.status !== "failed") throw new Error(`retryDomain called on non-failed domain ${domainId}: ${d.status}`);

  // Walk through lifecycle milestones (most advanced first) to find where to resume.
  let resumeStatus: DomainStatus;
  if (d.verified) {
    resumeStatus = "ssl_pending";
  } else if (d.edgeZoneId || (d.nameservers && d.nameservers.length > 0)) {
    resumeStatus = "attaching";
  } else if (d.registrarOrderId) {
    resumeStatus = "dns_pending";
  } else {
    resumeStatus = "purchasing";
  }

  await persist(domainId, { status: resumeStatus, statusReason: null });
  return advanceDomain(providers, domainId);
}

async function persist(id: string, data: Prisma.DomainUpdateInput): Promise<DomainStatus> {
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
  if (d.edgeZoneId) {
    await providers.edge.deleteZone(d.edgeZoneId).catch((err) =>
      console.error(`retireDomain: deleteZone failed for ${domainId}:`, err),
    );
  }
  await providers.origin.detach(d.hostname).catch((err) =>
    console.error(`retireDomain: detach failed for ${domainId}:`, err),
  );
  await prisma.domain.update({ where: { id: domainId }, data: { status: "retired", retiredAt: new Date() } });
}

// Zero-downtime swap: the old domain keeps serving until the new one is fully live.
export async function rotateDomain(providers: Providers, landingId: string, newHostname: string): Promise<string> {
  // CRITICAL 1: capture the old primary BEFORE the advance loop.
  // The verify step inside advanceDomain writes primaryDomainId = newId, so reading after the
  // loop would always yield the new id and the guard (oldPrimaryId !== newId) would be false.
  const landingBefore = await prisma.landing.findUnique({ where: { id: landingId } });
  const oldPrimaryId = landingBefore?.primaryDomainId ?? null;

  const newId = await purchaseDomainForLanding(providers, landingId, newHostname);
  // Drive to a terminal status (live or failed). Bounded by the number of lifecycle steps.
  for (let i = 0; i < 6; i++) {
    const status = await advanceDomain(providers, newId);
    if (isTerminal(status)) break;
  }
  const fresh = await prisma.domain.findUnique({ where: { id: newId } });
  if (fresh?.status !== "live") throw new Error(`Rotation failed: new domain ${newHostname} is ${fresh?.status}`);

  // Ensure primaryDomainId is set to the new domain (verify step may have done this already).
  await prisma.landing.update({ where: { id: landingId }, data: { primaryDomainId: newId } });
  if (oldPrimaryId && oldPrimaryId !== newId) await retireDomain(providers, oldPrimaryId);
  return newId;
}
