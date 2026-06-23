// components/r3f/slots/gates-of-olympus/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Mount Olympus set (pay-anywhere / scatter-pays). The win is a real 8-of-a-kind
// purple-gem cluster anywhere on the 6×5, plus two Zeus multiplier orbs (×100 + ×500).
// Zeus is the scatter; orbs are not regular reel symbols (excluded from the spinning pool).
export const gatesTheme: SlotTheme = {
  reels: 6,
  rows: 5,
  symbols: [
    { id: "zeus", label: "Zeus orb", glyph: "⚡", color: "#E9DCFF", isWin: true, tier: 5 },
    { id: "crown", label: "Crown", glyph: "👑", color: "#FFD56A", tier: 4 },
    { id: "hourglass", label: "Hourglass", glyph: "⌛", color: "#F2C879", tier: 4 },
    { id: "ring", label: "Ring", glyph: "💍", color: "#9FE0FF", tier: 3 },
    { id: "chalice", label: "Chalice", glyph: "🍷", color: "#FF8FB0", tier: 3 },
    { id: "gemRed", label: "Red gem", glyph: "🔴", color: "#FF5C6C", tier: 1 },
    { id: "gemBlue", label: "Blue gem", glyph: "🔵", color: "#5C8CFF", tier: 1 },
    { id: "gemGreen", label: "Green gem", glyph: "🟢", color: "#5CE08A", tier: 1 },
    { id: "gemPurple", label: "Purple gem", glyph: "🟣", color: "#C081FF", tier: 2 },
    { id: "orb100", label: "×100 orb", glyph: "×100", color: "#FFB020", isOrb: true },
    { id: "orb500", label: "×500 orb", glyph: "×500", color: "#FFB020", isOrb: true },
  ],
  winSymbolId: "gemPurple",
  winCount: 8,
  winOnSpin: 2,
  // Near-miss: 7 purple gems scattered (one short of the 8 needed), no orbs.
  nearMissGrid: [
    ["crown", "gemPurple", "gemRed", "gemBlue", "ring"],
    ["gemGreen", "hourglass", "gemPurple", "chalice", "crown"],
    ["gemPurple", "gemRed", "gemGreen", "ring", "gemGreen"],
    ["chalice", "gemPurple", "gemBlue", "gemRed", "gemRed"],
    ["ring", "gemGreen", "gemPurple", "gemBlue", "gemRed"],
    ["gemPurple", "chalice", "gemRed", "gemPurple", "crown"],
  ],
  // Win: 8 purple gems "pay anywhere" + two Zeus multiplier orbs (×100 + ×500 → ×500).
  winGrid: [
    ["crown", "gemPurple", "gemRed", "gemBlue", "ring"],
    ["gemGreen", "hourglass", "gemPurple", "chalice", "crown"],
    ["gemPurple", "gemRed", "orb100", "ring", "gemGreen"],
    ["chalice", "gemPurple", "gemBlue", "gemPurple", "gemRed"],
    ["ring", "gemGreen", "gemPurple", "gemBlue", "orb500"],
    ["gemPurple", "chalice", "gemRed", "gemPurple", "crown"],
  ],
  winningCells: [
    [0, 1], [1, 2], [2, 0], [3, 1], [3, 3], [4, 2], [5, 0], [5, 3], // 8 purple gems
    [2, 2], [4, 4],                                                  // ×100 + ×500 orbs
  ],
  durationMs: 2800,
  cabinet: { frame: "#241a52", glass: "#120c2e", glow: "#4a39a0", accent: "#FFD56A" },
};

export const gatesSound: SoundConfig = {
  tick: { freqs: [1040], ms: 42, gain: 0.16 },
  win: { freqs: [587, 740, 880], ms: 950, gain: 0.32 },
};

export const gatesCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Summon the Gates of Olympus",
  subtitle: "Land 8 matching gems to call the storm",
  ctaLabel: "INVOKE ZEUS",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "Seven gems — one more!",
  winTitle: "Pay anywhere — You won",
  winPrize: "×500!",
  winEmoji: "⚡",
};

export const gatesOverlayVars: OverlayVars = {
  gold: "#FFD56A", accent: "#C9B6FF", surface: "#1a1140",
  text: "#ECE6FF", bannerBg: "#4a39a0", bannerBorder: "#FFD56A",
};

export const gatesConversion = withConversionDefaults({
  prize: "Gates Bonus — 500 Free Spins + ×500",
  claimLabel: "Claim the storm bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register?src=gates-of-olympus",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Elena", amount: "×250", minutesAgo: 1 },
      { name: "Dimitri", amount: "€800", minutesAgo: 4 },
      { name: "Aisha", amount: "×500", minutesAgo: 7 },
    ],
    todayCount: 4106,
  },
});
