"use client";
import { useEffect, useState } from "react";
import type { SocialProofItem } from "./types";
import { formatWinner, nextIndex } from "./socialProof";
import css from "./socialProof.module.css";

export function SocialProof({ winners, todayCount, reduced }: {
  winners: SocialProofItem[]; todayCount: number; reduced: boolean;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced || winners.length <= 1) {
      setI(0);
      return;
    }
    const id = window.setInterval(() => setI((p) => nextIndex(p, winners.length)), 3500);
    return () => window.clearInterval(id);
  }, [reduced, winners.length]);

  if (winners.length === 0) return null;
  const item = winners[Math.min(i, winners.length - 1)];

  return (
    <div className={css.wrap} data-testid="social-proof">
      <span className={css.line}>{formatWinner(item)}</span>
      <span className={css.count}>{todayCount.toLocaleString()} players won today</span>
    </div>
  );
}
