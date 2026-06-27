"use client";
import { useRef } from "react";
import css from "./scarcityLine.module.css";
import { scarcityLeft } from "./scarcity";

// "🔥 X of {total} bonuses left" — fabricated FOMO, stable within a visit (the random is
// seeded once per mount). Hidden when there's no scarcity configured.
export function ScarcityLine({ total }: { total: number }) {
  const rand = useRef(Math.random());
  if (total <= 0) return null;
  const left = scarcityLeft(total, rand.current);
  return (
    <p className={css.line} data-testid="scarcity-line">
      🔥 <b>{left}</b> of {total} bonuses left
    </p>
  );
}
