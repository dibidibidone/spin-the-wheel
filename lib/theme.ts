import type { ThemeColors } from "./types";

export function themeToCssVars(theme: ThemeColors): Record<string, string> {
  return {
    "--bg": theme.bg,
    "--surface": theme.surface,
    "--accent": theme.accent,
    "--gold": theme.gold,
    "--text": theme.text,
    "--muted": theme.muted,
  };
}
