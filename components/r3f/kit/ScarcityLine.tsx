"use client";
import { useEffect, useState } from "react";
import css from "./scarcityLine.module.css";
import { scarcityLeft } from "./scarcity";

// "🔥 X of {total} bonuses left" — fabricated FOMO, stable within a visit.
// Random value is computed post-mount so server + first-client renders both
// return null, avoiding a React hydration mismatch on the 2D SSR landing.
export function ScarcityLine({ total }: { total: number }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { setLeft(scarcityLeft(total, Math.random())); }, [total]);
  if (total <= 0 || left === null) return null;
  return (
    <p className={css.line} data-testid="scarcity-line">
      🔥 <b>{left}</b> of {total} bonuses left
    </p>
  );
}
