import { describe, it, expect, vi, beforeEach } from "vitest";
import { beaconEvent } from "./track";

beforeEach(() => { vi.restoreAllMocks(); });

describe("beaconEvent", () => {
  it("POSTs the event to /api/track with keepalive + same-origin credentials", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    beaconEvent("open");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/track");
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "same-origin" });
    expect(JSON.parse(init.body)).toEqual({ type: "open" });
    expect(init.headers).toMatchObject({ "content-type": "application/json" });
  });

  it("never throws if fetch rejects (fire-and-forget)", () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => beaconEvent("visit")).not.toThrow();
  });
});
