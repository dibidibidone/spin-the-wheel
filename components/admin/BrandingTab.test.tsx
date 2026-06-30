import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
const uploadFile = vi.fn();
vi.mock("@/lib/adminClient", () => ({
  patchLanding: (...a: unknown[]) => patchLanding(...a),
  uploadFile: (...a: unknown[]) => uploadFile(...a),
}));

import { BrandingTab } from "@/components/admin/BrandingTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!",
    template: "classic-2d", pwaName: "App", pwaIconUrl: null, winText: "",
    offerHeadline: "", offerSubline: "", bonusesTotal: 0, countdownMinutes: 60, atmosphere: "normal",
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null, fbPixelIds: [],
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => {
  patchLanding.mockReset();
  uploadFile.mockReset();
});

describe("BrandingTab", () => {
  it("saves theme colors and asset urls", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<BrandingTab landing={landing()} />);

    const accent = screen.getByLabelText("Accent");
    await userEvent.clear(accent);
    await userEvent.type(accent, "#00FF00");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", expect.objectContaining({
      theme: expect.objectContaining({ accent: "#00FF00" }),
      logoUrl: null,
    }));
  });

  it("uploads a logo and stores the returned url", async () => {
    uploadFile.mockResolvedValue({ url: "https://blob/logo.png" });
    patchLanding.mockResolvedValue({ ok: true });
    render(<BrandingTab landing={landing()} />);

    const file = new File(["d"], "logo.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Logo"), file);
    expect(uploadFile).toHaveBeenCalledWith(file);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(patchLanding).toHaveBeenCalledWith("l1", expect.objectContaining({ logoUrl: "https://blob/logo.png" }));
  });
});
