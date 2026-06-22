import type { WheelTheme, SoundConfig, OverlayCopy } from "../kit/types";
import type { OverlayVars } from "../kit/SpinOverlay";

const LABELS = ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"];

export const alchemyWheel: WheelTheme = {
  labels: LABELS,
  segmentColors: ["#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#E2483D"],
  goldIndices: [1, 3, 5],
  jackpotIndex: 7,
  goldColor: "#FFD24A",
  rimColor: "#5BE36A",
  bulbColor: "#8BFF5A",
  labelColor: "#F4F1E8",
  radius: 2.1,
};

export const alchemySound: SoundConfig = {
  tick: { freqs: [420, 700], ms: 70, gain: 0.16 },        // bubble "blip"
  win: { freqs: [392, 523, 659, 880], ms: 1100, gain: 0.26 }, // magical shimmer
};

export const alchemyCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "Spin the Wheel",
  subtitle: "and win bonuses",
  ctaLabel: "SPIN",
  spinningLabel: "BREWING…",
  winTitle: "You won",
  winPrize: "JACKPOT!",
  claimLabel: "Claim bonus",
  winEmoji: "🧪",
};

export const alchemyOverlayVars: OverlayVars = {
  gold: "#F5C24B", accent: "#5BE36A", surface: "#15564A",
  text: "#EAF6EE", bannerBg: "#15564A", bannerBorder: "#5BE36A",
};
