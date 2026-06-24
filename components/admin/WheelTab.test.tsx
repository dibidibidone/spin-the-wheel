import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const putWheel = vi.fn();
vi.mock("@/lib/adminClient", () => ({ putWheel: (...a: unknown[]) => putWheel(...a) }));

import { WheelTab } from "@/components/admin/WheelTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    template: "classic-2d", pwaName: "App", pwaIconUrl: null, winText: "",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1",
    prizes: [
      { id: "p0", order: 0, label: "€5", icon: "💶", color: "#1E7A3A", weight: 1 },
      { id: "p1", order: 1, label: "JACKPOT", icon: "👑", color: "#F5C24B", weight: 1 },
    ],
  };
}

beforeEach(() => putWheel.mockReset());

describe("WheelTab", () => {
  it("saves the prizes, winning index and spin config", async () => {
    putWheel.mockResolvedValue({ ok: true });
    render(<WheelTab landing={landing()} />);

    // winning radio for the 2nd prize (index 1) is pre-selected from winningPrizeId
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(putWheel).toHaveBeenCalledWith("l1", expect.objectContaining({
      spinsBeforeWin: 3,
      winningIndex: 1,
      prizes: [
        expect.objectContaining({ label: "€5" }),
        expect.objectContaining({ label: "JACKPOT" }),
      ],
    }));
    // the URL moved to Settings — the wheel payload no longer carries it
    const payload = putWheel.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.redirectUrl).toBeUndefined();
    expect(payload.redirectPrizeParam).toBeUndefined();
  });

  it("no longer renders the Redirect URL / prize-param inputs", () => {
    render(<WheelTab landing={landing()} />);
    expect(screen.queryByText("Redirect URL")).toBeNull();
    expect(screen.queryByText("Prize query param (optional)")).toBeNull();
  });

  it("adds a prize row", async () => {
    putWheel.mockResolvedValue({ ok: true });
    render(<WheelTab landing={landing()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add prize" }));
    expect(screen.getAllByTestId("prize-row")).toHaveLength(3);
  });
});
