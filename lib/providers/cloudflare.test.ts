import { describe, it, expect, vi, afterEach } from "vitest";
import { createCloudflareEdge } from "./cloudflare";

const config = { apiToken: "t", accountId: "acct-1" };

type Reply = { status?: number; json: unknown };
function mockSequence(replies: Reply[]) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  let i = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(init.body as string) : null });
    const r = replies[Math.min(i++, replies.length - 1)];
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200 });
  }));
  return calls;
}
afterEach(() => vi.unstubAllGlobals());
const ok = (result: unknown) => ({ json: { success: true, errors: [], result } });

describe("cloudflare edge", () => {
  it("createZone returns the zone id + assigned nameservers", async () => {
    const calls = mockSequence([ok({ id: "zone-1", name_servers: ["dana.ns.cloudflare.com", "rob.ns.cloudflare.com"] })]);
    const edge = createCloudflareEdge(config);
    const z = await edge.createZone("boomzino.click");
    expect(z).toEqual({ zoneId: "zone-1", nameservers: ["dana.ns.cloudflare.com", "rob.ns.cloudflare.com"] });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/zones");
    expect(calls[0].body).toMatchObject({ name: "boomzino.click", account: { id: "acct-1" } });
  });

  it("upsertRecords creates a DNS-only A record (proxied:false in Phase 0)", async () => {
    const calls = mockSequence([ok([]), ok({ id: "rec-1" })]); // list (empty) then create
    const edge = createCloudflareEdge(config);
    await edge.upsertRecords("zone-1", [{ type: "A", name: "boomzino.click", content: "76.76.21.21", proxied: false }]);
    const create = calls[1];
    expect(create.method).toBe("POST");
    expect(create.url).toContain("/zones/zone-1/dns_records");
    expect(create.body).toMatchObject({ type: "A", name: "boomzino.click", content: "76.76.21.21", proxied: false });
  });

  it("upsertRecords updates an existing record via PUT", async () => {
    const existing = [{ id: "rec-1", name: "boomzino.click", type: "A" }];
    const calls = mockSequence([ok(existing), ok({ id: "rec-1" })]);
    const edge = createCloudflareEdge(config);
    await edge.upsertRecords("zone-1", [{ type: "A", name: "boomzino.click", content: "1.2.3.4", proxied: false }]);
    expect(calls[1].method).toBe("PUT");
    expect(calls[1].url).toContain("/dns_records/rec-1");
  });

  it("deleteZone issues DELETE on the zone", async () => {
    const calls = mockSequence([ok({ id: "zone-1" })]);
    const edge = createCloudflareEdge(config);
    await edge.deleteZone("zone-1");
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toContain("/zones/zone-1");
  });

  it("ensureSsl maps the universal cert status to active/pending", async () => {
    mockSequence([ok({ certificate_authority: "google", status: "active" })]);
    const edge = createCloudflareEdge(config);
    expect(await edge.ensureSsl("zone-1")).toBe("active");
  });

  it("throws on a Cloudflare error envelope", async () => {
    mockSequence([{ json: { success: false, errors: [{ message: "zone exists" }] } }]);
    const edge = createCloudflareEdge(config);
    await expect(edge.createZone("x.com")).rejects.toThrow(/zone exists/);
  });
});
