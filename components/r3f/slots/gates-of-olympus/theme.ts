// components/r3f/slots/gates-of-olympus/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Mount Olympus set. "zeus" is the scatter/win symbol; 4 scatters = the win.
export const gatesTheme: SlotTheme = {
  reels: 6,
  rows: 5,
  symbols: [
    { id: "zeus", label: "Zeus orb", glyph: "⚡", color: "#C9B6FF", isWin: true },
    { id: "crown", label: "Crown", glyph: "👑", color: "#FFD56A" },
    { id: "hourglass", label: "Hourglass", glyph: "⌛", color: "#F2C879" },
    { id: "ring", label: "Ring", glyph: "💍", color: "#9FE0FF" },
    { id: "chalice", label: "Chalice", glyph: "🍷", color: "#FF8FB0" },
    { id: "gemRed", label: "Red gem", glyph: "🔴", color: "#FF5C6C" },
    { id: "gemBlue", label: "Blue gem", glyph: "🔵", color: "#5C8CFF" },
    { id: "gemGreen", label: "Green gem", glyph: "🟢", color: "#5CE08A" },
    { id: "gemPurple", label: "Purple gem", glyph: "🟣", color: "#B06CFF" },
  ],
  winSymbolId: "zeus",
  winCount: 4,
  winOnSpin: 2,
  // 3 zeus scatters (reels 0, 2, 4) — the 4th never lands: a near-miss.
  nearMissGrid: [
    ["crown", "zeus", "gemRed", "gemBlue", "ring"],
    ["gemGreen", "hourglass", "chalice", "gemPurple", "crown"],
    ["gemBlue", "gemRed", "zeus", "ring", "gemGreen"],
    ["chalice", "gemPurple", "gemBlue", "hourglass", "gemRed"],
    ["ring", "gemGreen", "zeus", "gemBlue", "crown"],
    ["gemRed", "chalice", "gemPurple", "ring", "hourglass"],
  ],
  // 4 zeus scatters (reels 0, 2, 4, 5) — the win.
  winGrid: [
    ["crown", "zeus", "gemRed", "gemBlue", "ring"],
    ["gemGreen", "hourglass", "chalice", "gemPurple", "crown"],
    ["gemBlue", "gemRed", "zeus", "ring", "gemGreen"],
    ["chalice", "gemPurple", "gemBlue", "hourglass", "gemRed"],
    ["ring", "gemGreen", "zeus", "gemBlue", "crown"],
    ["gemRed", "zeus", "gemPurple", "ring", "hourglass"],
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
  subtitle: "Land 4 Zeus orbs to call the storm",
  ctaLabel: "INVOKE ZEUS",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "Three orbs charged — one more!",
  winTitle: "Zeus answers — You won",
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
