import type { CSSProperties } from "react";
import css from "./spinOverlay.module.css";
import type { OverlayStatus } from "./types";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { ClaimStep } from "./claimMachine";
import { WinSheet } from "./WinSheet";
import { WinBurst } from "./WinBurst";
import { LossBurst } from "./LossBurst";
import { SocialProof } from "./SocialProof";
import { Countdown } from "./Countdown";
import { TrustBar } from "./TrustBar";
import { OfferBanner } from "./OfferBanner";
import { ScarcityLine } from "./ScarcityLine";

export type OverlayVars = {
  gold: string; accent: string; surface: string; text: string; bannerBg: string; bannerBorder: string;
};

export function SpinOverlay({
  copy, vars, config, status, claimStep, muted, reduced, logoSrc, spinsLeft,
  onSpin, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss,
}: {
  copy: OverlayCopy;
  vars: OverlayVars;
  config: ConversionConfig;
  status: OverlayStatus;
  claimStep: ClaimStep;
  muted: boolean;
  reduced: boolean;
  logoSrc?: string;
  spinsLeft?: number;
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
        <img className={css.logo} src={logoSrc ?? "/boomzino-logo.svg"} alt={copy.logo} />
        <button data-pe data-testid="sound-toggle" className={css.sound} onClick={onToggleSound} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      <div className={css.hero}>
        <OfferBanner headline={copy.offerHeadline} subline={copy.offerSubline} />
        <h1 className={css.subhead}>{copy.heading}</h1>
        {copy.subtitle && <p className={css.subtitle}>{copy.subtitle}</p>}
        {copy.subBanner && <div className={css.banner}>{copy.subBanner}</div>}
      </div>

      <div className={css.dock}>
        <div className={css.strip}>
          <SocialProof winners={config.social.winners} todayCount={config.social.todayCount} reduced={reduced} />
        </div>
        {config.scarcity && <ScarcityLine total={config.scarcity.total} />}
        {spinsLeft != null && (status === "idle" || status === "nearmiss") && (
          <p className={css.spinsLeft} data-testid="spins-left">
            🎯 <b>{spinsLeft}</b> {spinsLeft === 1 ? "spin" : "spins"} left
          </p>
        )}
        <div className={css.ctaRow}>
          <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status === "spinning" || status === "won"}>
            {status === "spinning" ? copy.spinningLabel : status === "nearmiss" ? (copy.retryLabel ?? copy.ctaLabel) : copy.ctaLabel}
          </button>
          <div className={css.ctaTimer}><Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" /></div>
        </div>
        {status === "nearmiss" && copy.nearMissLine && <p className={css.retryHint} data-pe>{copy.nearMissLine}</p>}
        <TrustBar text={config.trust} />
      </div>

      {status === "nearmiss" && <LossBurst text={copy.almostText ?? ""} />}
      {status === "won" && <WinBurst />}

      <WinSheet
        step={claimStep} copy={copy} config={config} reduced={reduced} logoSrc={logoSrc}
        onOpen={onClaimOpen} onSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
    </div>
  );
}
