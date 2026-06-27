import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpinCoach } from "./SpinCoach";

describe("SpinCoach", () => {
  it("shows the nudge when show is true", () => {
    render(<SpinCoach show />);
    expect(screen.getByTestId("spin-coach")).toHaveTextContent(/tap to spin/i);
  });
  it("renders nothing when show is false", () => {
    const { container } = render(<SpinCoach show={false} />);
    expect(container.firstChild).toBeNull();
  });
});
