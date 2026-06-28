"use client";
import { useMemo, type CSSProperties } from "react";
import css from "./vaultAtmosphere.module.css";
import type { OverlayStatus } from "../kit/types";

// Reactive vault atmosphere: floating gold dust + a warm gold glow + neon light sweep,
// layered over the 3D scene as pure DOM/CSS additive light (crash-safe). Calm at idle;
// the dust rises faster and the glow pulses while spinning; a gold flood on the win.
export function VaultAtmosphere({ status, reduced }: { status: OverlayStatus; reduced: boolean }) {
  const dust = useMemo(
    () => Array.from({ length: 24 }, () => ({
      left: Math.random() * 100,
      size: 2 + Math.random() * 5,
      delay: Math.random() * 9,
      dur: 7 + Math.random() * 8,
      drift: (Math.random() * 2 - 1) * 44,
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
      <div className={css.sweep} />
      {dust.map((d, i) => (
        <span
          key={i}
          className={css.mote}
          style={{
            left: `${d.left}%`, width: `${d.size}px`, height: `${d.size}px`,
            animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s`, "--drift": `${d.drift}px`,
          } as CSSProperties}
        />
      ))}
      <div className={css.flash} />
    </div>
  );
}
