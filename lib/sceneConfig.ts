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
    copy: {
      heading: view.texts.heading,
      subtitle: view.texts.subtitle,
      winTitle: view.texts.winTitle,
      winPrize: prize,
      nearMissLine: view.texts.almostText,
      almostText: view.texts.almostText,
    },
    winningIndex: view.spin.winningIndex,
    spinsBeforeWin: view.spin.spinsBeforeWin,
    segments: view.segments.map((s) => ({ label: s.label, color: s.color })),
    segmentCount: view.segments.length,
    logoSrc: view.assets.logoUrl,
    pwa: { name: view.pwaName, iconUrl: view.pwaIconUrl, openUrl: "/go" },
  };
}
