import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { StatsTabNav } from "./StatsTabNav";

describe("StatsTabNav", () => {
  it("marks Landings active on /admin and on a landing editor route", () => {
    usePathname.mockReturnValue("/admin/landings/abc");
    render(<StatsTabNav />);
    expect(screen.getByRole("link", { name: "Landings" }).className).toContain("active");
    expect(screen.getByRole("link", { name: "Statistics" }).className).not.toContain("active");
  });

  it("marks Statistics active on /admin/stats", () => {
    usePathname.mockReturnValue("/admin/stats");
    render(<StatsTabNav />);
    expect(screen.getByRole("link", { name: "Statistics" }).className).toContain("active");
    expect(screen.getByRole("link", { name: "Landings" }).className).not.toContain("active");
  });
});
