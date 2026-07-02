import type { TrackType } from "@/lib/eventTypes";

// Fire-and-forget funnel beacon to our own /api/track endpoint. keepalive lets it survive
// a navigation/unload (the /launch redirect); same-origin sends the vid cookie and honors
// the Set-Cookie response. No-op on the server. Never throws.
export function beaconEvent(type: TrackType): void {
  if (typeof fetch === "undefined") return;
  try {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    /* fire-and-forget */
  }
}
