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
  ctaLabel: string;
  spinningLabel: string;
  winTitle: string;
  winPrize: string;
  claimLabel: string;
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
  social: { winners: SocialProofItem[]; todayCount: number };
  trust: string;
};
