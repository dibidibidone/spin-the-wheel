import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory prisma fake (only the calls the service makes).
const db: { domains: any[]; landings: any[] } = { domains: [], landings: [] };
vi.mock("@/lib/db", () => ({
  prisma: {
    domain: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `d${db.domains.length + 1}`, ...data }; db.domains.push(row); return row; }),
      findUnique: vi.fn(async ({ where }: any) => db.domains.find((d) => d.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: any) => { const row = db.domains.find((d) => d.id === where.id); Object.assign(row, data); return row; }),
    },
    landing: { update: vi.fn(async ({ where, data }: any) => { db.landings.push({ where, data }); return {}; }) },
  },
}));

import { purchaseDomainForLanding, advanceDomain } from "./service";
import type { Providers } from "@/lib/providers/types";

function fakeProviders(over: Partial<Providers> = {}): Providers {
  return {
    registrar: {
      checkAvailability: vi.fn(async (name) => ({ name, available: true, priceUsd: 9 })),
      suggest: vi.fn(async () => []),
      register: vi.fn(async () => ({ orderId: "ord-1", expiresAt: new Date("2027-01-01") })),
      setNameservers: vi.fn(async () => {}),
    },
    edge: {
      createZone: vi.fn(async () => ({ zoneId: "z1", nameservers: ["a.ns", "b.ns"] })),
      upsertRecords: vi.fn(async () => {}),
      ensureSsl: vi.fn(async () => "active"),
      deleteZone: vi.fn(async () => {}),
    },
    origin: {
      attach: vi.fn(async () => ({ verified: false })),
      verify: vi.fn(async () => ({ verified: true })),
      detach: vi.fn(async () => {}),
    },
    originTarget: { ip: "76.76.21.21" },
    ...over,
  } as Providers;
}

beforeEach(() => { db.domains = []; db.landings = []; });

describe("domain service", () => {
  it("purchaseDomainForLanding creates a purchasing row", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "boomzino.click");
    const row = db.domains.find((d) => d.id === id);
    expect(row).toMatchObject({ landingId: "land-1", hostname: "boomzino.click", status: "purchasing", registrarOrderId: null });
  });

  it("drives a domain through the full lifecycle to live", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "boomzino.click");

    expect(await advanceDomain(p, id)).toBe("dns_pending");      // register
    expect(p.registrar.register).toHaveBeenCalledOnce();
    expect(db.domains[0].registrarOrderId).toBe("ord-1");

    expect(await advanceDomain(p, id)).toBe("attaching");        // provision_edge
    expect(p.edge.createZone).toHaveBeenCalledOnce();
    expect(p.registrar.setNameservers).toHaveBeenCalledWith("boomzino.click", ["a.ns", "b.ns"]);
    expect(p.edge.upsertRecords).toHaveBeenCalled();

    expect(await advanceDomain(p, id)).toBe("ssl_pending");      // attach_origin
    expect(p.origin.attach).toHaveBeenCalledWith("boomzino.click");

    expect(await advanceDomain(p, id)).toBe("live");             // verify (ssl active + verified)
    expect(db.domains[0].status).toBe("live");
  });

  it("buy-once guard: re-advancing a purchasing row that already has an order does NOT re-register", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await advanceDomain(p, id);                 // register -> dns_pending
    db.domains[0].status = "purchasing";        // simulate a crash/retry that left status stale
    await advanceDomain(p, id);                 // must NOT call register again
    expect(p.registrar.register).toHaveBeenCalledOnce();
  });

  it("stays in ssl_pending while SSL is not yet active", async () => {
    const p = fakeProviders({ edge: { ...fakeProviders().edge, ensureSsl: vi.fn(async () => "pending" as const) } });
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await advanceDomain(p, id); await advanceDomain(p, id); await advanceDomain(p, id);
    expect(await advanceDomain(p, id)).toBe("ssl_pending");
  });

  it("a thrown step marks the domain failed with a reason", async () => {
    const p = fakeProviders({ registrar: { ...fakeProviders().registrar, register: vi.fn(async () => { throw new Error("balance too low"); }) } });
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    expect(await advanceDomain(p, id)).toBe("failed");
    expect(db.domains[0].statusReason).toMatch(/balance too low/);
  });
});
