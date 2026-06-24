"use client";

import { useRef } from "react";
import { useSpinController } from "./useSpinController";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import { Pointer } from "@/components/wheel/Pointer";
import { WinModal } from "@/components/wheel/WinModal";
import { usePwaInstall } from "@/components/r3f/kit/usePwaInstall";
import { IosInstallHint } from "@/components/r3f/kit/IosInstallHint";
import type { LandingView } from "@/lib/types";

export function WheelClient({
  landing,
  navigate = (url: string) => window.location.assign(url),
}: {
  landing: LandingView;
  navigate?: (url: string) => void;
}) {
  const { rotation, status, spin, onAnimationComplete, spinsLeft } = useSpinController(landing.spin);
  const pwa = usePwaInstall();
  const prompted = useRef(false);

  const winTitle = landing.texts.winTitle.replace("{prize}", landing.winningPrizeLabel);

  const onSpin = () => {
    if (!prompted.current) { prompted.current = true; pwa.promptInstall(); }
    spin();
  };
  const onClaim = () => navigate("/go");

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

      {(status === "idle" || status === "almost") && (
        <p className="spins-left" data-testid="spins-left">
          🎯 {spinsLeft} {spinsLeft === 1 ? "spin" : "spins"} left to win
        </p>
      )}

      <button
        className="spin-button"
        data-testid="spin-button"
        onClick={onSpin}
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
      <IosInstallHint open={pwa.iosHintOpen} appName={landing.pwaName} iconUrl={landing.pwaIconUrl} onClose={pwa.dismissIosHint} />
    </div>
  );
}
