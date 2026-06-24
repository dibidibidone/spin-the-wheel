import { describe, it, expect, vi, beforeEach } from "vitest";
import { patchLanding, uploadFile, flagDomain, retryDomain } from "@/lib/adminClient";

beforeEach(() => vi.restoreAllMocks());

describe("patchLanding", () => {
  it("PATCHes JSON and returns the parsed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(patchLanding("l1", { heading: "Hi" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/landings/l1", expect.objectContaining({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heading: "Hi" }),
    }));
  });

  it("throws the server error message on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "bad slug" }), { status: 400 })));
    await expect(patchLanding("l1", { slug: "X" })).rejects.toThrow("bad slug");
  });
});

describe("uploadFile", () => {
  it("POSTs multipart form data and returns the url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://blob/x.png" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["d"], "x.png", { type: "image/png" });

    await expect(uploadFile(file)).resolves.toEqual({ url: "https://blob/x.png" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/upload");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });
});

// Fix 5: flagDomain and retryDomain must surface errors (they previously swallowed non-ok responses)
describe("flagDomain", () => {
  it("resolves silently on success (2xx)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    await expect(flagDomain("d1", "spam")).resolves.toBeUndefined();
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "not found" }), { status: 404 })));
    await expect(flagDomain("d1", "spam")).rejects.toThrow("not found");
  });

  it("throws a generic message when the error body is empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    await expect(flagDomain("d1", "spam")).rejects.toThrow("flagDomain failed (500)");
  });
});

describe("retryDomain", () => {
  it("resolves silently on success (2xx)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    await expect(retryDomain("d1")).resolves.toBeUndefined();
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })));
    await expect(retryDomain("d1")).rejects.toThrow("unauthorized");
  });
});
