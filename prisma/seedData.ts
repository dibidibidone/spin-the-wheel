import type { ThemeColors } from "@/lib/types";

export type SeedPrize = { order: number; label: string; icon: string; color: string; weight: number };

export const boomzinoTheme: ThemeColors = {
  bg: "#0A1410",
  surface: "#13251A",
  accent: "#27C24C",
  gold: "#F5C24B",
  text: "#EAF6EE",
  muted: "#7FA88E",
};

export const boomzinoSeed = {
  slug: "boomzino-demo",
  name: "Boomzino Demo",
  status: "published" as const,
  heading: "Spin the Wheel",
  subtitle: "and win bonuses",
  backLabel: "Back",
  winTitle: "You won {prize}!",
  claimLabel: "Claim bonus",
  almostText: "Almost! Spin again",
  theme: boomzinoTheme,
  spinsBeforeWin: 3,
  preWinBehavior: "near-miss" as const,
  redirectUrl: "https://boomzino.example/signup",
  redirectPrizeParam: "bonus",
  hostname: "localhost:3000",
  winningOrder: 7, // JACKPOT
  prizes: [
    { order: 0, label: "€5",        icon: "💶", color: "#1E7A3A", weight: 30 },
    { order: 1, label: "50 FS",     icon: "🎰", color: "#2BA552", weight: 25 },
    { order: 2, label: "€10",       icon: "💶", color: "#1E7A3A", weight: 20 },
    { order: 3, label: "100 FS",    icon: "🎰", color: "#2BA552", weight: 12 },
    { order: 4, label: "€20",       icon: "💶", color: "#1E7A3A", weight: 8 },
    { order: 5, label: "200 FS",    icon: "🎰", color: "#2BA552", weight: 3 },
    { order: 6, label: "50% Bonus", icon: "🔥", color: "#1E7A3A", weight: 1 },
    { order: 7, label: "JACKPOT",   icon: "👑", color: "#F5C24B", weight: 1 },
  ] satisfies SeedPrize[],
};
