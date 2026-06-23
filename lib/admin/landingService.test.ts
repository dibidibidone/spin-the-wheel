import { describe, it, expect, vi, beforeEach } from "vitest";

const { landing, prize, $transaction } = vi.hoisted(() => ({
  landing: {
    findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
  },
  prize: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { landing, prize, $transaction } }));

import {
  slugify, listLandings, createLanding, getEditableLanding, updateLanding, saveWheel,
} from "@/lib/admin/landingService";

beforeEach(() => {
  for (const fn of [landing.findMany, landing.findUnique, landing.create, landing.update, prize.deleteMany, prize.createMany, prize.findMany, $transaction]) {
    fn.mockReset();
  }
});

describe("slugify", () => {
  it("lowercases, trims and dashes", () => {
    expect(slugify("  Summer Promo 2026!! ")).toBe("summer-promo-2026");
  });
  it("falls back to 'landing' when empty", () => {
    expect(slugify("!!!")).toBe("landing");
  });
});

describe("listLandings", () => {
  it("maps rows including the domain count", async () => {
    landing.findMany.mockResolvedValue([
      { id: "l1", name: "Promo", slug: "promo", status: "published", _count: { domains: 2 } },
    ]);
    expect(await listLandings()).toEqual([
      { id: "l1", name: "Promo", slug: "promo", status: "published", domainCount: 2 },
    ]);
  });
});

describe("createLanding", () => {
  const sixPrizeRow = {
    id: "new1",
    prizes: [{ id: "p0" }, { id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }],
  };

  it("creates a classic-2d draft, then sets the last prize as winner", async () => {
    landing.findUnique.mockResolvedValue(null); // slug is free
    landing.create.mockResolvedValue(sixPrizeRow);
    landing.update.mockResolvedValue({});

    const result = await createLanding({ name: "Big Promo", template: "classic-2d" });
    expect(result).toEqual({ id: "new1" });

    const created = landing.create.mock.calls[0][0];
    expect(created.data.slug).toBe("big-promo");
    expect(created.data.status).toBe("draft");
    expect(created.data.template).toBe("classic-2d");
    expect(created.data.heading).toBe("Spin the Wheel");
    expect(created.data.pwaName).toBe("");
    const prizes = created.data.prizes.create;
    expect(prizes).toHaveLength(6);
    expect(prizes[prizes.length - 1].label).toBe("JACKPOT"); // classic winner text unchanged

    expect(landing.update).toHaveBeenCalledWith({ where: { id: "new1" }, data: { winningPrizeId: "p5" } });
  });

  it("applies the 3D template preset (smart defaults) on creation", async () => {
    landing.findUnique.mockResolvedValue(null);
    landing.create.mockResolvedValue(sixPrizeRow);
    landing.update.mockResolvedValue({});

    await createLanding({ name: "Vault Promo", template: "jackpot-vault" });

    const created = landing.create.mock.calls[0][0];
    expect(created.data.template).toBe("jackpot-vault");
    expect(created.data.heading).toBe("BOOM your luck");
    expect(created.data.pwaName).toBe("Jackpot Vault");
    const prizes = created.data.prizes.create;
    expect(prizes[prizes.length - 1].label).toBe("1,000 Free Spins"); // winner prize text from preset
  });
});

describe("getEditableLanding", () => {
  it("returns null when missing", async () => {
    landing.findUnique.mockResolvedValue(null);
    expect(await getEditableLanding("nope")).toBeNull();
  });

  it("maps a row to EditableLanding with ordered prizes", async () => {
    landing.findUnique.mockResolvedValue({
      id: "l1", slug: "promo", name: "Promo", status: "draft",
      heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
      claimLabel: "Claim", almostText: "Almost!",
      theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
      logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
      spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
      metaTitle: null, metaDescription: null, winningPrizeId: "p1",
      prizes: [{ id: "p1", order: 1, label: "B", icon: "👑", color: "#F5C24B", weight: 1 }],
    });
    const view = await getEditableLanding("l1");
    expect(view?.name).toBe("Promo");
    expect(view?.prizes[0].id).toBe("p1");
  });
});

describe("updateLanding", () => {
  it("updates only the patched metadata fields for the given landing", async () => {
    landing.update.mockResolvedValue({});
    await updateLanding("l1", { heading: "New heading", status: "published" });
    expect(landing.update).toHaveBeenCalledWith({
      where: { id: "l1" },
      data: { heading: "New heading", status: "published" },
    });
  });
});

describe("saveWheel", () => {
  it("clears the winner, replaces prizes, and re-points winningPrizeId in one transaction", async () => {
    const tx = {
      landing: { update: vi.fn().mockResolvedValue({}) },
      prize: {
        deleteMany: vi.fn().mockResolvedValue({}),
        createMany: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([{ id: "n0", order: 0 }, { id: "n1", order: 1 }]),
      },
    };
    $transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx));

    await saveWheel("l1", {
      spinsBeforeWin: 2, winningIndex: 1, redirectUrl: "https://x.com", redirectPrizeParam: null,
      prizes: [
        { label: "A", icon: "", color: "#1E7A3A", weight: 1 },
        { label: "B", icon: "👑", color: "#F5C24B", weight: 1 },
      ],
    });

    expect(tx.landing.update).toHaveBeenNthCalledWith(1, { where: { id: "l1" }, data: { winningPrizeId: null } });
    expect(tx.prize.deleteMany).toHaveBeenCalledWith({ where: { landingId: "l1" } });
    expect(tx.prize.createMany).toHaveBeenCalledOnce();
    const finalUpdate = tx.landing.update.mock.calls[1][0];
    expect(finalUpdate.data.winningPrizeId).toBe("n1");
    expect(finalUpdate.data.spinsBeforeWin).toBe(2);
  });
});
