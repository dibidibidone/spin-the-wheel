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
  winTitle: "You won", winPrize: "WIN", winEmoji: "💰",
};
const vars: OverlayVars = { gold: "#f5c24b", accent: "#ffd56a", surface: "#15564a", text: "#eaf6ee", bannerBg: "#e2483d", bannerBorder: "#f5c24b" };
const config = withConversionDefaults({ prize: "200 Free Spins" });
const noop = () => {};

function renderAt(status: "idle" | "spinning" | "nearmiss" | "won") {
  return render(
    <SpinOverlay copy={copy} vars={vars} config={config} status={status} claimStep="hidden" muted reduced
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
