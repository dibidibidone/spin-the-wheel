import type { CSSProperties } from "react";
import css from "./spinOverlay.module.css";
import type { SpinStatus } from "./spinController";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { ClaimStep } from "./claimMachine";
import { WinSheet } from "./WinSheet";
import { SocialProof } from "./SocialProof";
import { Countdown } from "./Countdown";
import { TrustBar } from "./TrustBar";

export type OverlayVars = {
  gold: string; accent: string; surface: string; text: string; bannerBg: string; bannerBorder: string;
};

export function SpinOverlay({
  copy, vars, config, status, claimStep, muted, reduced,
  onSpin, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss,
}: {
  copy: OverlayCopy;
  vars: OverlayVars;
  config: ConversionConfig;
  status: SpinStatus;
  claimStep: ClaimStep;
  muted: boolean;
  reduced: boolean;
  onSpin: () => void;
  onToggleSound: () => void;
  onClaimOpen: () => void;
  onClaimSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  const style = {
    "--gold": vars.gold, "--accent": vars.accent, "--surface": vars.surface,
    "--text": vars.text, "--bannerBg": vars.bannerBg, "--bannerBorder": vars.bannerBorder,
  } as CSSProperties;

  return (
    <div className={css.overlay} style={style}>
      <div className={css.top}>
        <img className={css.logo} src="/boomzino-logo.jpg" alt={copy.logo} />
        <button data-pe data-testid="sound-toggle" className={css.sound} onClick={onToggleSound} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className={css.hero}>
        <h1>{copy.heading}</h1>
        {copy.subtitle && <p className={css.subtitle}>{copy.subtitle}</p>}
        {copy.subBanner && <div className={css.banner}>{copy.subBanner}</div>}
      </div>

      <div className={css.dock}>
        <div className={css.strip}>
          <SocialProof winners={config.social.winners} todayCount={config.social.todayCount} reduced={reduced} />
        </div>
        <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status !== "idle"}>
          {status === "spinning" ? copy.spinningLabel : copy.ctaLabel}
        </button>
        <div className={css.strip}>
          <Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" />
        </div>
        <TrustBar text={config.trust} />
      </div>

      <WinSheet
        step={claimStep} copy={copy} config={config} reduced={reduced}
        onOpen={onClaimOpen} onSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
    </div>
  );
}
