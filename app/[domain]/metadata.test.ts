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
  template: "classic-2d",
  pwaName: "",
  pwaIconUrl: null,
  winText: "",
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

import { describe as describe2, it as it2, expect as expect2 } from "vitest";
import { buildMetadata as bm } from "./buildMetadata";

const base2 = {
  slug: "d", texts: { heading: "Lucky", subtitle: "", backLabel: "", winTitle: "", claimLabel: "", almostText: "" },
  theme: { bg: "#000000", surface: "#111111", accent: "#222222", gold: "#FFD24A", text: "#fff", muted: "#888" },
  assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
  segments: [], spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" as const },
  redirectUrl: "https://x.example.com", redirectPrizeParam: null, winningPrizeLabel: "JACKPOT",
  metaTitle: "t", metaDescription: "d", pwaName: "Lucky App", pwaIconUrl: "https://cdn/i.png", winText: "",
};

describe2("buildMetadata — PWA", () => {
  it2("links the manifest for non-classic templates", () => {
    const m = bm({ ...base2, template: "jackpot-vault" } as never);
    expect2(m.manifest).toBe("/manifest");
    expect2((m.appleWebApp as { title?: string }).title).toBe("Lucky App");
  });
  it2("does not link a manifest for classic-2d", () => {
    const m = bm({ ...base2, template: "classic-2d" } as never);
    expect2(m.manifest).toBeUndefined();
  });
});
