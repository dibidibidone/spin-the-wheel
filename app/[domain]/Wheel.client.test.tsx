import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WheelClient } from "@/app/[domain]/Wheel.client";
import type { LandingView } from "@/lib/types";

function view(): LandingView {
  const segments = Array.from({ length: 8 }, (_, i) => ({
    id: `p${i}`, order: i, label: i === 7 ? "JACKPOT" : `P${i}`, icon: "🎰", color: "#1E7A3A",
  }));
  return {
    slug: "demo",
    texts: { heading: "Spin the Wheel", subtitle: "and win bonuses", backLabel: "Back", winTitle: "You won {prize}!", claimLabel: "Claim", almostText: "Almost! Spin again" },
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
    segments,
    spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" },
    redirectUrl: "https://casino.example/signup",
    redirectPrizeParam: "bonus",
    winningPrizeLabel: "JACKPOT",
    metaTitle: "Spin the Wheel", metaDescription: "and win bonuses",
    template: "classic-2d",
    pwaName: "",
    pwaIconUrl: null,
    pwaUrl: "", winText: "",
  };
}

function fireTransitionEnd() {
  act(() => {
    const wheel = screen.getByTestId("wheel-rotor");
    wheel.dispatchEvent(new Event("transitionend", { bubbles: true }));
  });
}

describe("WheelClient", () => {
  it("shows the almost message before the winning spin, then the win modal with a substituted title", async () => {
    render(<WheelClient landing={view()} navigate={() => {}} />);
    const button = screen.getByTestId("spin-button");

    await userEvent.click(button);          // spin 1
    fireTransitionEnd();
    expect(screen.getByTestId("almost-text")).toHaveTextContent("Almost! Spin again");

    await userEvent.click(button);          // spin 2 -> win
    fireTransitionEnd();
    expect(screen.getByText("You won JACKPOT!")).toBeInTheDocument();
  });

  it("redirects with the prize param on claim", async () => {
    const navigate = vi.fn();
    render(<WheelClient landing={view()} navigate={navigate} />);
    const button = screen.getByTestId("spin-button");
    await userEvent.click(button); fireTransitionEnd();
    await userEvent.click(button); fireTransitionEnd();
    await userEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(navigate).toHaveBeenCalledWith("https://casino.example/signup?bonus=JACKPOT");
  });
});
