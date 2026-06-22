"use client";
import { useRef } from "react";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { ClaimStep } from "./claimMachine";
import { Countdown } from "./Countdown";
import { SocialProof } from "./SocialProof";
import { TrustBar } from "./TrustBar";
import css from "./winSheet.module.css";

export function WinSheet({ step, copy, config, reduced, onOpen, onSubmit, onDismiss }: {
  step: ClaimStep;
  copy: OverlayCopy;
  config: ConversionConfig;
  reduced: boolean;
  onOpen: () => void;
  onSubmit: (value: string) => void;
  onDismiss: () => void;
}) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const open = step !== "hidden";
  const inputMode = config.registerField === "tel" ? "tel" : "email";
  const autoComplete = config.registerField === "tel" ? "tel" : "email";

  return (
    <div className={css.scrim} data-testid="win-modal" hidden={!open}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className={`${css.sheet}${reduced ? " " + css.noanim : ""}`} data-pe>
        <div className={css.grab} aria-hidden />
        <img className={css.logo} src="/boomzino-logo.svg" alt={copy.logo} />
        <div className={css.eyebrow}>{copy.winEmoji} {copy.winTitle}</div>
        <div className={css.prize}>{config.prize}</div>
        <div className={css.rule} aria-hidden />

        {step === "reveal" && (
          <div className={css.center}>
            <Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" prominent />
            <button className={css.cta} data-testid="claim-open" onClick={onOpen}>{config.claimLabel}</button>
          </div>
        )}

        {(step === "form" || step === "submitting") && (
          <form className={css.center} onSubmit={(e) => { e.preventDefault(); onSubmit(fieldRef.current?.value ?? ""); }}>
            <Countdown durationMs={config.urgencyMs} storageKey="stw-claim-deadline" />
            <input
              ref={fieldRef}
              className={css.field}
              data-testid="claim-field"
              type={config.registerField}
              inputMode={inputMode}
              autoComplete={autoComplete}
              enterKeyHint="go"
              placeholder={config.registerPlaceholder}
              autoFocus
              disabled={step === "submitting"}
            />
            <button className={css.cta} data-testid="claim-submit" type="submit" disabled={step === "submitting"}>
              {step === "submitting" ? "…" : config.claimLabel}
            </button>
          </form>
        )}

        <div className={css.footer}>
          <SocialProof winners={config.social.winners} todayCount={config.social.todayCount} reduced={reduced} />
          <TrustBar text={config.trust} />
        </div>
      </div>
    </div>
  );
}
