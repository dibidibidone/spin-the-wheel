"use client";
import css from "./iosInstallHint.module.css";

export function IosInstallHint({ open, appName, iconUrl, onClose }: {
  open: boolean;
  appName: string;
  iconUrl: string | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={css.scrim} data-testid="ios-install-hint" onClick={onClose}>
      <div className={css.card} onClick={(e) => e.stopPropagation()}>
        {iconUrl && <img className={css.icon} src={iconUrl} alt="" />}
        <h2 className={css.title}>Get {appName || "the app"}</h2>
        <p className={css.step}>1. Tap the <strong>Share</strong> button below ⬆️</p>
        <p className={css.step}>2. Choose <strong>Add to Home Screen</strong></p>
        <button className={css.close} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
