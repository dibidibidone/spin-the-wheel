// Wire-level funnel event names (lowercase). The Prisma EventType enum is uppercase;
// lib/events.ts maps between them. Kept dependency-free so both client (lib/track.ts)
// and server (lib/events.ts) can import the type without crossing the runtime boundary.
export type TrackType = "visit" | "install" | "open";
