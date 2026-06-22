"use client";
import { useMemo, type CSSProperties } from "react";
import css from "./winBurst.module.css";

// A one-shot celebration burst (flash + confetti) shown on win, on top of the 3D coin
// storm and behind the win sheet. Inherits --gold / --accent from the overlay.
export function WinBurst() {
  const pieces = useMemo(
    () => Array.from({ length: 32 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.7 + Math.random() * 1.4,
      rot: Math.random() * 360,
      w: 6 + Math.random() * 7,
      hue: i % 3,
      drift: (Math.random() * 2 - 1) * 90,
    })),
    []
  );

  return (
    <div className={css.wrap} aria-hidden>
      <div className={css.flash} />
      {pieces.map((p, i) => (
        <span
          key={i}
          className={`${css.confetti} ${css["h" + p.hue]}`}
          style={{
            left: `${p.left}%`,
            width: `${p.w}px`,
            height: `${p.w * 0.6}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            "--rot": `${p.rot}deg`,
            "--drift": `${p.drift}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
