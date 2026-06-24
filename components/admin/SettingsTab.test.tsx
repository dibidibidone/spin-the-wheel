import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

const patchLanding = vi.fn();
vi.mock("@/lib/adminClient", () => ({ patchLanding: (...a: unknown[]) => patchLanding(...a), uploadFile: vi.fn() }));

import { SettingsTab } from "@/components/admin/SettingsTab";

function landing(): EditableLanding {
  return {
    id: "l1", slug: "promo", name: "Promo", status: "draft",
    heading: "Spin", subtitle: "win", backLabel: "Back", winTitle: "You won {prize}!",
    claimLabel: "Claim", almostText: "Almost!", winText: "",
    template: "classic-2d", pwaName: "App", pwaIconUrl: null,
    theme: { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" },
    logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null,
    spinsBeforeWin: 3, redirectUrl: "https://x.com", redirectPrizeParam: "bonus",
    metaTitle: null, metaDescription: null, winningPrizeId: "p1", prizes: [],
  };
}

beforeEach(() => patchLanding.mockReset());

describe("SettingsTab", () => {
  it("publishes the landing with the logo + app link payload", async () => {
    patchLanding.mockResolvedValue({ ok: true });
    render(<SettingsTab landing={landing()} />);

    await userEvent.selectOptions(screen.getByLabelText("Status"), "published");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(patchLanding).toHaveBeenCalledWith("l1", {
      name: "Promo",
      slug: "promo",
      status: "published",
      template: "classic-2d",
      logoUrl: null,
      redirectUrl: "https://x.com",
      pwaName: "App",
      pwaIconUrl: null,
    });
  });
});

describe("SettingsTab — per-kind fields", () => {
  it("shows the template select with the landing's value", () => {
    render(<SettingsTab landing={{ ...landing(), template: "jackpot-vault" }} />);
    expect((screen.getByLabelText("Template") as HTMLSelectElement).value).toBe("jackpot-vault");
  });

  it("shows the App link + casino logo + PWA fields for a wheel (no slot fields)", () => {
    render(<SettingsTab landing={landing()} />);
    expect(screen.getByLabelText("App link")).toBeInTheDocument();
    expect(screen.getByText("Casino logo")).toBeInTheDocument();
    expect(screen.getByLabelText("App name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Spins before win")).toBeNull(); // wheels edit spins in the Wheel tab
    expect(screen.queryByLabelText("Win text")).toBeNull();
  });

  it("shows Win text + Spins for a slot", () => {
    render(<SettingsTab landing={{ ...landing(), template: "book-of-ra", winText: "200 Free Spins" }} />);
    expect((screen.getByLabelText("Win text") as HTMLInputElement).value).toBe("200 Free Spins");
    expect(screen.getByLabelText("Spins before win")).toBeInTheDocument();
  });

  it("reveals the slot fields after switching to a slot template", async () => {
    render(<SettingsTab landing={landing()} />);
    expect(screen.queryByLabelText("Win text")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Template"), "book-of-ra");
    expect(screen.getByLabelText("Win text")).toBeInTheDocument();
  });
});
