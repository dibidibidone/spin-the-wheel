import type { SocialProofItem } from "./types";

export function formatWinner(item: SocialProofItem): string {
  const when = item.minutesAgo <= 0 ? "just now" : `${item.minutesAgo}m ago`;
  return `🔥 ${item.name} won ${item.amount} · ${when}`;
}

export function nextIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return (i + 1) % len;
}
