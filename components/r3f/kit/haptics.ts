export type Haptics = { spin(): void; win(): void; claim(): void };

export function createHaptics(opts: {
  reduced: boolean;
  vibrate?: (pattern: number | number[]) => boolean;
}): Haptics {
  const vib =
    opts.vibrate ??
    (typeof navigator !== "undefined" && "vibrate" in navigator
      ? navigator.vibrate.bind(navigator)
      : undefined);

  const fire = (pattern: number | number[]) => {
    if (opts.reduced || !vib) return;
    try { vib(pattern); } catch { /* unsupported — ignore */ }
  };

  return {
    spin() { fire([8, 30, 8, 30, 8]); }, // light "ticking" burst
    win() { fire([0, 60, 40, 120]); },   // strong celebratory pattern
    claim() { fire(20); },                // crisp confirm tap
  };
}
