import { describe, it, expect } from "vitest";
import { templateKind, isWheel } from "./templateKind";

describe("templateKind", () => {
  it("maps templates to kinds", () => {
    expect(templateKind("classic-2d")).toBe("wheel-2d");
    expect(templateKind("jackpot-vault")).toBe("wheel-3d");
    expect(templateKind("alchemy-lab")).toBe("wheel-3d");
    expect(templateKind("book-of-ra")).toBe("slot");
    expect(templateKind("gates-of-olympus")).toBe("slot");
  });
  it("isWheel is true for 2D and 3D wheels, false for slots", () => {
    expect(isWheel("classic-2d")).toBe(true);
    expect(isWheel("jackpot-vault")).toBe(true);
    expect(isWheel("book-of-ra")).toBe(false);
  });
});
