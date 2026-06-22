import type { WheelTheme, SoundConfig, OverlayCopy } from "../kit/types";

const LABELS = ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"];

export const jackpotWheel: WheelTheme = {
  labels: LABELS,
  segmentColors: ["#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#FFD24A", "#15564A", "#E2483D"],
  goldIndices: [1, 3, 5],
  jackpotIndex: 7,
  goldColor: "#FFD24A",
  rimColor: "#F5C24B",
  bulbColor: "#FFD56A",
  labelColor: "#F4F1E8",
  radius: 2.1,
};

export const jackpotSound: SoundConfig = {
  tick: { freqs: [1200], ms: 40, gain: 0.18 },
  win: { freqs: [523, 659, 784], ms: 900, gain: 0.3 },
};

export const jackpotCopy: OverlayCopy = {
  logo: "BOOMZINO",
  heading: "BOOM your luck",
  subBanner: "7 7 7",
  ctaLabel: "SPIN TO WIN",
  spinningLabel: "SPINNING…",
  winTitle: "JACKPOT — You won",
  winPrize: "JACKPOT!",
  claimLabel: "Claim bonus",
  winEmoji: "💰",
};

export const jackpotOverlayVars = {
  gold: "#F5C24B", accent: "#FFD56A", surface: "#15564A",
  text: "#EAF6EE", bannerBg: "#E2483D", bannerBorder: "#F5C24B",
};
