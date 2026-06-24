import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EditableLanding } from "@/lib/admin/types";

vi.mock("@/lib/adminClient", () => ({
  patchLanding: vi.fn(), putWheel: vi.fn(), uploadFile: vi.fn(), createLandingReq: vi.fn(),
}));

import { LandingEditor } from "@/components/admin/LandingEditor";

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

describe("LandingEditor", () => {
  it("shows the Content tab first and switches to Settings", async () => {
    render(<LandingEditor landing={landing()} />);
    expect(screen.getByLabelText("Heading")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("tab-settings"));
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("classic-2d shows all five tabs", () => {
    render(<LandingEditor landing={landing()} />);
    for (const t of ["content", "branding", "wheel", "settings", "domains"]) {
      expect(screen.getByTestId(`tab-${t}`)).toBeInTheDocument();
    }
  });

  it("a 3D wheel hides Branding but keeps Wheel", () => {
    render(<LandingEditor landing={{ ...landing(), template: "jackpot-vault" }} />);
    expect(screen.queryByTestId("tab-branding")).toBeNull();
    expect(screen.getByTestId("tab-wheel")).toBeInTheDocument();
  });

  it("a slot hides both Branding and Wheel", () => {
    render(<LandingEditor landing={{ ...landing(), template: "book-of-ra" }} />);
    expect(screen.queryByTestId("tab-branding")).toBeNull();
    expect(screen.queryByTestId("tab-wheel")).toBeNull();
    for (const t of ["content", "settings", "domains"]) {
      expect(screen.getByTestId(`tab-${t}`)).toBeInTheDocument();
    }
  });
});
