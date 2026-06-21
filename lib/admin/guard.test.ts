import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

import { requireApiSession } from "@/lib/admin/guard";

beforeEach(() => authMock.mockReset());

describe("requireApiSession", () => {
  it("returns a 401 response when there is no session", async () => {
    authMock.mockResolvedValue(null);
    const result = await requireApiSession();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({ error: "Unauthorized" });
    }
  });

  it("returns the session when authenticated", async () => {
    const session = { user: { email: "admin@x.com" } };
    authMock.mockResolvedValue(session);
    const result = await requireApiSession();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session).toBe(session);
  });
});
