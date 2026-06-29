import type { CSSProperties } from "react";
import css from "./sceneLoader.module.css";

// Pre-scene loading screen shown while the heavy R3F bundle streams in. An iGaming spinning
// "prize wheel" + an animated progress bar. Pure CSS (no three/R3F imports) so it stays in the
// initial chunk and paints immediately; themed per landing via props. Reduced-motion safe.
export function SceneLoader({ label = "Loading", accent = "#F5C24B", bg = "#070D0B" }: {
  label?: string;
  accent?: string;
  bg?: string;
}) {
  return (
    <div
      className={css.wrap}
      role="status"
      aria-label={label}
      style={{ "--ld-accent": accent, "--ld-bg": bg } as CSSProperties}
    >
      <div className={css.wheel} aria-hidden>
        <span className={css.pointer} />
      </div>
      <div className={css.label}>{label}</div>
      <div className={css.bar} aria-hidden>
        <span className={css.fill} />
      </div>
    </div>
  );
}
