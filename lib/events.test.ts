import { describe, it, expect, vi, beforeEach } from "vitest";

const { event } = vi.hoisted(() => ({ event: { create: vi.fn() } }));
vi.mock("@/lib/db", () => ({ prisma: { event } }));

import { recordEvent, isTrackType } from "./events";

beforeEach(() => event.create.mockReset());

describe("recordEvent", () => {
  it("maps the wire type to the EventType enum and inserts a row", async () => {
    await recordEvent({ landingId: "l1", visitorId: "v1", type: "visit" });
    expect(event.create).toHaveBeenCalledWith({ data: { landingId: "l1", visitorId: "v1", type: "VISIT" } });
    await recordEvent({ landingId: "l1", visitorId: "v1", type: "install" });
    await recordEvent({ landingId: "l1", visitorId: "v1", type: "open" });
    expect(event.create.mock.calls[1][0].data.type).toBe("INSTALL");
    expect(event.create.mock.calls[2][0].data.type).toBe("OPEN");
  });
});

describe("isTrackType", () => {
  it("accepts the three wire names and rejects anything else", () => {
    expect(isTrackType("visit")).toBe(true);
    expect(isTrackType("install")).toBe(true);
    expect(isTrackType("open")).toBe(true);
    expect(isTrackType("lead")).toBe(false);
    expect(isTrackType(undefined)).toBe(false);
  });
});
