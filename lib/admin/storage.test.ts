// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { put, writeFile, mkdir } = vi.hoisted(() => ({ put: vi.fn(), writeFile: vi.fn(), mkdir: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: (...a: unknown[]) => put(...a) }));
vi.mock("node:fs/promises", () => ({ writeFile: (...a: unknown[]) => writeFile(...a), mkdir: (...a: unknown[]) => mkdir(...a) }));

import { storeUpload } from "@/lib/admin/storage";

const file = () => new File(["data"], "my logo!.png", { type: "image/png" });

beforeEach(() => { put.mockReset(); writeFile.mockReset(); mkdir.mockReset(); });
afterEach(() => { delete process.env.BLOB_READ_WRITE_TOKEN; });

describe("storeUpload", () => {
  it("uses Vercel Blob when the token is set", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "tok";
    put.mockResolvedValue({ url: "https://blob.example/x.png" });
    expect(await storeUpload(file())).toEqual({ url: "https://blob.example/x.png" });
    expect(put).toHaveBeenCalledOnce();
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("falls back to the local filesystem (public/uploads) when no token is set", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    mkdir.mockResolvedValue(undefined);
    writeFile.mockResolvedValue(undefined);
    const { url } = await storeUpload(file());
    expect(url).toMatch(/^\/uploads\/.+-my_logo_\.png$/); // unsafe chars sanitized to _
    expect(mkdir).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledOnce();
    expect(put).not.toHaveBeenCalled();
  });
});
