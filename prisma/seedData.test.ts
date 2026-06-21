import { describe, it, expect } from "vitest";
import { boomzinoSeed } from "@/prisma/seedData";

describe("boomzinoSeed", () => {
  it("has eight prizes with unique, contiguous order 0..7", () => {
    const orders = boomzinoSeed.prizes.map((p) => p.order).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("points winningOrder at an existing prize", () => {
    const winner = boomzinoSeed.prizes.find((p) => p.order === boomzinoSeed.winningOrder);
    expect(winner?.label).toBe("JACKPOT");
  });

  it("is published and has a redirect URL", () => {
    expect(boomzinoSeed.status).toBe("published");
    expect(boomzinoSeed.redirectUrl).toMatch(/^https?:\/\//);
  });
});
