"use client";
import { useMemo, type CSSProperties } from "react";
import css from "./templeAtmosphere.module.css";
import type { OverlayStatus } from "../../kit/types";

const GLYPHS = ["𓂀", "𓁹", "𓆣", "𓋹", "𓊽", "𓇳", "𓋴"];

// Reactive temple atmosphere: drifting desert sand + slowly glowing hieroglyphs over a warm
// torch glow and god-rays, layered as pure DOM/CSS additive light (crash-safe). The torchlight
// flickers and the sand drifts faster while spinning; a golden flood on the win.
export function TempleAtmosphere({ status, reduced }: { status: OverlayStatus; reduced: boolean }) {
  const sand = useMemo(
    () => Array.from({ length: 28 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 3.5,
      delay: Math.random() * 8,
      dur: 6 + Math.random() * 7,
      drift: 40 + Math.random() * 120,
    })),
    []
  );
  const glyphs = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      glyph: GLYPHS[i % GLYPHS.length],
      left: 8 + Math.random() * 84,
      top: 16 + Math.random() * 64,
      size: 20 + Math.random() * 22,
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
    <div className={`${css.wrap} ${mode}`} aria-hidden data-testid="atmosphere">
      <div className={css.glow} />
      <div className={css.rays} />
      {glyphs.map((g, i) => (
        <span
          key={`g${i}`}
          className={css.glyph}
          style={{
            left: `${g.left}%`, top: `${g.top}%`, fontSize: `${g.size}px`,
            animationDelay: `${g.delay}s`, animationDuration: `${g.dur}s`,
          } as CSSProperties}
        >{g.glyph}</span>
      ))}
      {sand.map((s, i) => (
        <span
          key={`s${i}`}
          className={css.grain}
          style={{
            left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`,
            animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`, "--drift": `${s.drift}px`,
          } as CSSProperties}
        />
      ))}
      <div className={css.flash} />
    </div>
  );
}
