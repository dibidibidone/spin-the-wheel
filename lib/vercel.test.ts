import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  attachDomain,
  verifyDomain,
  removeDomain,
  vercelConfigFromEnv,
  VercelApiError,
} from "@/lib/vercel";

const config = { token: "tok_123", projectId: "prj_1" };

function jsonRes(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

beforeEach(() => vi.unstubAllGlobals());

describe("attachDomain", () => {
  it("POSTs to the v10 project domains endpoint with auth + name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRes({ name: "promo.com", verified: false, verification: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const domain = await attachDomain(config, "promo.com");

    expect(domain).toEqual({ name: "promo.com", verified: false, verification: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.vercel.com/v10/projects/prj_1/domains");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "promo.com" }));
    expect(init.headers.Authorization).toBe("Bearer tok_123");
  });

  it("appends teamId when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ name: "promo.com", verified: true, verification: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await attachDomain({ ...config, teamId: "team_9" }, "promo.com");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.vercel.com/v10/projects/prj_1/domains?teamId=team_9",
    );
  });

  it("throws VercelApiError carrying the API status and code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonRes({ error: { code: "domain_taken", message: "in use" } }, 409));
    vi.stubGlobal("fetch", fetchMock);

    await expect(attachDomain(config, "taken.com")).rejects.toMatchObject({
      name: "VercelApiError",
      status: 409,
      code: "domain_taken",
      message: "in use",
    });
  });
});

describe("verifyDomain", () => {
  it("POSTs to the v9 verify endpoint and returns the parsed domain", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ name: "promo.com", verified: true, verification: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const domain = await verifyDomain(config, "promo.com");

    expect(domain.verified).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.vercel.com/v9/projects/prj_1/domains/promo.com/verify",
    );
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });
});

describe("removeDomain", () => {
  it("DELETEs and tolerates a 204 with no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(removeDomain(config, "promo.com")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.vercel.com/v9/projects/prj_1/domains/promo.com");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("vercelConfigFromEnv", () => {
  it("reads env vars and throws when required ones are missing", () => {
    const prev = { ...process.env };
    process.env.VERCEL_TOKEN = "tok";
    process.env.VERCEL_PROJECT_ID = "prj";
    delete process.env.VERCEL_TEAM_ID;
    expect(vercelConfigFromEnv()).toEqual({ token: "tok", projectId: "prj", teamId: undefined });

    delete process.env.VERCEL_PROJECT_ID;
    expect(() => vercelConfigFromEnv()).toThrow(/VERCEL_PROJECT_ID/);
    process.env = prev;
  });
});

describe("VercelApiError", () => {
  it("is an Error subclass", () => {
    expect(new VercelApiError(500, "x", "y")).toBeInstanceOf(Error);
  });
});
