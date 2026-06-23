import type { ConversionConfig, OverlayCopy } from "./types";

export type PwaConfig = {
  name: string;
  iconUrl: string | null;
  openUrl: string; // same-origin redirector, always "/go"
};

export type LandingSceneConfig = {
  conversion: ConversionConfig;
  copy?: Partial<OverlayCopy>;
  winningIndex?: number;  // wheel templates: which segment lands up
  spinsBeforeWin?: number; // wheel + slot templates: win on this spin
  pwa: PwaConfig;
};
