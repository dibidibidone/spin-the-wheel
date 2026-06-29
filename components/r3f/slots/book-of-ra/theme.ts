// components/r3f/slots/book-of-ra/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Egyptian temple set (payline game). The win is a real 5-of-a-kind Explorer line
// (Explorer is the top payer); the Book is the wild + scatter.
export const bookOfRaTheme: SlotTheme = {
  reels: 5,
  rows: 3,
  symbols: [
    { id: "book", label: "Book of Ra", glyph: "📖", color: "#FFD24A", isWin: true, tier: 5 },
    { id: "explorer", label: "Explorer", glyph: "🧭", color: "#FFE3A0", tier: 5 },
    { id: "pharaoh", label: "Eye of Horus", glyph: "👁️", color: "#86E3FF", tier: 4 },
    { id: "anubis", label: "Anubis", glyph: "🐺", color: "#D7B477", tier: 4 },
    { id: "scarab", label: "Scarab", glyph: "🪲", color: "#7FD1B9", tier: 3 },
    { id: "A", label: "Ace", glyph: "A", color: "#F0E7CD", tier: 2 },
    { id: "K", label: "King", glyph: "K", color: "#F0E7CD", tier: 2 },
    { id: "Q", label: "Queen", glyph: "Q", color: "#E3D8BB", tier: 1 },
    { id: "J", label: "Jack", glyph: "J", color: "#E3D8BB", tier: 1 },
    { id: "T", label: "Ten", glyph: "10", color: "#E3D8BB", tier: 1 },
  ],
  winSymbolId: "explorer",
  winCount: 5,
  winOnSpin: 2,
  // Near-miss: 4 Explorers on the centre line; reel 4 lands the Eye of Horus instead (one short).
  nearMissGrid: [
    ["A", "explorer", "K"],
    ["book", "explorer", "scarab"],
    ["Q", "explorer", "J"],
    ["scarab", "explorer", "anubis"],
    ["K", "pharaoh", "book"],
  ],
  // Win: 5 Explorers across the centre line — a genuine payline.
  winGrid: [
    ["A", "explorer", "K"],
    ["book", "explorer", "scarab"],
    ["Q", "explorer", "J"],
    ["scarab", "explorer", "anubis"],
    ["K", "explorer", "pharaoh"],
  ],
  winningCells: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
  winLineRow: 1,
  durationMs: 2600,
  winDurationMs: 7500, // win drags out and settles slowly (a touch quicker than the 3D wheels)
  cabinet: { frame: "#3a2410", glass: "#1c1206", glow: "#7a4a12", accent: "#C8881E" },
};

export const bookOfRaSound: SoundConfig = {
  tick: { freqs: [880], ms: 45, gain: 0.16 },
  win: { freqs: [523, 659, 784], ms: 900, gain: 0.3 },
};

export const bookOfRaCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Unseal the Book of Riches",
  subtitle: "Line up 5 Explorers across a payline",
  offerHeadline: "Win up to €500",
  offerSubline: "+ 200 Free Spins",
  ctaLabel: "SPIN THE TEMPLE",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "Four Explorers — one more!",
  winTitle: "Explorer payline — You won",
  winPrize: "BIG WIN!",
  winEmoji: "🧭",
};

export const bookOfRaOverlayVars: OverlayVars = {
  gold: "#F5C24B", accent: "#FFD56A", surface: "#241606",
  text: "#F4ECD8", bannerBg: "#7a4a12", bannerBorder: "#F5C24B",
};

export const bookOfRaConversion = withConversionDefaults({
  prize: "Book of Riches — 200 Free Spins",
  scarcity: { total: 45 },
  claimLabel: "Open my bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register?src=book-of-ra",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Khaled", amount: "200 FS", minutesAgo: 2 },
      { name: "Sofia", amount: "€300", minutesAgo: 5 },
      { name: "Marco", amount: "BONUS", minutesAgo: 9 },
    ],
    todayCount: 2874,
  },
});
