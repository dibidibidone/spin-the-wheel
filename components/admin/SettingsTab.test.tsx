import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
vi.mock("@/lib/adminClient", () => ({ patchLanding: (...a: unknown[]) => patchLanding(...a) }));

import { SettingsTab } from "@/components/admin/SettingsTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => patchLanding.mockReset());

describe("SettingsTab", () => {
  it("publishes the landing", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<SettingsTab landing={landing()} />);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "published");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", { name: "Promo", slug: "promo", status: "published" });
  });
});
