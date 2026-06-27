import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfferBanner } from "./OfferBanner";

describe("OfferBanner", () => {
  it("shows the headline and subline", () => {
    render(<OfferBanner headline="Win up to €500" subline="+ 200 Free Spins" />);
    expect(screen.getByTestId("offer-banner")).toBeInTheDocument();
    expect(screen.getByText("Win up to €500")).toBeInTheDocument();
    expect(screen.getByText("+ 200 Free Spins")).toBeInTheDocument();
  });
  it("renders nothing without a headline", () => {
    const { container } = render(<OfferBanner subline="+ 200 FS" />);
    expect(container.firstChild).toBeNull();
  });
});
