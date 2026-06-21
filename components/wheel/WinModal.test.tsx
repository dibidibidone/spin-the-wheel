import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WinModal } from "@/components/wheel/WinModal";

describe("WinModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <WinModal open={false} title="You won JACKPOT!" prizeLabel="JACKPOT" claimLabel="Claim" onClaim={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the title and fires onClaim", async () => {
    const onClaim = vi.fn();
    render(<WinModal open title="You won JACKPOT!" prizeLabel="JACKPOT" claimLabel="Claim bonus" onClaim={onClaim} />);
    expect(screen.getByText("You won JACKPOT!")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Claim bonus" }));
    expect(onClaim).toHaveBeenCalledOnce();
  });
});
