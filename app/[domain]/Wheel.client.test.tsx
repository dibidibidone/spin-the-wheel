import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const promptInstall = vi.fn();
vi.mock("@/components/r3f/kit/usePwaInstall", () => ({
  usePwaInstall: () => ({ platform: "android", installed: false, iosHintOpen: false, promptInstall, openApp: vi.fn(), dismissIosHint: vi.fn() }),
}));

import { WheelClient } from "@/app/[domain]/Wheel.client";
import type { LandingView } from "@/lib/types";

beforeEach(() => promptInstall.mockReset());

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
    winText: "",
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

  it("shows the spins-left count and counts it down after a near-miss", async () => {
    render(<WheelClient landing={view()} navigate={() => {}} />);
    expect(screen.getByTestId("spins-left")).toHaveTextContent("2 spins left");
    await userEvent.click(screen.getByTestId("spin-button"));
    fireTransitionEnd(); // spin 1 -> near-miss
    expect(screen.getByTestId("spins-left")).toHaveTextContent("1 spin left");
  });

  it("shows the loss burst on a near-miss and not before", async () => {
    render(<WheelClient landing={view()} navigate={() => {}} />);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
    await userEvent.click(screen.getByTestId("spin-button"));
    fireTransitionEnd(); // spin 1 -> almost
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
  });

  it("renders the loss burst OUTSIDE the shaking wheel-stage so its fixed flash fills the viewport", async () => {
    // .wheel-stage gets the `.shake` transform on a near-miss, which would make it the
    // containing block for a position:fixed descendant and clip the full-screen flash to
    // the 360x300 stage box. The burst must live outside the transformed stage.
    const { container } = render(<WheelClient landing={view()} navigate={() => {}} />);
    await userEvent.click(screen.getByTestId("spin-button"));
    fireTransitionEnd(); // spin 1 -> almost
    const stage = container.querySelector(".wheel-stage");
    expect(stage).not.toBeNull();
    expect(stage!.contains(screen.getByTestId("loss-burst"))).toBe(false);
  });

  it("prompts install on the first spin and opens the PWA via /go on claim", async () => {
    const navigate = vi.fn();
    render(<WheelClient landing={view()} navigate={navigate} />);
    const button = screen.getByTestId("spin-button");
    await userEvent.click(button); fireTransitionEnd();   // spin 1
    expect(promptInstall).toHaveBeenCalledTimes(1);        // install fired once
    await userEvent.click(button); fireTransitionEnd();   // spin 2 -> win
    await userEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(navigate).toHaveBeenCalledWith("/go");
    expect(promptInstall).toHaveBeenCalledTimes(1);        // still once (guarded)
  });
});
