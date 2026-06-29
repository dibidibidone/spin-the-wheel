import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SceneLoader } from "./SceneLoader";

describe("SceneLoader", () => {
  it("renders a labelled status region with the themed label", () => {
    render(<SceneLoader label="Loading the Vault" accent="#F5C24B" bg="#070D0B" />);
    const status = screen.getByRole("status", { name: "Loading the Vault" });
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent("Loading the Vault");
  });

  it("applies the accent + bg as CSS custom properties for theming", () => {
    render(<SceneLoader label="Brewing" accent="#8BFF5A" bg="#0A1A14" />);
    const status = screen.getByRole("status", { name: "Brewing" });
    expect(status.style.getPropertyValue("--ld-accent")).toBe("#8BFF5A");
    expect(status.style.getPropertyValue("--ld-bg")).toBe("#0A1A14");
  });

  it("falls back to a default label", () => {
    render(<SceneLoader />);
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });
});
