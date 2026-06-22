"use client";
import { useMemo, useRef, type CSSProperties } from "react";
import type { SlotController, SlotStatus } from "./slotController";
import type { SlotTheme } from "./types";
import { useSlotDriver } from "./useSlotDriver";
import css from "./slotReels.module.css";

export function SlotReels({ theme, controller, status, onStatus }: {
  theme: SlotTheme;
  controller: SlotController;
  status: SlotStatus;          // re-render trigger: strips refresh on each transition
  onStatus: (s: SlotStatus) => void;
}) {
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  useSlotDriver({ controller, reelRefs, onStatus });

  const byId = useMemo(
    () => Object.fromEntries(theme.symbols.map((s) => [s.id, s])),
    [theme.symbols]
  );
  const strips = controller.strips; // read live; `status` prop forces re-read each transition
  const cabinetVars = {
    "--frame": theme.cabinet.frame, "--glass": theme.cabinet.glass,
    "--glow": theme.cabinet.glow, "--accent": theme.cabinet.accent,
    "--rows": theme.rows,
  } as CSSProperties;

  return (
    <div className={css.wrap} aria-hidden={status === "spinning"} data-status={status}>
      <div className={css.cabinet} style={cabinetVars}>
        <div className={css.glass}>
          {strips.map((strip, ri) => (
            <div className={css.reel} key={ri} data-reel={ri}>
              <div className={css.strip} ref={(el) => { reelRefs.current[ri] = el; }}>
                {strip.map((id, si) => {
                  const sym = byId[id];
                  return (
                    <div
                      key={si}
                      data-tile
                      className={`${css.tile}${sym?.isWin ? " " + css.win : ""}`}
                      style={{ color: sym?.color }}
                      role="img"
                      aria-label={sym?.label}
                    >
                      {sym?.glyph}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
