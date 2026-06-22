import type { CSSProperties } from "react";
import css from "./spinOverlay.module.css";
import type { SpinStatus } from "./spinController";
import type { OverlayCopy } from "./types";

export type OverlayVars = {
  gold: string; accent: string; surface: string; text: string; bannerBg: string; bannerBorder: string;
};

export function SpinOverlay({ copy, vars, status, modalOpen, muted, onSpin, onToggleSound, onClaim }: {
  copy: OverlayCopy;
  vars: OverlayVars;
  status: SpinStatus;
  modalOpen: boolean;
  muted: boolean;
  onSpin: () => void;
  onToggleSound: () => void;
  onClaim: () => void;
}) {
  const style = {
    "--gold": vars.gold, "--accent": vars.accent, "--surface": vars.surface,
    "--text": vars.text, "--bannerBg": vars.bannerBg, "--bannerBorder": vars.bannerBorder,
  } as CSSProperties;
  return (
    <div className={css.overlay} style={style}>
      <div className={css.top}>
        <div className={css.logo}>{copy.logo}</div>
        <button data-pe data-testid="sound-toggle" className={css.sound} onClick={onToggleSound} aria-label="Toggle sound">
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
      <div className={css.hero}>
        <h1>{copy.heading}</h1>
        {copy.subtitle && <p className={css.subtitle}>{copy.subtitle}</p>}
        {copy.subBanner && <div className={css.banner}>{copy.subBanner}</div>}
      </div>
      <button data-pe data-testid="spin-button" className={css.cta} onClick={onSpin} disabled={status !== "idle"}>
        {status === "spinning" ? copy.spinningLabel : copy.ctaLabel}
      </button>
      <div className={css.win} data-testid="win-modal" hidden={!modalOpen}>
        <div className={css.card} data-pe>
          <div style={{ fontSize: 44 }}>{copy.winEmoji}</div>
          <h2>{copy.winTitle}</h2>
          <div className={css.prize}>{copy.winPrize}</div>
          <button className={css.claim} onClick={onClaim}>{copy.claimLabel}</button>
        </div>
      </div>
    </div>
  );
}
