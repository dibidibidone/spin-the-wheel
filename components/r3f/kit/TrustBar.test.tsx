import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustBar } from "./TrustBar";

describe("TrustBar", () => {
  it("renders the provided compliance text under the trust-bar testid", () => {
    render(<TrustBar text="🔞 18+ · 🔒 Secure · Play responsibly" />);
    const el = screen.getByTestId("trust-bar");
    expect(el).toHaveTextContent("18+");
    expect(el).toHaveTextContent("Play responsibly");
  });
});
