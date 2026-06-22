"use client";
import { useEffect, useRef, useState } from "react";
import css from "./countdown.module.css";
import { formatMMSS, remainingMs, seedDeadline } from "./countdown";

export function Countdown({ durationMs, storageKey, prominent = false }: {
  durationMs: number; storageKey: string; prominent?: boolean;
}) {
  const deadline = useRef(seedDeadline(
    storageKey, durationMs, Date.now(),
    typeof window !== "undefined" ? window.sessionStorage : null,
  ));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingMs(deadline.current, now);
  const pct = Math.max(0, Math.min(100, (left / durationMs) * 100));
  const urgent = left <= 60_000;
  const cls = `${css.wrap}${prominent ? " " + css.prominent : ""}${urgent ? " " + css.urgent : ""}`;

  return (
    <div className={cls} data-testid="countdown">
      <span className={css.chip}>
        <span className={css.icon} aria-hidden>⏳</span>
        <span className={css.eyebrow}>{left > 0 ? "Bonus locked" : "Hurry"}</span>
        <span className={css.time}>{left > 0 ? formatMMSS(left) : "Last chance!"}</span>
      </span>
      <span className={css.bar}><span className={css.fill} style={{ width: `${pct}%` }} /></span>
    </div>
  );
}
