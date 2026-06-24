import { prisma } from "./db";
import {
  attachDomain,
  verifyDomain,
  removeDomain as vercelRemoveDomain,
  VercelApiError,
  type VercelConfig,
} from "./vercel";
import { dnsInstructionsFor, normalizeHostname, isValidHostname, type DnsRecord } from "./dns";

export type DomainView = {
  id: string;
  hostname: string;
  status: string;
  verified: boolean;
  vercelStatus: string | null;
  sslStatus: string | null;
  statusReason: string | null;
  dns: DnsRecord;
};

export class InvalidHostnameError extends Error {
  constructor(hostname: string) {
    super(`Invalid hostname: ${hostname}`);
    this.name = "InvalidHostnameError";
  }
}

type DomainRow = { id: string; hostname: string; status: string; verified: boolean; vercelStatus: string | null; sslStatus: string | null; statusReason: string | null };

function toView(row: DomainRow): DomainView {
  return {
    id: row.id, hostname: row.hostname, status: row.status, verified: row.verified,
    vercelStatus: row.vercelStatus, sslStatus: row.sslStatus, statusReason: row.statusReason,
    dns: dnsInstructionsFor(row.hostname),
  };
}

export async function listDomains(landingId: string): Promise<DomainView[]> {
  const rows = await prisma.domain.findMany({
    where: { landingId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toView);
}

export async function addDomain(
  landingId: string,
  rawHostname: string,
  config: VercelConfig,
): Promise<DomainView> {
  const hostname = normalizeHostname(rawHostname);
  if (!isValidHostname(hostname)) throw new InvalidHostnameError(hostname);

  const result = await attachDomain(config, hostname);
  const row = await prisma.domain.create({
    data: {
      landingId,
      hostname,
      verified: result.verified,
      vercelStatus: result.verified ? "verified" : "pending",
      status: result.verified ? "live" : "attaching",
    },
  });
  return toView(row);
}

export async function refreshDomain(domainId: string, config: VercelConfig): Promise<DomainView> {
  const existing = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!existing) throw new Error(`Domain not found: ${domainId}`);

  const result = await verifyDomain(config, existing.hostname);
  const row = await prisma.domain.update({
    where: { id: domainId },
    data: { verified: result.verified, vercelStatus: result.verified ? "verified" : "pending" },
  });
  return toView(row);
}

export async function removeDomain(domainId: string, config: VercelConfig): Promise<void> {
  const existing = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!existing) return;

  try {
    await vercelRemoveDomain(config, existing.hostname);
  } catch (err) {
    // A domain already gone from Vercel should not block local cleanup.
    if (!(err instanceof VercelApiError) || err.status !== 404) throw err;
  }
  await prisma.domain.delete({ where: { id: domainId } });
}
