import { describe, it, expect, vi } from "vitest";
import { seedAdmin } from "@/prisma/seedAdmin";
import { verifyPassword } from "@/lib/auth/password";

describe("seedAdmin", () => {
  it("upserts a lowercased admin with a verifiable bcrypt hash", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    await seedAdmin({ admin: { upsert } }, "Admin@Boomzino.Example", "changeme123");

    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ email: "admin@boomzino.example" });
    expect(arg.create.email).toBe("admin@boomzino.example");

    const hash = arg.create.passwordHash;
    expect(arg.update.passwordHash).toBe(hash);
    expect(await verifyPassword("changeme123", hash)).toBe(true);
  });
});
