"use client";
import css from "./olympusAtmosphere.module.css";
import type { OverlayStatus } from "../../kit/types";

// Reactive Zeus-storm atmosphere: drifting storm haze + god-ray beams + flickering lightning,
// layered over the 3D backdrop as pure DOM/CSS additive light (no WebGL, crash-safe). The
// storm intensifies while spinning and erupts in a lightning flood on the win.
export function OlympusAtmosphere({ status, reduced, intensity = "normal" }: { status: OverlayStatus; reduced: boolean; intensity?: string }) {
  if (reduced) return null;
  const mode =
    status === "spinning" ? css.spinning :
    status === "won" ? css.won :
    status === "nearmiss" ? css.nearmiss : css.idle;
  return (
    <div className={`${css.wrap} ${mode} ${css[intensity] ?? ""}`} aria-hidden data-testid="atmosphere">
      <div className={css.haze} />
      <div className={css.rays} />
      <div className={css.bolt1} />
      <div className={css.bolt2} />
      <div className={css.flash} />
    </div>
  );
}
