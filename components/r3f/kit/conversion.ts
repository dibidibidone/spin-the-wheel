import type { ConversionConfig } from "./types";

const DEFAULTS: ConversionConfig = {
  prize: "500 Free Spins",
  claimLabel: "Claim my bonus →",
  registerField: "email",
  registerPlaceholder: "you@email.com",
  redirectUrl: "https://example.com/register",
  urgencyMs: 600_000,
  social: {
    winners: [
      { name: "Aisha", amount: "€200", minutesAgo: 2 },
      { name: "Marco", amount: "€50", minutesAgo: 5 },
      { name: "Lena", amount: "100 FS", minutesAgo: 8 },
      { name: "Tom", amount: "€500", minutesAgo: 12 },
    ],
    todayCount: 2481,
  },
  trust: "🔞 18+ · 🔒 Secure · Play responsibly · T&Cs apply",
};

export function withConversionDefaults(partial: Partial<ConversionConfig>): ConversionConfig {
  return {
    ...DEFAULTS,
    ...partial,
    social: { ...DEFAULTS.social, ...(partial.social ?? {}) },
  };
}
