import { describe, it, expect, vi, beforeEach } from "vitest";

const recordEvent = vi.fn();
vi.mock("@/lib/events", () => ({
  recordEvent: (i: unknown) => recordEvent(i),
  isTrackType: (v: unknown) => v === "visit" || v === "install" || v === "open",
}));
const getLandingIdByHost = vi.fn();
vi.mock("@/lib/tenant", () => ({ getLandingIdByHost: (h: string) => getLandingIdByHost(h) }));

import { POST } from "./route";

function req(body: unknown, { host = "promo.com", cookie }: { host?: string; cookie?: string } = {}) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (host) headers["x-forwarded-host"] = host;
  if (cookie) headers["cookie"] = cookie;
  return new Request("http://promo.com/api/track", { method: "POST", headers, body: JSON.stringify(body) });
}

beforeEach(() => { recordEvent.mockReset(); getLandingIdByHost.mockReset(); getLandingIdByHost.mockResolvedValue("l1"); });

describe("POST /api/track", () => {
  it("mints a vid cookie and records the event when none is present", async () => {
    const res = await POST(req({ type: "visit" }));
    expect(res.status).toBe(204);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/^vid=/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(recordEvent).toHaveBeenCalledTimes(1);
    const arg = recordEvent.mock.calls[0][0];
    expect(arg).toMatchObject({ landingId: "l1", type: "visit" });
    expect(typeof arg.visitorId).toBe("string");
    expect(arg.visitorId.length).toBeGreaterThan(0);
  });

  it("reuses an existing vid cookie and sets no cookie", async () => {
    const res = await POST(req({ type: "open" }, { cookie: "vid=abc-123" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(recordEvent).toHaveBeenCalledWith({ landingId: "l1", visitorId: "abc-123", type: "open" });
  });

  it("404 for an unknown host", async () => {
    getLandingIdByHost.mockResolvedValue(null);
    expect((await POST(req({ type: "visit" }))).status).toBe(404);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it("400 for a bad event type", async () => {
    expect((await POST(req({ type: "lead" }))).status).toBe(400);
    expect(recordEvent).not.toHaveBeenCalled();
  });
});
