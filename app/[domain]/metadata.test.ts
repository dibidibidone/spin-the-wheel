import { describe, it, expect } from "vitest";
import { buildMetadata } from "@/app/[domain]/buildMetadata";
import type { LandingView } from "@/lib/types";

const base: LandingView = {
  slug: "demo",
  texts: { heading: "Spin the Wheel", subtitle: "and win bonuses", backLabel: "Back", winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost!" },
  theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
  assets: { logoUrl: null, faviconUrl: "https://cdn.example/fav.png", coinImageUrl: null, bgImageUrl: null },
  segments: [],
  spin: { segmentCount: 0, spinsBeforeWin: 1, winningIndex: 0, behavior: "near-miss" },
  redirectUrl: "https://x", redirectPrizeParam: null, winningPrizeLabel: "",
  metaTitle: "Win Big — Boomzino", metaDescription: "Spin to win",
};

describe("buildMetadata", () => {
  it("uses meta title/description and favicon when present", () => {
    const m = buildMetadata(base);
    expect(m.title).toBe("Win Big — Boomzino");
    expect(m.description).toBe("Spin to win");
    expect(m.icons).toEqual({ icon: "https://cdn.example/fav.png" });
  });

  it("omits icons when there is no favicon", () => {
    const m = buildMetadata({ ...base, assets: { ...base.assets, faviconUrl: null } });
    expect(m.icons).toBeUndefined();
  });
});
