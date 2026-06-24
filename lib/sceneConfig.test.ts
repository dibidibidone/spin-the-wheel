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
  winText: "",
  metaTitle: "t",
  metaDescription: "d",
  template: "jackpot-vault",
  pwaName: "Lucky App",
  pwaIconUrl: "https://cdn.example.com/icon.png",
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
    expect(c.copy?.heading).toBe("H");
    expect(c.copy?.subtitle).toBe("S");
    expect(c.copy?.winTitle).toBe("You won!");
    expect(c.copy?.nearMissLine).toBe("Almost");
    expect(c.copy?.almostText).toBe("Almost");
    expect(c.pwa).toEqual({ name: "Lucky App", iconUrl: "https://cdn.example.com/icon.png", openUrl: "/go" });
  });

  it("falls back to winTitle when there is no winning prize label", () => {
    const c = buildSceneConfig({ ...view, winningPrizeLabel: "" });
    expect(c.conversion.prize).toBe("You won!");
  });

  it("prefers winText over the winning prize label", () => {
    const c = buildSceneConfig({ ...view, winText: "200 Free Spins" });
    expect(c.conversion.prize).toBe("200 Free Spins");
    expect(c.copy?.winPrize).toBe("200 Free Spins");
  });

  it("maps prizes to wheel segments + carries the logo + segment count", () => {
    const withSegs = {
      ...view,
      assets: { ...view.assets, logoUrl: "https://cdn.example.com/logo.svg" },
      segments: [
        { id: "p0", order: 0, label: "€5", icon: "", color: "#1E7A3A" },
        { id: "p1", order: 1, label: "JACKPOT", icon: "", color: "#F5C24B" },
      ],
    };
    const c = buildSceneConfig(withSegs);
    expect(c.segments).toEqual([
      { label: "€5", color: "#1E7A3A" },
      { label: "JACKPOT", color: "#F5C24B" },
    ]);
    expect(c.segmentCount).toBe(2);
    expect(c.logoSrc).toBe("https://cdn.example.com/logo.svg");
  });
});
