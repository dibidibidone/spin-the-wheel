import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type FunnelRow = {
  landingId: string;
  name: string;
  visits: number;
  downloads: number;
  opens: number;
  visitToDownloadPct: number;
  downloadToOpenPct: number;
  visitToOpenPct: number;
};

type CountRow = { landingId: string; name: string; visits: number; downloads: number; opens: number };
type RawRow = { landingId: string; name: string; visits: bigint; downloads: bigint; opens: bigint };

const pct = (num: number, den: number): number => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);

export function computeFunnel(rows: CountRow[]): FunnelRow[] {
  return rows.map((r) => ({
    ...r,
    visitToDownloadPct: pct(r.downloads, r.visits),
    downloadToOpenPct: pct(r.opens, r.downloads),
    visitToOpenPct: pct(r.opens, r.visits),
  }));
}

export async function getFunnelStats(filters: { landingId?: string; from?: Date; to?: Date }): Promise<FunnelRow[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT l.id AS "landingId", l.name AS name,
      COUNT(DISTINCT e."visitorId") FILTER (WHERE e.type = 'VISIT')   AS visits,
      COUNT(DISTINCT e."visitorId") FILTER (WHERE e.type = 'INSTALL') AS downloads,
      COUNT(DISTINCT e."visitorId") FILTER (WHERE e.type = 'OPEN')    AS opens
    FROM "Landing" l
    LEFT JOIN "Event" e ON e."landingId" = l.id
      ${filters.from ? Prisma.sql`AND e."createdAt" >= ${filters.from}` : Prisma.empty}
      ${filters.to ? Prisma.sql`AND e."createdAt" < ${filters.to}` : Prisma.empty}
    ${filters.landingId ? Prisma.sql`WHERE l.id = ${filters.landingId}` : Prisma.empty}
    GROUP BY l.id, l.name
    ORDER BY l.name ASC
  `;
  return computeFunnel(
    rows.map((r) => ({
      landingId: r.landingId,
      name: r.name,
      visits: Number(r.visits),
      downloads: Number(r.downloads),
      opens: Number(r.opens),
    })),
  );
}
