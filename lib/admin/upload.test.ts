import { describe, it, expect } from "vitest";
import { validateUpload } from "@/lib/admin/upload";

describe("validateUpload", () => {
  it("accepts a small png", () => {
    expect(validateUpload({ type: "image/png", size: 1024 })).toEqual({ ok: true });
  });

  it("rejects a non-image type", () => {
    const r = validateUpload({ type: "application/pdf", size: 1024 });
    expect(r.ok).toBe(false);
  });

  it("rejects files over 2MB", () => {
    const r = validateUpload({ type: "image/png", size: 2 * 1024 * 1024 + 1 });
    expect(r.ok).toBe(false);
  });
});
