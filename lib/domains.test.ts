import { describe, it, expect, vi, beforeEach } from "vitest";

const { domain, attachDomain, verifyDomain, vercelRemove } = vi.hoisted(() => {
  const domain = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const attachDomain = vi.fn();
  const verifyDomain = vi.fn();
  const vercelRemove = vi.fn();
  return { domain, attachDomain, verifyDomain, vercelRemove };
});

vi.mock("@/lib/db", () => ({ prisma: { domain } }));

vi.mock("@/lib/vercel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/vercel")>();
  return { ...actual, attachDomain, verifyDomain, removeDomain: vercelRemove };
});

import {
  listDomains,
  addDomain,
  refreshDomain,
  removeDomain,
  InvalidHostnameError,
} from "@/lib/domains";
import { VercelApiError } from "@/lib/vercel";

const config = { token: "t", projectId: "p" };

beforeEach(() => {
  Object.values(domain).forEach((fn) => fn.mockReset());
  attachDomain.mockReset();
  verifyDomain.mockReset();
  vercelRemove.mockReset();
});

describe("listDomains", () => {
  it("maps rows to views with DNS instructions", async () => {
    domain.findMany.mockResolvedValue([
      { id: "d1", hostname: "promo.boomzino.com", verified: false, vercelStatus: "pending" },
    ]);
    const views = await listDomains("L1");
    expect(domain.findMany).toHaveBeenCalledWith({
      where: { landingId: "L1" },
      orderBy: { createdAt: "asc" },
    });
    expect(views[0].dns).toEqual({ type: "CNAME", name: "promo", value: "cname.vercel-dns.com" });
  });
});

describe("addDomain", () => {
  it("normalizes, attaches via Vercel, persists, and returns a view", async () => {
    attachDomain.mockResolvedValue({ name: "promo.boomzino.com", verified: false, verification: [] });
    domain.create.mockResolvedValue({
      id: "d1",
      hostname: "promo.boomzino.com",
      verified: false,
      vercelStatus: "pending",
    });

    const view = await addDomain("L1", "  HTTPS://Promo.Boomzino.com/win  ", config);

    expect(attachDomain).toHaveBeenCalledWith(config, "promo.boomzino.com");
    expect(domain.create).toHaveBeenCalledWith({
      data: {
        landingId: "L1",
        hostname: "promo.boomzino.com",
        verified: false,
        vercelStatus: "pending",
      },
    });
    expect(view).toEqual({
      id: "d1",
      hostname: "promo.boomzino.com",
      verified: false,
      vercelStatus: "pending",
      dns: { type: "CNAME", name: "promo", value: "cname.vercel-dns.com" },
    });
  });

  it("rejects an invalid hostname before calling Vercel", async () => {
    await expect(addDomain("L1", "not-a-domain", config)).rejects.toBeInstanceOf(InvalidHostnameError);
    expect(attachDomain).not.toHaveBeenCalled();
  });
});

describe("refreshDomain", () => {
  it("re-verifies via Vercel and updates the row", async () => {
    domain.findUnique.mockResolvedValue({ id: "d1", hostname: "promo.boomzino.com" });
    verifyDomain.mockResolvedValue({ name: "promo.boomzino.com", verified: true, verification: [] });
    domain.update.mockResolvedValue({
      id: "d1",
      hostname: "promo.boomzino.com",
      verified: true,
      vercelStatus: "verified",
    });

    const view = await refreshDomain("d1", config);

    expect(verifyDomain).toHaveBeenCalledWith(config, "promo.boomzino.com");
    expect(domain.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { verified: true, vercelStatus: "verified" },
    });
    expect(view.verified).toBe(true);
  });
});

describe("removeDomain", () => {
  it("removes from Vercel then deletes the row", async () => {
    domain.findUnique.mockResolvedValue({ id: "d1", hostname: "promo.boomzino.com" });
    vercelRemove.mockResolvedValue(undefined);

    await removeDomain("d1", config);

    expect(vercelRemove).toHaveBeenCalledWith(config, "promo.boomzino.com");
    expect(domain.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("still deletes the row when Vercel returns 404", async () => {
    domain.findUnique.mockResolvedValue({ id: "d1", hostname: "promo.boomzino.com" });
    vercelRemove.mockRejectedValue(new VercelApiError(404, "not_found", "gone"));

    await removeDomain("d1", config);

    expect(domain.delete).toHaveBeenCalledWith({ where: { id: "d1" } });
  });

  it("is a no-op when the row does not exist", async () => {
    domain.findUnique.mockResolvedValue(null);
    await removeDomain("missing", config);
    expect(vercelRemove).not.toHaveBeenCalled();
    expect(domain.delete).not.toHaveBeenCalled();
  });
});
