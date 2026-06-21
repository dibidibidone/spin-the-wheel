import { describe, it, expect } from "vitest";
import { parseLandingPatch, parseWheelInput, parseCreateLanding } from "@/lib/admin/validation";

const theme = { bg: "#0A1410", surface: "#13251A", accent: "#27C24C", gold: "#F5C24B", text: "#EAF6EE", muted: "#7FA88E" };

describe("parseLandingPatch", () => {
  it("accepts a partial patch of known fields", () => {
    const r = parseLandingPatch({ heading: "New", theme });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ heading: "New", theme });
  });

  it("accepts nullable asset URLs and meta fields", () => {
    const r = parseLandingPatch({ logoUrl: null, metaTitle: null, faviconUrl: "https://cdn.x/f.png" });
    expect(r.ok).toBe(true);
  });

  it("rejects an unknown key", () => {
    expect(parseLandingPatch({ nope: 1 }).ok).toBe(false);
  });

  it("rejects a bad slug", () => {
    expect(parseLandingPatch({ slug: "Has Spaces" }).ok).toBe(false);
  });

  it("rejects a non-hex theme color", () => {
    expect(parseLandingPatch({ theme: { ...theme, accent: "green" } }).ok).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(parseLandingPatch({ status: "live" }).ok).toBe(false);
  });
});

describe("parseWheelInput", () => {
  const prizes = [
    { label: "A", icon: "", color: "#1E7A3A", weight: 1 },
    { label: "B", icon: "👑", color: "#F5C24B", weight: 1 },
  ];

  it("accepts a valid wheel payload", () => {
    const r = parseWheelInput({ spinsBeforeWin: 3, winningIndex: 1, redirectUrl: "https://x.com", redirectPrizeParam: "bonus", prizes });
    expect(r.ok).toBe(true);
  });

  it("rejects winningIndex out of range", () => {
    expect(parseWheelInput({ spinsBeforeWin: 3, winningIndex: 2, redirectUrl: "https://x.com", redirectPrizeParam: null, prizes }).ok).toBe(false);
  });

  it("rejects fewer than two prizes", () => {
    expect(parseWheelInput({ spinsBeforeWin: 1, winningIndex: 0, redirectUrl: "https://x.com", redirectPrizeParam: null, prizes: [prizes[0]] }).ok).toBe(false);
  });

  it("rejects a non-URL redirect", () => {
    expect(parseWheelInput({ spinsBeforeWin: 1, winningIndex: 0, redirectUrl: "not-a-url", redirectPrizeParam: null, prizes }).ok).toBe(false);
  });

  it("rejects a javascript: scheme redirectUrl", () => {
    expect(parseWheelInput({ spinsBeforeWin: 3, winningIndex: 1, redirectUrl: "javascript:alert(1)", redirectPrizeParam: null, prizes }).ok).toBe(false);
  });

  it("accepts a valid https redirectUrl", () => {
    expect(parseWheelInput({ spinsBeforeWin: 3, winningIndex: 1, redirectUrl: "https://example.com/claim", redirectPrizeParam: null, prizes }).ok).toBe(true);
  });
});

describe("parseCreateLanding", () => {
  it("requires a name", () => {
    expect(parseCreateLanding({ name: "Promo" }).ok).toBe(true);
    expect(parseCreateLanding({}).ok).toBe(false);
  });
});
