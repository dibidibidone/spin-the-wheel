// components/r3f/slots/gates-of-olympus/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Mount Olympus set: 4 golden treasures (crown · hourglass · ring · goblet), Greek temples,
// and Zeus's lightning — no colored gems. The win IS the multiplier storm: six of Zeus's
// multiplier orbs (×25 · ×50 · ×100 · ×150 · ×250 · ×500) drop across the 6×5 and pay.
// Orbs are not regular reel symbols (excluded from the spinning pool) — they only land on the win.
export const gatesTheme: SlotTheme = {
  reels: 6,
  rows: 5,
  symbols: [
    { id: "zeus", label: "Zeus", glyph: "⚡", color: "#E9DCFF", isWin: true, tier: 5 },
    { id: "crown", label: "Crown", glyph: "👑", color: "#FFD56A", tier: 4 },
    { id: "hourglass", label: "Hourglass", glyph: "⏳", color: "#FF7A5C", tier: 4 },
    { id: "ring", label: "Ring", glyph: "💍", color: "#7FD2FF", tier: 3 },
    { id: "chalice", label: "Goblet", glyph: "🏆", color: "#FFC94A", tier: 3 },
    { id: "temple", label: "Temple", glyph: "🏛️", color: "#CDBBFF", tier: 1 },
    { id: "orb25", label: "×25 orb", glyph: "×25", color: "#2FD8C0", isOrb: true },
    { id: "orb50", label: "×50 orb", glyph: "×50", color: "#5CE08A", isOrb: true },
    { id: "orb100", label: "×100 orb", glyph: "×100", color: "#7C5CFF", isOrb: true },
    { id: "orb150", label: "×150 orb", glyph: "×150", color: "#4AA8FF", isOrb: true },
    { id: "orb250", label: "×250 orb", glyph: "×250", color: "#FF5CA8", isOrb: true },
    { id: "orb500", label: "×500 orb", glyph: "×500", color: "#FFB020", isOrb: true },
  ],
  winSymbolId: "orb500",
  winCount: 6,
  winOnSpin: 2,
  // Near-miss: temples + treasures, no orbs — the storm doesn't break.
  nearMissGrid: [
    ["crown", "zeus", "temple", "ring", "temple"],
    ["temple", "hourglass", "ring", "crown", "chalice"],
    ["ring", "temple", "chalice", "zeus", "temple"],
    ["crown", "temple", "hourglass", "ring", "temple"],
    ["chalice", "temple", "zeus", "temple", "crown"],
    ["zeus", "ring", "temple", "crown", "hourglass"],
  ],
  // Win: six Zeus multiplier orbs (×25 · ×50 · ×100 · ×150 · ×250 · ×500) land across the grid.
  winGrid: [
    ["crown", "zeus", "orb25", "ring", "temple"],
    ["temple", "hourglass", "ring", "crown", "orb50"],
    ["ring", "orb100", "temple", "chalice", "zeus"],
    ["crown", "temple", "chalice", "orb150", "ring"],
    ["orb250", "temple", "hourglass", "temple", "crown"],
    ["zeus", "ring", "orb500", "crown", "temple"],
  ],
  winningCells: [
    [0, 2], [1, 4], [2, 1], [3, 3], [4, 0], [5, 2], // ×25 · ×50 · ×100 · ×150 · ×250 · ×500 — the multiplier storm
  ],
  durationMs: 2800,
  winDurationMs: 7500, // win drags out and settles slowly (a touch quicker than the 3D wheels)
  cabinet: { frame: "#241a52", glass: "#120c2e", glow: "#4a39a0", accent: "#FFD56A" },
};

export const gatesSound: SoundConfig = {
  tick: { freqs: [1040], ms: 42, gain: 0.16 },
  win: { freqs: [587, 740, 880], ms: 950, gain: 0.32 },
};

export const gatesCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Summon the Gates of Olympus",
  subtitle: "Call down Zeus's multiplier orbs",
  offerHeadline: "Win up to €1,000",
  offerSubline: "+ 500 Free Spins + ×500",
  ctaLabel: "INVOKE ZEUS",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "The storm didn't break — again!",
  winTitle: "Multiplier storm — You won",
  winPrize: "×500!",
  winEmoji: "⚡",
};

export const gatesOverlayVars: OverlayVars = {
  gold: "#FFD56A", accent: "#C9B6FF", surface: "#1a1140",
  text: "#ECE6FF", bannerBg: "#4a39a0", bannerBorder: "#FFD56A",
};

export const gatesConversion = withConversionDefaults({
  prize: "Gates Bonus — 500 Free Spins + ×500",
  scarcity: { total: 60 },
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
