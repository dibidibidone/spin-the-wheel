// How many "bonuses" remain — a believable 5%–30% of `total` already gone. Pure: the caller
// supplies `rand` (a stable per-session value), so it is deterministic in tests.
export function scarcityLeft(total: number, rand: number): number {
  if (total <= 0) return 0;
  const goneFraction = 0.05 + rand * 0.25; // 5%..30%
  const left = Math.round(total * (1 - goneFraction));
  return Math.max(1, left);
}
