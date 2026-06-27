import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScarcityLine } from "./ScarcityLine";

describe("ScarcityLine", () => {
  it("shows 'X of total bonuses left' for a positive total", () => {
    render(<ScarcityLine total={50} />);
    const el = screen.getByTestId("scarcity-line");
    expect(el).toHaveTextContent(/of 50 bonuses left/i);
  });
  it("renders nothing when total is 0", () => {
    const { container } = render(<ScarcityLine total={0} />);
    expect(container.firstChild).toBeNull();
  });
});
