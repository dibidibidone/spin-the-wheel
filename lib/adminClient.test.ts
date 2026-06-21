import { describe, it, expect, vi, beforeEach } from "vitest";
import { patchLanding, uploadFile } from "@/lib/adminClient";

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
