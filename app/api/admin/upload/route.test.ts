// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { requireApiSession, put } = vi.hoisted(() => ({
  requireApiSession: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@/lib/admin/guard", () => ({ requireApiSession: () => requireApiSession() }));
vi.mock("@vercel/blob", () => ({ put: (...a: unknown[]) => put(...a) }));

import { POST } from "@/app/api/admin/upload/route";

const authed = { ok: true, session: { user: {} } };
const denied = { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };

function formWith(file: File | null): Request {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request("http://x/api/admin/upload", { method: "POST", body: form });
}

beforeEach(() => {
  requireApiSession.mockReset();
  put.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = "test-token"; // exercise the Vercel Blob path (mocked above)
});
afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe("POST /api/admin/upload", () => {
  it("401 without a session", async () => {
    requireApiSession.mockResolvedValue(denied);
    expect((await POST(formWith(null))).status).toBe(401);
  });

  it("400 when no file is provided", async () => {
    requireApiSession.mockResolvedValue(authed);
    expect((await POST(formWith(null))).status).toBe(400);
  });

  it("400 when the file is not an allowed image", async () => {
    requireApiSession.mockResolvedValue(authed);
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    expect((await POST(formWith(file))).status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it("uploads and returns the blob url", async () => {
    requireApiSession.mockResolvedValue(authed);
    put.mockResolvedValue({ url: "https://blob.vercel-storage.com/logo.png" });
    const file = new File(["data"], "logo.png", { type: "image/png" });
    const res = await POST(formWith(file));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: "https://blob.vercel-storage.com/logo.png" });
    expect(put).toHaveBeenCalledOnce();
  });
});
