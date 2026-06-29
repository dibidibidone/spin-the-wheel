import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveCounter } from "./LiveCounter";

describe("LiveCounter", () => {
  it("shows a 'playing now' live count from the seeded base", () => {
    render(<LiveCounter base={1200} reduced />); // reduced = no drift, mid rand => base
    const el = screen.getByTestId("live-counter");
    expect(el).toHaveTextContent(/playing now/i);
    expect(el).toHaveTextContent("1,200");
  });
});
