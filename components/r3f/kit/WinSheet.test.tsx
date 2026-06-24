import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WinSheet } from "./WinSheet";
import { withConversionDefaults } from "./conversion";

const copy = {
  logo: "X", heading: "h", ctaLabel: "SPIN", spinningLabel: "...",
  winTitle: "You won", winPrize: "JACKPOT!", claimLabel: "Claim", winEmoji: "💰",
};
const config = withConversionDefaults({ prize: "500 Free Spins", registerField: "email" });

describe("WinSheet", () => {
  it("is hidden when step is hidden", () => {
    render(<WinSheet step="hidden" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={() => {}} onDismiss={() => {}} />);
    expect(screen.getByTestId("win-modal")).toHaveAttribute("hidden");
  });

  it("reveal shows prize + claim-open, which fires onOpen", async () => {
    const onOpen = vi.fn();
    render(<WinSheet step="reveal" copy={copy} config={config} reduced onOpen={onOpen} onSubmit={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText("500 Free Spins")).toBeVisible();
    await userEvent.click(screen.getByTestId("claim-open"));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("form shows the field with the right input type and submits its value", async () => {
    const onSubmit = vi.fn();
    render(<WinSheet step="form" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={onSubmit} onDismiss={() => {}} />);
    const field = screen.getByTestId("claim-field");
    expect(field).toHaveAttribute("type", "email");
    await userEvent.type(field, "a@b.com");
    await userEvent.click(screen.getByTestId("claim-submit"));
    expect(onSubmit).toHaveBeenCalledWith("a@b.com");
  });

  it("form submits even when the field is empty (never blocks conversion)", async () => {
    const onSubmit = vi.fn();
    render(<WinSheet step="form" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={onSubmit} onDismiss={() => {}} />);
    await userEvent.click(screen.getByTestId("claim-submit"));
    expect(onSubmit).toHaveBeenCalledWith("");
  });

  it("submitting disables the field and the submit button", () => {
    render(<WinSheet step="submitting" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={() => {}} onDismiss={() => {}} />);
    expect(screen.getByTestId("claim-field")).toBeDisabled();
    expect(screen.getByTestId("claim-submit")).toBeDisabled();
  });

  it("uses the provided logoSrc for the casino logo", () => {
    render(<WinSheet step="reveal" copy={copy} config={config} reduced logoSrc="https://cdn.example.com/casino.svg" onOpen={() => {}} onSubmit={() => {}} onDismiss={() => {}} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://cdn.example.com/casino.svg");
  });

  it("falls back to the default logo when logoSrc is omitted", () => {
    render(<WinSheet step="reveal" copy={copy} config={config} reduced onOpen={() => {}} onSubmit={() => {}} onDismiss={() => {}} />);
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/boomzino-logo.svg");
  });
});
