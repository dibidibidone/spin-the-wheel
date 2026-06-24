import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { domain: { findUnique } } }));

import { toLandingView, getLandingByHost } from "@/lib/tenant";

function fakeLanding(overrides: Record<string, unknown> = {}) {
  const prizes = [
    { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A", weight: 1 },
    { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
  ];
  return {
    slug: "demo",
    status: "published",
    heading: "Spin the Wheel",
    subtitle: "and win bonuses",
    backLabel: "Back",
    winTitle: "You won {prize}!",
    claimLabel: "Claim",
    almostText: "Almost! Spin again",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3,
    redirectUrl: "https://casino.example/signup",
    redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null,
    winningPrizeId: "p1",
    winningPrize: prizes[1],
    prizes,
    ...overrides,
  };
}

beforeEach(() => findUnique.mockReset());

describe("toLandingView", () => {
  it("maps prizes to segments and computes the winning index", () => {
    const view = toLandingView(fakeLanding() as never);
    expect(view.segments.map((s) => s.label)).toEqual(["€5", "JACKPOT"]);
    expect(view.spin).toEqual({ segmentCount: 2, spinsBeforeWin: 3, winningIndex: 1, behavior: "near-miss" });
    expect(view.winningPrizeLabel).toBe("JACKPOT");
    expect(view.metaTitle).toBe("Spin the Wheel"); // falls back to heading
  });
});

describe("getLandingByHost", () => {
  it("lowercases the host and returns the mapped view when published", async () => {
    findUnique.mockResolvedValue({ status: "live", landing: fakeLanding() });
    const view = await getLandingByHost("LOCALHOST:3000");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { hostname: "localhost:3000" } }));
    expect(view?.slug).toBe("demo");
  });

  it("returns null for an unknown host", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getLandingByHost("nope.com")).toBeNull();
  });

  it("returns null for an unpublished landing", async () => {
    findUnique.mockResolvedValue({ status: "live", landing: fakeLanding({ status: "draft" }) });
    expect(await getLandingByHost("draft.com")).toBeNull();
  });

  it("returns null for a retired domain (even if the landing is published)", async () => {
    findUnique.mockResolvedValue({ status: "retired", landing: fakeLanding() });
    expect(await getLandingByHost("retired.com")).toBeNull();
  });

  it("returns null for a failed domain", async () => {
    findUnique.mockResolvedValue({ status: "failed", landing: fakeLanding() });
    expect(await getLandingByHost("failed.com")).toBeNull();
  });

  it("still resolves for a live domain", async () => {
    findUnique.mockResolvedValue({ status: "live", landing: fakeLanding() });
    const view = await getLandingByHost("live.com");
    expect(view?.slug).toBe("demo");
  });

  it("still resolves for a purchasing domain (pre-existing rows default to purchasing)", async () => {
    findUnique.mockResolvedValue({ status: "purchasing", landing: fakeLanding() });
    const view = await getLandingByHost("purchasing.com");
    expect(view?.slug).toBe("demo");
  });
});
