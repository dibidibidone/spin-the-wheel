import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory prisma fake (only the calls the service makes).
// db.landings stores actual landing objects keyed by id so that landing.update() writes are
// visible to the subsequent landing.findUnique() call — this mirrors real Prisma behaviour and
// is required by CRITICAL 1: rotateDomain must read oldPrimaryId BEFORE the advance loop.
const db: { domains: any[]; landings: Record<string, any> } = { domains: [], landings: {} };
vi.mock("@/lib/db", () => ({
  prisma: {
    domain: {
      create: vi.fn(async ({ data }: any) => { const row = { id: `d${db.domains.length + 1}`, ...data }; db.domains.push(row); return row; }),
      findUnique: vi.fn(async ({ where }: any) => db.domains.find((d) => d.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: any) => { const row = db.domains.find((d) => d.id === where.id); Object.assign(row, data); return row; }),
    },
    landing: {
      update: vi.fn(async ({ where, data }: any) => {
        const existing = db.landings[where.id] ?? { id: where.id };
        Object.assign(existing, data);
        db.landings[where.id] = existing;
        return existing;
      }),
      // Returns the persisted landing object — the same one written by landing.update().
      findUnique: vi.fn(async ({ where }: any) => db.landings[where.id] ?? null),
    },
  },
}));

import { purchaseDomainForLanding, advanceDomain, flagDomain, retireDomain, rotateDomain, retryDomain } from "./service";
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

beforeEach(() => { db.domains = []; db.landings = {}; });

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

    // IMPORTANT 4: go-live is gated on Vercel origin verify only (not ensureSsl)
    expect(await advanceDomain(p, id)).toBe("live");             // verify (Vercel verified)
    expect(db.domains[0].status).toBe("live");
    expect(p.origin.verify).toHaveBeenCalledWith("boomzino.click");
    expect(p.edge.ensureSsl).not.toHaveBeenCalled();
  });

  it("buy-once guard: re-advancing a purchasing row that already has an order does NOT re-register", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await advanceDomain(p, id);                 // register -> dns_pending
    db.domains[0].status = "purchasing";        // simulate a crash/retry that left status stale
    await advanceDomain(p, id);                 // must NOT call register again
    expect(p.registrar.register).toHaveBeenCalledOnce();
  });

  // IMPORTANT 4: go-live now gates on Vercel origin verified, not Cloudflare ensureSsl.
  it("stays in ssl_pending while Vercel origin is not yet verified", async () => {
    const p = fakeProviders({ origin: { ...fakeProviders().origin, verify: vi.fn(async () => ({ verified: false })) } });
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

  // IMPORTANT 3: double-buy crash window guard.
  it("double-buy guard: if sentinel is set (register crashed), next advance marks failed without re-registering", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    // Simulate: a previous advance wrote the sentinel but crashed before persisting orderId.
    db.domains[0].statusReason = "registering";

    const status = await advanceDomain(p, id);
    expect(status).toBe("failed");
    expect(p.registrar.register).not.toHaveBeenCalled();
    expect(db.domains[0].statusReason).toMatch(/orderId.*manually|register.*crash/i);
  });
});

describe("rotation / retire / flag", () => {
  it("flagDomain sets flagged + reason", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await flagDomain(id, "safe-browsing");
    expect(db.domains[0]).toMatchObject({ status: "flagged", statusReason: "safe-browsing" });
  });

  it("retireDomain tears down the edge zone, detaches origin, and marks retired", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    db.domains[0].edgeZoneId = "z1";
    await retireDomain(p, id);
    expect(p.edge.deleteZone).toHaveBeenCalledWith("z1");
    expect(p.origin.detach).toHaveBeenCalledWith("x.com");
    expect(db.domains[0].status).toBe("retired");
    expect(db.domains[0].retiredAt).toBeInstanceOf(Date);
  });

  // CRITICAL 1: rotateDomain must capture oldPrimaryId BEFORE the advance loop.
  it("rotateDomain provisions a fresh live domain then retires the old primary", async () => {
    const p = fakeProviders();
    const oldId = await purchaseDomainForLanding(p, "land-1", "old.com");
    for (let i = 0; i < 4; i++) await advanceDomain(p, oldId); // -> live (sets primaryDomainId)
    db.domains[0].edgeZoneId = "zold";

    // Sanity: verify step wrote oldId as primaryDomainId via landing.update
    expect(db.landings["land-1"]).toMatchObject({ primaryDomainId: oldId });

    const newId = await rotateDomain(p, "land-1", "fresh.com");

    expect(db.domains.find((d) => d.id === newId)?.status).toBe("live");
    // The old domain must be retired — this fails if rotateDomain reads oldPrimaryId after the loop
    expect(db.domains.find((d) => d.id === oldId)?.status).toBe("retired");
    // primaryDomainId repointed to the new domain
    expect(db.landings["land-1"]).toMatchObject({ primaryDomainId: newId });
  });
});

describe("retryDomain", () => {
  // IMPORTANT 2: failed domains must be recoverable; retry resumes from the right step.
  it("retries a failed domain from dns_pending when registrarOrderId is set (no re-register)", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    await advanceDomain(p, id); // register -> dns_pending; register called once
    // Simulate failure at edge provision step
    db.domains[0].status = "failed";
    db.domains[0].statusReason = "edge timeout";
    expect(db.domains[0].registrarOrderId).toBe("ord-1");

    const status = await retryDomain(p, id);
    // Resumed at dns_pending -> provision_edge -> attaching
    expect(status).toBe("attaching");
    // register must NOT have been called again
    expect(p.registrar.register).toHaveBeenCalledOnce();
  });

  it("retries from purchasing when nothing has been persisted yet", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    db.domains[0].status = "failed";
    db.domains[0].statusReason = "initial failure";
    // No registrarOrderId, no edgeZoneId, not verified

    const status = await retryDomain(p, id);
    // Resumed at purchasing -> register -> dns_pending
    expect(status).toBe("dns_pending");
    expect(p.registrar.register).toHaveBeenCalledOnce();
  });

  it("retries from attaching when edge was provisioned but origin not attached", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    db.domains[0].status = "failed";
    db.domains[0].statusReason = "attach error";
    db.domains[0].registrarOrderId = "ord-1";
    db.domains[0].edgeZoneId = "z1";

    const status = await retryDomain(p, id);
    // Resumed at attaching -> attach_origin -> ssl_pending
    expect(status).toBe("ssl_pending");
    expect(p.registrar.register).not.toHaveBeenCalled();
    expect(p.edge.createZone).not.toHaveBeenCalled();
  });

  it("retries from ssl_pending when origin was already verified", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    db.domains[0].status = "failed";
    db.domains[0].statusReason = "verify error";
    db.domains[0].registrarOrderId = "ord-1";
    db.domains[0].edgeZoneId = "z1";
    db.domains[0].verified = true;

    const status = await retryDomain(p, id);
    // Resumed at ssl_pending -> verify -> live (origin.verify returns verified: true)
    expect(status).toBe("live");
    expect(p.registrar.register).not.toHaveBeenCalled();
    expect(p.origin.attach).not.toHaveBeenCalled();
  });

  it("throws if called on a non-failed domain", async () => {
    const p = fakeProviders();
    const id = await purchaseDomainForLanding(p, "land-1", "x.com");
    // status is "purchasing"
    await expect(retryDomain(p, id)).rejects.toThrow(/non-failed/);
  });
});
