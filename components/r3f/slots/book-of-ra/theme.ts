// components/r3f/slots/book-of-ra/theme.ts
import type { SlotTheme, SoundConfig, OverlayCopy } from "../../kit/types";
import type { OverlayVars } from "../../kit/SpinOverlay";
import { withConversionDefaults } from "../../kit/conversion";

// Egyptian temple set. "book" is the scatter/win symbol; 3 books = the win.
export const bookOfRaTheme: SlotTheme = {
  reels: 5,
  rows: 3,
  symbols: [
    { id: "book", label: "Book of Riches", glyph: "📖", color: "#FFD24A", isWin: true },
    { id: "explorer", label: "Explorer", glyph: "🧭", color: "#F2E2B6" },
    { id: "pharaoh", label: "Pharaoh", glyph: "👑", color: "#FFCF6A" },
    { id: "scarab", label: "Scarab", glyph: "🪲", color: "#7FD1B9" },
    { id: "statue", label: "Statue", glyph: "🗿", color: "#D9C9A3" },
    { id: "A", label: "Ace", glyph: "A", color: "#EFE6CC" },
    { id: "K", label: "King", glyph: "K", color: "#EFE6CC" },
    { id: "Q", label: "Queen", glyph: "Q", color: "#EFE6CC" },
    { id: "J", label: "Jack", glyph: "J", color: "#EFE6CC" },
    { id: "T", label: "Ten", glyph: "10", color: "#EFE6CC" },
  ],
  winSymbolId: "book",
  winCount: 3,
  winOnSpin: 2,
  // 2 books (reels 0 & 2) — the 3rd never lands: a near-miss.
  nearMissGrid: [
    ["A", "book", "K"],
    ["Q", "J", "scarab"],
    ["book", "explorer", "T"],
    ["pharaoh", "A", "Q"],
    ["J", "scarab", "K"],
  ],
  // 3 books across the middle line (reels 0, 2, 4) — the win.
  winGrid: [
    ["A", "book", "K"],
    ["Q", "J", "scarab"],
    ["explorer", "book", "T"],
    ["pharaoh", "A", "Q"],
    ["K", "book", "scarab"],
  ],
  durationMs: 2600,
  cabinet: { frame: "#3a2410", glass: "#1c1206", glow: "#7a4a12", accent: "#C8881E" },
};

export const bookOfRaSound: SoundConfig = {
  tick: { freqs: [880], ms: 45, gain: 0.16 },
  win: { freqs: [523, 659, 784], ms: 900, gain: 0.3 },
};

export const bookOfRaCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Unseal the Book of Riches",
  subtitle: "Land 3 Books to open the bonus",
  ctaLabel: "SPIN THE TEMPLE",
  spinningLabel: "SPINNING…",
  retryLabel: "So close — try again!",
  nearMissLine: "Two Books landed — one more!",
  winTitle: "The Book opens — You won",
  winPrize: "BONUS!",
  winEmoji: "📖",
};

export const bookOfRaOverlayVars: OverlayVars = {
  gold: "#F5C24B", accent: "#FFD56A", surface: "#241606",
  text: "#F4ECD8", bannerBg: "#7a4a12", bannerBorder: "#F5C24B",
};

export const bookOfRaConversion = withConversionDefaults({
  prize: "Book of Riches — 200 Free Spins",
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
