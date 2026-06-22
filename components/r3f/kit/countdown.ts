export function remainingMs(deadline: number, now: number): number {
  return Math.max(0, deadline - now);
}

export function formatMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function seedDeadline(key: string, durationMs: number, now: number, storage: Storage | null): number {
  const existing = storage?.getItem(key);
  if (existing) {
    const n = Number(existing);
    if (Number.isFinite(n)) return n;
  }
  const deadline = now + durationMs;
  storage?.setItem(key, String(deadline));
  return deadline;
}
