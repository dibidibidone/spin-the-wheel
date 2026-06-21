"use client";

import { useSpinController } from "./useSpinController";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import { Pointer } from "@/components/wheel/Pointer";
import { WinModal } from "@/components/wheel/WinModal";
import { buildRedirectUrl } from "@/lib/redirect";
import type { LandingView } from "@/lib/types";

export function WheelClient({
  landing,
  navigate = (url: string) => window.location.assign(url),
}: {
  landing: LandingView;
  navigate?: (url: string) => void;
}) {
  const { rotation, status, spin, onAnimationComplete } = useSpinController(landing.spin);

  const winTitle = landing.texts.winTitle.replace("{prize}", landing.winningPrizeLabel);

  const onClaim = () => {
    navigate(buildRedirectUrl(landing.redirectUrl, landing.redirectPrizeParam, landing.winningPrizeLabel));
  };

  return (
    <div className="wheel-stage">
      <div className="wheel-pointer">
        <Pointer />
      </div>
      <div
        className="wheel-rotor"
        data-testid="wheel-rotor"
        style={{ transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={onAnimationComplete}
      >
        <WheelSvg segments={landing.segments} size={360} />
      </div>

      <button
        className="spin-button"
        data-testid="spin-button"
        onClick={spin}
        disabled={status === "spinning" || status === "won"}
        aria-label="Spin the wheel"
      >
        ⟳
      </button>

      {status === "almost" && (
        <p className="almost-text" data-testid="almost-text">{landing.texts.almostText}</p>
      )}

      <WinModal
        open={status === "won"}
        title={winTitle}
        prizeLabel={landing.winningPrizeLabel}
        claimLabel={landing.texts.claimLabel}
        onClaim={onClaim}
      />
    </div>
  );
}
