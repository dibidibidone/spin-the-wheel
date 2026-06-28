"use client";
import css from "./winAnticipation.module.css";

// A short (~0.7s) tension build-up shown the instant a win lands, before the BOOM erupts:
// the scene dims, a white-gold core charges and implodes inward, light rays converge, and a
// "✦" ring pulses — so the payoff hits harder. Pure DOM/CSS, hidden under reduced motion.
export function WinAnticipation() {
  return (
    <div className={css.wrap} data-testid="win-anticipation" aria-hidden>
      <div className={css.dim} />
      <div className={css.converge} />
      <div className={css.core} />
      <div className={css.ring} />
    </div>
  );
}
