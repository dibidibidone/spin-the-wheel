export type RangePreset = "today" | "7d" | "30d" | "all";

// Resolves a preset to absolute instants using the caller's local clock. "today" starts at
// local midnight; "7d"/"30d" look back N*24h from now; "all" has no bounds.
export function presetToRange(preset: RangePreset, now: Date = new Date()): { from?: Date; to?: Date } {
  if (preset === "all") return {};
  if (preset === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  const days = preset === "7d" ? 7 : 30;
  return { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now };
}
