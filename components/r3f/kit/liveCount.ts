// A believable "playing now" presence count that drifts to feel live. Pure: the caller supplies
// the seeded base and a per-tick random in [0,1), so it is deterministic in tests.
export function liveCount(base: number, rand: number): number {
  if (base <= 0) return 0;
  const drift = Math.round(base * (rand - 0.5) * 0.05); // ±~2.5% wiggle around the base
  return Math.max(1, base + drift);
}
