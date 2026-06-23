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
    template: "classic-2d", pwaName: "App", pwaIconUrl: null, pwaUrl: "",
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

    expect(patchLanding).toHaveBeenCalledWith("l1", {
      name: "Promo",
      slug: "promo",
      status: "published",
      template: "classic-2d",
      pwaName: "App",
      pwaIconUrl: null,
      pwaUrl: ""
    });
  });
});

describe("SettingsTab — template + PWA", () => {
  it("shows the template select with the landing's value", () => {
    const testLanding: EditableLanding = {
      id: "1", slug: "demo", name: "Demo", status: "draft", heading: "", subtitle: "", backLabel: "",
      winTitle: "", claimLabel: "", almostText: "", theme: { bg: "#000000", surface: "#000000", accent: "#000000", gold: "#000000", text: "#000000", muted: "#000000" },
      logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
      spinsBeforeWin: 2, redirectUrl: "https://x.example.com", redirectPrizeParam: null, metaTitle: null, metaDescription: null,
      winningPrizeId: null, prizes: [], template: "jackpot-vault", pwaName: "Lucky App", pwaIconUrl: null, pwaUrl: "https://offer.example.com",
    };
    render(<SettingsTab landing={testLanding} />);
    expect((screen.getByLabelText("Template") as HTMLSelectElement).value).toBe("jackpot-vault");
  });
  it("shows the PWA app fields", () => {
    const testLanding: EditableLanding = {
      id: "1", slug: "demo", name: "Demo", status: "draft", heading: "", subtitle: "", backLabel: "",
      winTitle: "", claimLabel: "", almostText: "", theme: { bg: "#000000", surface: "#000000", accent: "#000000", gold: "#000000", text: "#000000", muted: "#000000" },
      logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
      spinsBeforeWin: 2, redirectUrl: "https://x.example.com", redirectPrizeParam: null, metaTitle: null, metaDescription: null,
      winningPrizeId: null, prizes: [], template: "jackpot-vault", pwaName: "Lucky App", pwaIconUrl: null, pwaUrl: "https://offer.example.com",
    };
    render(<SettingsTab landing={testLanding} />);
    expect((screen.getByLabelText("App name") as HTMLInputElement).value).toBe("Lucky App");
    expect((screen.getByLabelText("App link") as HTMLInputElement).value).toBe("https://offer.example.com");
  });

  it("hides the PWA group for the classic-2d template", () => {
    render(<SettingsTab landing={landing()} />); // landing() is classic-2d
    expect(screen.queryByLabelText("App name")).toBeNull();
    expect(screen.queryByLabelText("App link")).toBeNull();
  });

  it("reveals the PWA group after switching to a 3D template", async () => {
    render(<SettingsTab landing={landing()} />);
    expect(screen.queryByLabelText("App name")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Template"), "jackpot-vault");
    expect(screen.getByLabelText("App name")).toBeTruthy();
  });
});
