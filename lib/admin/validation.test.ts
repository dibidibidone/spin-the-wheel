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

  it("accepts numeric fbPixelIds and rejects non-numeric", () => {
    const ok = parseLandingPatch({ fbPixelIds: ["123456789012345"] });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.fbPixelIds).toEqual(["123456789012345"]);
    expect(parseLandingPatch({ fbPixelIds: ["not-a-pixel"] }).ok).toBe(false);
  });
});

describe("parseWheelInput", () => {
  const prizes = [
    { label: "A", icon: "", color: "#1E7A3A", weight: 1 },
    { label: "B", icon: "👑", color: "#F5C24B", weight: 1 },
  ];

  it("accepts a minimal wheel payload (no URL — that lives in Settings now)", () => {
    const r = parseWheelInput({ spinsBeforeWin: 3, winningIndex: 1, prizes });
    expect(r.ok).toBe(true);
  });

  it("rejects winningIndex out of range", () => {
    expect(parseWheelInput({ spinsBeforeWin: 3, winningIndex: 2, prizes }).ok).toBe(false);
  });

  it("rejects fewer than two prizes", () => {
    expect(parseWheelInput({ spinsBeforeWin: 1, winningIndex: 0, prizes: [prizes[0]] }).ok).toBe(false);
  });
});

describe("parseCreateLanding", () => {
  it("requires a name", () => {
    expect(parseCreateLanding({ name: "Promo" }).ok).toBe(true);
    expect(parseCreateLanding({}).ok).toBe(false);
  });

  it("defaults the template to classic-2d when omitted", () => {
    const r = parseCreateLanding({ name: "Promo" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.template).toBe("classic-2d");
  });

  it("accepts an explicit template", () => {
    const r = parseCreateLanding({ name: "Promo", template: "book-of-ra" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.template).toBe("book-of-ra");
  });

  it("rejects an unknown template", () => {
    expect(parseCreateLanding({ name: "Promo", template: "roulette" }).ok).toBe(false);
  });
});

describe("parseLandingPatch — template + PWA", () => {
  it("accepts a valid template, PWA fields and the app link (redirectUrl)", () => {
    const r = parseLandingPatch({
      template: "jackpot-vault",
      pwaName: "Lucky App",
      pwaIconUrl: "https://cdn.example.com/icon.png",
      redirectUrl: "https://offer.example.com/go",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects the removed pwaUrl field", () => {
    expect(parseLandingPatch({ pwaUrl: "https://x.example.com" }).ok).toBe(false);
  });

  it("accepts winText", () => {
    expect(parseLandingPatch({ winText: "200 Free Spins" }).ok).toBe(true);
  });

  it("accepts conversion fields", () => {
    const r = parseLandingPatch({ offerHeadline: "Win up to €500", offerSubline: "+ 200 FS", bonusesTotal: 50, countdownMinutes: 7 });
    expect(r.ok).toBe(true);
  });

  it("rejects countdownMinutes below 1", () => {
    expect(parseLandingPatch({ countdownMinutes: 0 }).ok).toBe(false);
  });

  it("accepts spinsBeforeWin (slots edit it in Settings)", () => {
    expect(parseLandingPatch({ spinsBeforeWin: 2 }).ok).toBe(true);
  });

  it("accepts a valid https app link (redirectUrl)", () => {
    expect(parseLandingPatch({ redirectUrl: "https://example.com/claim" }).ok).toBe(true);
  });

  it("rejects a javascript: scheme app link (open-redirect guard)", () => {
    expect(parseLandingPatch({ redirectUrl: "javascript:alert(1)" }).ok).toBe(false);
  });

  it("rejects an unknown template", () => {
    const r = parseLandingPatch({ template: "roulette" });
    expect(r.ok).toBe(false);
  });
});
