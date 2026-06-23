import { describe, it, expect } from "vitest";
import { buildSceneConfig } from "./sceneConfig";
import type { LandingView } from "./types";

const view: LandingView = {
  slug: "demo",
  texts: { heading: "H", subtitle: "S", backLabel: "Back", winTitle: "You won!", claimLabel: "Claim →", almostText: "Almost" },
  theme: { bg: "#000000", surface: "#111111", accent: "#222222", gold: "#FFD24A", text: "#FFFFFF", muted: "#888888" },
  assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
  segments: [],
  spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" },
  redirectUrl: "https://offer.example.com",
  redirectPrizeParam: null,
  winningPrizeLabel: "JACKPOT",
  metaTitle: "t",
  metaDescription: "d",
  template: "jackpot-vault",
  pwaName: "Lucky App",
  pwaIconUrl: "https://cdn.example.com/icon.png",
  pwaUrl: "https://offer.example.com/go",
};

describe("buildSceneConfig", () => {
  it("maps prize, claim, win-spin and PWA from the landing", () => {
    const c = buildSceneConfig(view);
    expect(c.conversion.prize).toBe("JACKPOT");
    expect(c.conversion.claimLabel).toBe("Claim →");
    expect(c.conversion.redirectUrl).toBe("/go");
    expect(c.winningIndex).toBe(7);
    expect(c.spinsBeforeWin).toBe(2);
    expect(c.copy?.winPrize).toBe("JACKPOT");
    expect(c.pwa).toEqual({ name: "Lucky App", iconUrl: "https://cdn.example.com/icon.png", openUrl: "/go" });
  });

  it("falls back to winTitle when there is no winning prize label", () => {
    const c = buildSceneConfig({ ...view, winningPrizeLabel: "" });
    expect(c.conversion.prize).toBe("You won!");
  });
});
