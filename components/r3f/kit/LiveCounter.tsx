"use client";
import { useEffect, useRef, useState } from "react";
import css from "./liveCounter.module.css";
import { liveCount } from "./liveCount";

// "🟢 N playing now" — a live presence counter under the CTA. The base is seeded once per visit
// (stable), then drifts every few seconds to feel real. Fabricated FOMO, like the scarcity line;
// reduced-motion freezes both the drift and the pulsing dot.
export function LiveCounter({ base, reduced = false }: { base?: number; reduced?: boolean }) {
  const seed = useRef(base ?? 760 + Math.floor(Math.random() * 1600)); // ~760–2360 concurrent
  const [rand, setRand] = useState(0.5);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setRand(Math.random()), 2600);
    return () => window.clearInterval(id);
  }, [reduced]);
  const n = liveCount(seed.current, rand);
  return (
    <p className={css.live} data-testid="live-counter">
      <span className={css.dot} aria-hidden /> <b>{n.toLocaleString()}</b> playing now
    </p>
  );
}
