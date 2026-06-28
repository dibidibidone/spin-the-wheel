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
  segments?: { label: string; color: string }[]; // wheel templates: the DB prize face
  segmentCount?: number;
  logoSrc?: string | null; // casino logo shown on the page (null → default)
  atmosphere?: string; // off | subtle | normal | intense — 3D/slot reactive background
  pwa: PwaConfig;
};
