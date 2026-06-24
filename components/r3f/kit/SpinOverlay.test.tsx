// components/r3f/kit/SpinOverlay.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpinOverlay } from "./SpinOverlay";
import { withConversionDefaults } from "./conversion";
import type { OverlayCopy } from "./types";
import type { OverlayVars } from "./SpinOverlay";

const copy: OverlayCopy = {
  logo: "B", heading: "h", ctaLabel: "SPIN", spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!", nearMissLine: "Two of three!",
  almostText: "Almost! Spin again",
  winTitle: "You won", winPrize: "WIN", winEmoji: "💰",
};
const vars: OverlayVars = { gold: "#f5c24b", accent: "#ffd56a", surface: "#15564a", text: "#eaf6ee", bannerBg: "#e2483d", bannerBorder: "#f5c24b" };
const config = withConversionDefaults({ prize: "200 Free Spins" });
const noop = () => {};

function renderAt(status: "idle" | "spinning" | "nearmiss" | "won", spinsLeft?: number) {
  return render(
    <SpinOverlay copy={copy} vars={vars} config={config} status={status} claimStep="hidden" muted reduced spinsLeft={spinsLeft}
      onSpin={noop} onToggleSound={noop} onClaimOpen={noop} onClaimSubmit={noop} onDismiss={noop} />
  );
}

describe("SpinOverlay nearmiss CTA", () => {
  it("shows the retry label and stays enabled on nearmiss", () => {
    renderAt("nearmiss");
    const btn = screen.getByTestId("spin-button");
    expect(btn).toHaveTextContent("So close — try again!");
    expect(btn).not.toBeDisabled();
    expect(screen.getByText("Two of three!")).toBeVisible();
  });
  it("shows the plain CTA when idle", () => {
    renderAt("idle");
    expect(screen.getByTestId("spin-button")).toHaveTextContent("SPIN");
  });
  it("disables the CTA while spinning", () => {
    renderAt("spinning");
    const btn = screen.getByTestId("spin-button");
    expect(btn).toHaveTextContent("SPINNING…");
    expect(btn).toBeDisabled();
  });
});

describe("SpinOverlay spins-left", () => {
  it("shows the spins-left count when idle", () => {
    renderAt("idle", 3);
    expect(screen.getByTestId("spins-left")).toHaveTextContent("3 spins left");
  });
  it("uses the singular for one spin left", () => {
    renderAt("nearmiss", 1);
    expect(screen.getByTestId("spins-left")).toHaveTextContent("1 spin left");
  });
  it("hides the count while spinning and on win", () => {
    renderAt("spinning", 2);
    expect(screen.queryByTestId("spins-left")).toBeNull();
    renderAt("won", 0);
    expect(screen.queryByTestId("spins-left")).toBeNull();
  });
  it("renders nothing when spinsLeft is not provided", () => {
    renderAt("idle", undefined);
    expect(screen.queryByTestId("spins-left")).toBeNull();
  });
});

describe("SpinOverlay loss burst", () => {
  it("shows the loss burst with the almost text on near-miss", () => {
    renderAt("nearmiss", 1);
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
    expect(screen.getByText("Almost! Spin again")).toBeInTheDocument();
  });
  it("does not show the loss burst on idle, spinning, or win", () => {
    renderAt("idle", 2);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
    renderAt("spinning", 2);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
    renderAt("won", 0);
    expect(screen.queryByTestId("loss-burst")).toBeNull();
  });
});
