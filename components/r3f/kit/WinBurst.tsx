"use client";
import { useMemo, type CSSProperties } from "react";
import css from "./winBurst.module.css";

// A one-shot celebration shown on win, behind the win sheet. Inherits --gold / --accent
// from the overlay. Pure DOM/CSS (flash + confetti + a gold coin rain) — no physics or
// WebGL, so it can't repeat the context-loss crash the old Rapier CoinStorm caused.
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

  const coins = useMemo(
    () => Array.from({ length: 20 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      dur: 1.9 + Math.random() * 1.6,
      size: 16 + Math.random() * 16,
      drift: (Math.random() * 2 - 1) * 70,
      spin: 720 + Math.random() * 720,
    })),
    []
  );

  return (
    <div className={css.wrap} aria-hidden>
      <div className={css.flash} />
      {coins.map((c, i) => (
        <span
          key={`c${i}`}
          className={css.coin}
          style={{
            left: `${c.left}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            "--drift": `${c.drift}px`,
            "--spin": `${c.spin}deg`,
          } as CSSProperties}
        />
      ))}
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
