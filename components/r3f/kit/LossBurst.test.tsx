import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LossBurst } from "./LossBurst";

describe("LossBurst", () => {
  it("renders the burst with the provided almost text", () => {
    render(<LossBurst text="Almost! Spin again" />);
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
    expect(screen.getByText("Almost! Spin again")).toBeInTheDocument();
  });
  it("renders the flash even with empty text", () => {
    render(<LossBurst text="" />);
    expect(screen.getByTestId("loss-burst")).toBeInTheDocument();
  });
});
