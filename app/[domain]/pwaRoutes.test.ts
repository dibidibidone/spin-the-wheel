import { describe, it, expect, vi, beforeEach } from "vitest";

const view = {
  slug: "demo",
  texts: { heading: "Lucky", subtitle: "", backLabel: "", winTitle: "", claimLabel: "", almostText: "" },
  theme: { bg: "#070D0B", surface: "#111", accent: "#222", gold: "#F5C24B", text: "#fff", muted: "#888" },
  assets: { logoUrl: null, faviconUrl: null, coinImageUrl: null, bgImageUrl: null },
  segments: [], spin: { segmentCount: 8, spinsBeforeWin: 2, winningIndex: 7, behavior: "near-miss" as const },
  redirectUrl: "https://offer.example.com/go", redirectPrizeParam: null, winningPrizeLabel: "JACKPOT", winText: "",
  metaTitle: "t", metaDescription: "d",
  template: "jackpot-vault", pwaName: "Lucky App", pwaIconUrl: "https://cdn.example.com/i.png",
};

vi.mock("@/lib/tenant", () => ({ getLandingByHost: vi.fn() }));
import { getLandingByHost } from "@/lib/tenant";
import { GET as manifestGET } from "./manifest/route";
import { GET as goGET } from "./go/route";

const ctx = (domain: string) => ({ params: Promise.resolve({ domain }) });

beforeEach(() => vi.mocked(getLandingByHost).mockReset());

describe("GET /manifest", () => {
  it("returns the landing's app name, icon and start_url", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(view as never);
    const res = await manifestGET(new Request("http://x/manifest"), ctx("lucky.example.com"));
    expect(res.headers.get("content-type")).toContain("application/manifest+json");
    const m = await res.json();
    expect(m.name).toBe("Lucky App");
    expect(m.start_url).toBe("/launch");
    expect(m.icons[0].src).toBe("https://cdn.example.com/i.png");
  });

  it("404s for an unknown host", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(null);
    const res = await manifestGET(new Request("http://x/manifest"), ctx("nope.example.com"));
    expect(res.status).toBe(404);
  });
});

describe("GET /go", () => {
  it("redirects to the landing's redirectUrl (the single PWA link)", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(view as never);
    const res = await goGET(new Request("http://x/go"), ctx("lucky.example.com"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://offer.example.com/go");
  });

  it("404s for an unknown host", async () => {
    vi.mocked(getLandingByHost).mockResolvedValue(null);
    const res = await goGET(new Request("http://x/go"), ctx("nope.example.com"));
    expect(res.status).toBe(404);
  });
});
