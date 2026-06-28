"use client";
import { useMemo, type CSSProperties } from "react";
import css from "./labAtmosphere.module.css";
import type { OverlayStatus } from "../kit/types";

const RUNES = ["🜍", "⚗", "☿", "🜔", "✶", "🜚", "☉"];

// Reactive alchemy atmosphere: rising potion bubbles + slowly drifting glowing runes over a
// toxic-green glow, layered as pure DOM/CSS additive light (crash-safe). The brew bubbles
// faster while spinning and erupts green on the win.
export function LabAtmosphere({ status, reduced, intensity = "normal" }: { status: OverlayStatus; reduced: boolean; intensity?: string }) {
  const bubbles = useMemo(
    () => Array.from({ length: 22 }, () => ({
      left: Math.random() * 100,
      size: 5 + Math.random() * 16,
      delay: Math.random() * 7,
      dur: 5.5 + Math.random() * 6,
      drift: (Math.random() * 2 - 1) * 34,
    })),
    []
  );
  const runes = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      glyph: RUNES[i % RUNES.length],
      left: 8 + Math.random() * 84,
      top: 18 + Math.random() * 60,
      size: 18 + Math.random() * 20,
      delay: Math.random() * 6,
      dur: 7 + Math.random() * 6,
    })),
    []
  );
  if (reduced) return null;
  const mode =
    status === "spinning" ? css.spinning :
    status === "won" ? css.won :
    status === "nearmiss" ? css.nearmiss : css.idle;
  return (
    <div className={`${css.wrap} ${mode} ${css[intensity] ?? ""}`} aria-hidden data-testid="atmosphere">
      <div className={css.glow} />
      {runes.map((r, i) => (
        <span
          key={`r${i}`}
          className={css.rune}
          style={{
            left: `${r.left}%`, top: `${r.top}%`, fontSize: `${r.size}px`,
            animationDelay: `${r.delay}s`, animationDuration: `${r.dur}s`,
          } as CSSProperties}
        >{r.glyph}</span>
      ))}
      {bubbles.map((b, i) => (
        <span
          key={`b${i}`}
          className={css.bubble}
          style={{
            left: `${b.left}%`, width: `${b.size}px`, height: `${b.size}px`,
            animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, "--drift": `${b.drift}px`,
          } as CSSProperties}
        />
      ))}
      <div className={css.flash} />
    </div>
  );
}
