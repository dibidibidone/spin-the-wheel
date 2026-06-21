import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingScene } from "@/components/landing/LandingScene";
import type { LandingView } from "@/lib/types";

function view(): LandingView {
  return {
    slug: "demo",
    texts: { heading: "Spin & Win Big", subtitle: "and win bonuses", backLabel: "Back", winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost!" },
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
    segments: [
      { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A" },
      { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B" },
    ],
    spin: { segmentCount: 2, spinsBeforeWin: 3, winningIndex: 1, behavior: "near-miss" },
    redirectUrl: "https://x.com", redirectPrizeParam: "bonus", winningPrizeLabel: "JACKPOT",
    metaTitle: "Spin & Win Big", metaDescription: "and win bonuses",
  };
}

describe("LandingScene", () => {
  it("renders the heading and applies theme CSS variables", () => {
    const { container } = render(<LandingScene view={view()} />);
    expect(screen.getByRole("heading", { name: "Spin & Win Big" })).toBeInTheDocument();
    const main = container.querySelector("main.landing") as HTMLElement;
    expect(main.style.getPropertyValue("--bg")).toBe("#0A1410");
  });
});
