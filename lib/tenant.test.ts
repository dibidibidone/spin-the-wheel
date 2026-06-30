import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Task 1: conversion fields thread-through test
// ---------------------------------------------------------------------------
import { toLandingView as toLandingViewDirect } from "./tenant";

const row = () => ({
  slug: "s", status: "published",
  heading: "H", subtitle: "S", backLabel: "Back", winTitle: "W", claimLabel: "C", almostText: "A",
  offerHeadline: "Win up to €500", offerSubline: "+ 200 Free Spins", bonusesTotal: 50, countdownMinutes: 7, atmosphere: "normal",
  theme: { bg: "#000", surface: "#111", accent: "#0f0", gold: "#fc0", text: "#fff", muted: "#999" },
  logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
  spinsBeforeWin: 2, redirectUrl: "/go", redirectPrizeParam: null,
  metaTitle: null, metaDescription: null, template: "classic-2d", pwaName: "", pwaIconUrl: null, winText: "",
  fbPixelIds: ["111111111111", "222222222222"],
  winningPrizeId: null, winningPrize: null, prizes: [],
});

describe("toLandingView conversion fields", () => {
  it("threads offer + scarcity + countdown fields", () => {
    const v = toLandingViewDirect(row());
    expect(v.texts.offerHeadline).toBe("Win up to €500");
    expect(v.texts.offerSubline).toBe("+ 200 Free Spins");
    expect(v.bonusesTotal).toBe(50);
    expect(v.countdownMinutes).toBe(7);
  });

  it("threads fbPixelIds into the view", () => {
    const v = toLandingViewDirect(row());
    expect(v.fbPixelIds).toEqual(["111111111111", "222222222222"]);
  });
});
// ---------------------------------------------------------------------------

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
    fbPixelIds: [],
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
    findUnique.mockResolvedValue({ landing: fakeLanding() });
    const view = await getLandingByHost("LOCALHOST:3000");
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { hostname: "localhost:3000" } }));
    expect(view?.slug).toBe("demo");
  });

  it("returns null for an unknown host", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getLandingByHost("nope.com")).toBeNull();
  });

  it("returns null for an unpublished landing", async () => {
    findUnique.mockResolvedValue({ landing: fakeLanding({ status: "draft" }) });
    expect(await getLandingByHost("draft.com")).toBeNull();
  });
});
