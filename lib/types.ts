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
