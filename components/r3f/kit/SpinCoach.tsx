import css from "./spinCoach.module.css";

// One-shot "tap to spin" nudge over the CTA on first idle load. Decoration only
// (aria-hidden, pointer-events:none); the parent decides when to stop showing it.
export function SpinCoach({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className={css.coach} data-testid="spin-coach" aria-hidden>
      <span className={css.finger}>👆</span>
      <span className={css.text}>Tap to spin</span>
    </div>
  );
}
