"use client";
import { useEffect, useState } from "react";
import type { SocialProofItem } from "./types";
import { formatWinner, nextIndex } from "./socialProof";
import css from "./socialProof.module.css";

// `part` lets the overlay split the two signals across the page: the rotating live
// winner ("winner") and the "N players won today" count ("count"). Default renders both.
export function SocialProof({ winners, todayCount, reduced, part = "both" }: {
  winners: SocialProofItem[]; todayCount: number; reduced: boolean;
  part?: "both" | "winner" | "count";
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced || winners.length <= 1 || part === "count") {
      setI(0);
      return;
    }
    const id = window.setInterval(() => setI((p) => nextIndex(p, winners.length)), 3500);
    return () => window.clearInterval(id);
  }, [reduced, winners.length, part]);

  if (winners.length === 0) return null;
  const item = winners[Math.min(i, winners.length - 1)];
  const initial = item.name.slice(0, 1).toUpperCase();

  return (
    <div className={css.wrap} data-testid="social-proof">
      {part !== "count" && (
        <span className={css.row} title={formatWinner(item)}>
          <span className={css.live}><span className={css.dot} aria-hidden />Live</span>
          <span className={css.avatar} aria-hidden>{initial}</span>
          <span className={css.who}>{item.name} won</span>
          <span className={css.amount}>{item.amount}</span>
          <span className={css.ago}>· {item.minutesAgo <= 0 ? "now" : `${item.minutesAgo}m`}</span>
        </span>
      )}
      {part !== "winner" && (
        <span className={css.count}><b>{todayCount.toLocaleString()}</b> players won today</span>
      )}
    </div>
  );
}
