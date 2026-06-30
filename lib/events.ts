import { prisma } from "@/lib/db";
import type { TrackType } from "@/lib/eventTypes";

const TYPE_MAP = { visit: "VISIT", install: "INSTALL", open: "OPEN" } as const;

export function isTrackType(v: unknown): v is TrackType {
  return v === "visit" || v === "install" || v === "open";
}

export async function recordEvent(input: { landingId: string; visitorId: string; type: TrackType }): Promise<void> {
  await prisma.event.create({
    data: { landingId: input.landingId, visitorId: input.visitorId, type: TYPE_MAP[input.type] },
  });
}
