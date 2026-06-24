import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
vi.mock("@/lib/adminClient", () => ({ patchLanding: (...a: unknown[]) => patchLanding(...a) }));

import { ContentTab } from "@/components/admin/ContentTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    template: "classic-2d", pwaName: "App", pwaIconUrl: null, pwaUrl: "", winText: "",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => patchLanding.mockReset());

describe("ContentTab", () => {
  it("saves edited texts (empty meta sent as null)", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<ContentTab landing={landing()} />);

    const heading = screen.getByLabelText("Heading");
    await userEvent.clear(heading);
    await userEvent.type(heading, "Spin & Win");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", expect.objectContaining({
      heading: "Spin & Win",
      metaTitle: null,
      metaDescription: null,
    }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });
});
