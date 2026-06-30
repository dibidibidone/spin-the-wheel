import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/vercel", () => ({
  attachDomain: vi.fn(async () => ({ name: "x.com", verified: false, verification: [] })),
  verifyDomain: vi.fn(async () => ({ name: "x.com", verified: true, verification: [] })),
  removeDomain: vi.fn(async () => {}),
  VercelApiError: class extends Error { status = 404; },
}));

import { attachDomain, verifyDomain, removeDomain } from "@/lib/vercel";
import { createVercelOrigin } from "./vercelOrigin";

const config = { token: "t", projectId: "p" };
afterEach(() => vi.clearAllMocks());

describe("vercel origin adapter", () => {
  it("attach maps Vercel's verified flag", async () => {
    const o = createVercelOrigin(config);
    expect(await o.attach("x.com")).toEqual({ verified: false });
    expect(attachDomain).toHaveBeenCalledWith(config, "x.com");
  });
  it("verify maps the verified flag", async () => {
    const o = createVercelOrigin(config);
    expect(await o.verify("x.com")).toEqual({ verified: true });
    expect(verifyDomain).toHaveBeenCalledWith(config, "x.com");
  });
  it("detach delegates to removeDomain", async () => {
    const o = createVercelOrigin(config);
    await o.detach("x.com");
    expect(removeDomain).toHaveBeenCalledWith(config, "x.com");
  });
});
