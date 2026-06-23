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
  // The set of [reel,row] cells that form the winning combination, lit on `won`.
  const winSet = useMemo(
    () => new Set(theme.winningCells.map(([r, c]) => r + ":" + c)),
    [theme.winningCells]
  );
  const won = status === "won";
  const strips = controller.strips; // read live; `status` prop forces re-read each transition
  const cabinetVars = {
    "--frame": theme.cabinet.frame, "--glass": theme.cabinet.glass,
    "--glow": theme.cabinet.glow, "--accent": theme.cabinet.accent,
    "--rows": theme.rows, "--winrow": theme.winLineRow ?? 0,
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
                  const row = si - controller.spinRows;            // visible result row (>=0 = in window)
                  const inWindow = row >= 0 && row < theme.rows;
                  const winning = won && inWindow && winSet.has(ri + ":" + row);
                  const dimmed = won && inWindow && !winning;
                  const cls = [
                    css.tile,
                    sym?.isOrb ? css.orb : "",
                    sym?.isWin ? css.glow : "",
                    winning ? css.win : "",
                    dimmed ? css.dim : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <div
                      key={si}
                      data-tile
                      data-win={winning || undefined}
                      className={cls}
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
          {won && theme.winLineRow != null && <div className={css.payline} aria-hidden />}
        </div>
      </div>
    </div>
  );
}
