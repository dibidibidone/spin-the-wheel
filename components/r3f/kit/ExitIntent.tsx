"use client";
import css from "./exitIntent.module.css";

// Last-chance abandonment-recovery overlay. Leads with the landing's offer + a loss-aversion
// message and a single "keep my bonus" CTA that returns the visitor to the page (where the
// sticky SPIN/claim CTA takes over). Pure DOM/CSS.
export function ExitIntent({ show, headline, subline, onClose }: {
  show: boolean; headline?: string; subline?: string; onClose: () => void;
}) {
  if (!show) return null;
  return (
    <div className={css.scrim} data-testid="exit-intent" role="dialog" aria-modal="true">
      <div className={css.card}>
        <div className={css.eyebrow}>⏳ WAIT — DON'T LEAVE</div>
        <div className={css.title}>{headline || "Your bonus is reserved!"}</div>
        {subline && <div className={css.sub}>{subline}</div>}
        <p className={css.body}>Claim it before your reserved spot expires.</p>
        <button className={css.cta} data-pe data-testid="exit-keep" onClick={onClose}>Keep my bonus →</button>
        <button className={css.dismiss} data-pe onClick={onClose}>No thanks, I'll pass</button>
      </div>
    </div>
  );
}
