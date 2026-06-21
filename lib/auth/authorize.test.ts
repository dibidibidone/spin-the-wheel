import { describe, it, expect, vi } from "vitest";
import { authorizeAdmin } from "@/lib/auth/authorize";

const admin = { id: "a1", email: "admin@x.com", passwordHash: "HASH" };

describe("authorizeAdmin", () => {
  it("returns the admin identity for valid credentials", async () => {
    const findAdmin = vi.fn().mockResolvedValue(admin);
    const verify = vi.fn().mockResolvedValue(true);
    const result = await authorizeAdmin({ email: "Admin@X.com", password: "pw" }, { findAdmin, verify });
    expect(findAdmin).toHaveBeenCalledWith("admin@x.com"); // trimmed + lowercased
    expect(verify).toHaveBeenCalledWith("pw", "HASH");
    expect(result).toEqual({ id: "a1", email: "admin@x.com" });
  });

  it("returns null when the email is unknown", async () => {
    const result = await authorizeAdmin(
      { email: "nobody@x.com", password: "pw" },
      { findAdmin: vi.fn().mockResolvedValue(null), verify: vi.fn() },
    );
    expect(result).toBeNull();
  });

  it("returns null on a bad password", async () => {
    const result = await authorizeAdmin(
      { email: "admin@x.com", password: "bad" },
      { findAdmin: vi.fn().mockResolvedValue(admin), verify: vi.fn().mockResolvedValue(false) },
    );
    expect(result).toBeNull();
  });

  it("returns null when fields are missing", async () => {
    const deps = { findAdmin: vi.fn(), verify: vi.fn() };
    expect(await authorizeAdmin({ email: "", password: "pw" }, deps)).toBeNull();
    expect(await authorizeAdmin(undefined, deps)).toBeNull();
    expect(deps.findAdmin).not.toHaveBeenCalled();
  });
});
