import { withConversionDefaults } from "@/components/r3f/kit/conversion";
import type { LandingSceneConfig } from "@/components/r3f/kit/sceneConfig";
import type { LandingView } from "@/lib/types";

export function buildSceneConfig(view: LandingView): LandingSceneConfig {
  const prize = view.winText || view.winningPrizeLabel || view.texts.winTitle;
  return {
    conversion: withConversionDefaults({
      prize,
      claimLabel: view.texts.claimLabel,
      redirectUrl: "/go",
    }),
    copy: { winTitle: view.texts.winTitle, winPrize: prize },
    winningIndex: view.spin.winningIndex,
    spinsBeforeWin: view.spin.spinsBeforeWin,
    segments: view.segments.map((s) => ({ label: s.label, color: s.color })),
    segmentCount: view.segments.length,
    logoSrc: view.assets.logoUrl,
    pwa: { name: view.pwaName, iconUrl: view.pwaIconUrl, openUrl: "/go" },
  };
}
