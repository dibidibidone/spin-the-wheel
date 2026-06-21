import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { landing: { findUnique } } }));

import { getLandingViewById } from "@/lib/tenant";

beforeEach(() => findUnique.mockReset());

function row(status: string) {
  const prizes = [
    { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A", weight: 1 },
    { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
  ];
  return {
    slug: "demo", status,
    heading: "Spin the Wheel", subtitle: "and win", backLabel: "Back",
    winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null,
    winningPrizeId: "p1", winningPrize: prizes[1], prizes,
  };
}

describe("getLandingViewById", () => {
  it("returns a view even for a draft landing (preview ignores status)", async () => {
    findUnique.mockResolvedValue(row("draft"));
    const view = await getLandingViewById("l1");
    expect(view?.slug).toBe("demo");
    expect(view?.spin.winningIndex).toBe(1);
  });

  it("returns null when the landing does not exist", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getLandingViewById("missing")).toBeNull();
  });
});
