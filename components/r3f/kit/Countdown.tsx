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
  const text = left > 0 ? `Bonus locked for ${formatMMSS(left)}` : "Last chance!";

  return (
    <div className={css.wrap} data-testid="countdown">
      <span className={`${css.label}${prominent ? " " + css.prominent : ""}`}>⏱ {text}</span>
      <span className={css.bar}><span className={css.fill} style={{ width: `${pct}%` }} /></span>
    </div>
  );
}
