"use client";
import { useMemo, type CSSProperties } from "react";
import css from "./winBurst.module.css";

// A one-shot BOOM celebration shown on win, behind the win sheet. Inherits --gold / --accent
// from the overlay. Pure DOM/CSS — light rays + shockwave + a big radial flash + a "BIG WIN"
// punch + a heavy gold coin shower + confetti. No physics or WebGL, so it can't repeat the
// context-loss crash the old Rapier CoinStorm caused.
export function WinBurst() {
  const pieces = useMemo(
    () => Array.from({ length: 44 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.7 + Math.random() * 1.4,
      rot: Math.random() * 360,
      w: 6 + Math.random() * 8,
      hue: i % 3,
      drift: (Math.random() * 2 - 1) * 90,
    })),
    []
  );

  const coins = useMemo(
    () => Array.from({ length: 54 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.7,
      dur: 2.6 + Math.random() * 2,
      size: 26 + Math.random() * 34,
      drift: (Math.random() * 2 - 1) * 90,
      spin: 720 + Math.random() * 1080,
    })),
    []
  );

  return (
    <div className={css.wrap} data-testid="win-burst" aria-hidden>
      <div className={css.rays} />
      <div className={css.flash} />
      <div className={css.core} />
      <div className={css.shock} />
      <div className={css.shock2} />
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
      <div className={css.bigwin}>BIG WIN!</div>
    </div>
  );
}
