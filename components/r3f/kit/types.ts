export type ToneSpec = { freqs: number[]; ms: number; gain: number };
export type SoundConfig = { tick: ToneSpec; win: ToneSpec };
export type SoundInstance = { tick(): void; win(): void; setMuted(m: boolean): void; muted(): boolean };

export type WheelTheme = {
  labels: string[];
  segmentColors: string[];
  goldIndices: number[];
  jackpotIndex: number;
  goldColor: string;
  rimColor: string;
  bulbColor: string;
  labelColor: string;
  radius: number;
};

export type OverlayCopy = {
  logo: string;
  heading: string;
  subtitle?: string;
  subBanner?: string;
  offerHeadline?: string;  // bold prize headline above the game (Variant A)
  offerSubline?: string;   // gold sub-line under the headline (e.g. "+ 200 Free Spins")
  ctaLabel: string;
  spinningLabel: string;
  retryLabel?: string;     // shown on the CTA during a near-miss
  nearMissLine?: string;   // short sub-line under the CTA during a near-miss
  almostText?: string;     // the "almost!" line popped by LossBurst on a near-miss
  winTitle: string;
  winPrize: string;
  winEmoji: string;
};

export type RegisterField = "email" | "tel";

export type SocialProofItem = { name: string; amount: string; minutesAgo: number };

export type ConversionConfig = {
  prize: string;
  claimLabel: string;
  registerField: RegisterField;
  registerPlaceholder: string;
  redirectUrl: string;
  urgencyMs: number;
  scarcity?: { total: number };  // "X of {total} bonuses left"; omit/0 hides the line
  social: { winners: SocialProofItem[]; todayCount: number };
  trust: string;
};

export type OverlayStatus = "idle" | "spinning" | "nearmiss" | "won";

export type SlotSymbol = {
  id: string;
  label: string;
  glyph: string;   // emoji/text fallback art
  color: string;   // tile tint
  isWin?: boolean; // the scatter/win symbol (subtle constant glow)
  tier?: number;   // value tier (higher = richer) → styling weight
  isOrb?: boolean; // Gates multiplier orb: render a glowing sphere, glyph = the ×value
};

// A visible result cell, as [reel index, row index] into the rows-tall window.
export type SlotCell = [reel: number, row: number];

export type SlotTheme = {
  reels: number;            // 5 (Book of Ra) | 6 (Gates)
  rows: number;             // 3 (Book of Ra) | 5 (Gates)
  symbols: SlotSymbol[];
  winSymbolId: string;
  winCount: number;
  winOnSpin: number;        // spin index that wins (default 2 = near-miss first)
  nearMissGrid: string[][]; // winCount-1 win symbols
  winGrid: string[][];      // winCount+ win symbols
  winningCells: SlotCell[]; // cells forming the win; lit on `won`, others dimmed
  winLineRow?: number;      // optional payline row (Book of Ra draws a line across it)
  durationMs: number;
  cabinet: { frame: string; glass: string; glow: string; accent: string };
};
