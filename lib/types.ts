export type ThemeColors = {
  bg: string;
  surface: string;
  accent: string;
  gold: string;
  text: string;
  muted: string;
};

export type WheelSegment = {
  id: string;
  order: number;
  label: string;
  icon: string;
  color: string;
};

export type SpinConfig = {
  segmentCount: number;
  spinsBeforeWin: number;
  winningIndex: number;
  behavior: "near-miss";
};

export type LandingTexts = {
  heading: string;
  subtitle: string;
  backLabel: string;
  winTitle: string;
  claimLabel: string;
  almostText: string;
  offerHeadline: string;
  offerSubline: string;
};

export type LandingAssets = {
  logoUrl: string | null;
  faviconUrl: string | null;
  coinImageUrl: string | null;
  bgImageUrl: string | null;
};

export type LandingView = {
  slug: string;
  texts: LandingTexts;
  theme: ThemeColors;
  assets: LandingAssets;
  segments: WheelSegment[];
  spin: SpinConfig;
  redirectUrl: string;
  redirectPrizeParam: string | null;
  winningPrizeLabel: string;
  winText: string;
  bonusesTotal: number;
  countdownMinutes: number;
  atmosphere: string;
  metaTitle: string;
  metaDescription: string;
  template: string;
  pwaName: string;
  pwaIconUrl: string | null;
  fbPixelIds: string[];
};
