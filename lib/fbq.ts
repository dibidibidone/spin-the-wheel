// Meta (Facebook) Pixel browser helper. Loads fbevents.js once, inits each pixel once,
// and forwards track events to the shared window.fbq queue. No-op on the server.
declare global {
  interface Window { fbq?: (...args: unknown[]) => void; _fbq?: unknown; }
}

const inited = new Set<string>();

export function ensureBaseSnippet(): void {
  if (typeof window === "undefined" || window.fbq) return;
  const n = function (...args: unknown[]) {
    const self = n as unknown as { callMethod?: (...a: unknown[]) => void; queue: unknown[] };
    if (self.callMethod) self.callMethod(...args); else self.queue.push(args);
  } as unknown as Window["fbq"] & { queue: unknown[]; loaded: boolean; version: string; push: unknown };
  n.queue = []; n.loaded = true; n.version = "2.0"; n.push = n;
  window.fbq = n; window._fbq = n;
  const t = document.createElement("script");
  t.async = true; t.src = "https://connect.facebook.net/en_US/fbevents.js";
  const s = document.getElementsByTagName("script")[0];
  if (s && s.parentNode) s.parentNode.insertBefore(t, s); else document.head.appendChild(t);
}

export function initPixels(ids: string[]): void {
  if (typeof window === "undefined" || !window.fbq) return;
  for (const id of ids) {
    if (inited.has(id)) continue;
    inited.add(id);
    window.fbq("init", id);
  }
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}
