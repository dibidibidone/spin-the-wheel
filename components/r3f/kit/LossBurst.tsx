"use client";
import css from "./lossBurst.module.css";

// The red mirror of WinBurst, shown on a losing (near-miss) spin: a one-shot red
// screen flash + a popping "almost" line. Pure DOM/CSS, pointer-events:none, hidden
// under reduced motion. No reward particles — those belong to the win only.
export function LossBurst({ text }: { text: string }) {
  return (
    <div className={css.wrap} data-testid="loss-burst" aria-hidden>
      <div className={css.flash} />
      {text && <div className={css.text}>{text}</div>}
    </div>
  );
}
