"use client";

import { useRef } from "react";
import { useSpinController } from "./useSpinController";
import { WheelSvg } from "@/components/wheel/WheelSvg";
import { Pointer } from "@/components/wheel/Pointer";
import { WinModal } from "@/components/wheel/WinModal";
import { LossBurst } from "@/components/r3f/kit/LossBurst";
import { OfferBanner } from "@/components/r3f/kit/OfferBanner";
import { ScarcityLine } from "@/components/r3f/kit/ScarcityLine";
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
    <>
      <OfferBanner headline={landing.texts.offerHeadline} subline={landing.texts.offerSubline} />
    <div className={`wheel-stage${status === "almost" ? " shake" : ""}`}>
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
          🎯 <b>{spinsLeft}</b> {spinsLeft === 1 ? "spin" : "spins"} left
        </p>
      )}
      {landing.bonusesTotal > 0 && <ScarcityLine total={landing.bonusesTotal} />}

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

      {/* Rendered OUTSIDE .wheel-stage: that element gets the `.shake` transform on a
          near-miss, which would make it the containing block for this position:fixed flash
          and clip it to the 360x300 stage. As a sibling under the untransformed .landing it
          fills the viewport (matching the 3D/slot landings, whose roots are full-viewport). */}
      {status === "almost" && <LossBurst text={landing.texts.almostText} />}
    </>
  );
}
