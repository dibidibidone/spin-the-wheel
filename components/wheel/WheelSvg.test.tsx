import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import type { WheelSegment } from "@/lib/types";

const segments: WheelSegment[] = [
  { id: "a", order: 0, label: "€5", icon: "💶", color: "#1E7A3A" },
  { id: "b", order: 1, label: "50 FS", icon: "🎰", color: "#2BA552" },
  { id: "c", order: 2, label: "€10", icon: "💶", color: "#1E7A3A" },
  { id: "d", order: 3, label: "JACKPOT", icon: "👑", color: "#F5C24B" },
];

describe("WheelSvg", () => {
  it("renders one wedge per segment", () => {
    render(<WheelSvg segments={segments} size={300} />);
    expect(screen.getAllByTestId("wheel-segment")).toHaveLength(4);
  });

  it("renders each segment label", () => {
    render(<WheelSvg segments={segments} size={300} />);
    expect(screen.getByText("JACKPOT")).toBeInTheDocument();
    expect(screen.getByText("€5")).toBeInTheDocument();
  });
});
