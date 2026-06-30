import { describe, it, expect } from "vitest";
import { bookOfRaTheme } from "./book-of-ra/theme";
import { gatesTheme } from "./gates-of-olympus/theme";
import type { SlotTheme, SlotCell } from "../kit/types";

const cellSymbol = (t: SlotTheme, [reel, row]: SlotCell) => t.winGrid[reel][row];
const symbolById = (t: SlotTheme, id: string) => t.symbols.find((s) => s.id === id);

describe("Book of Ra theme — real Explorer payline win", () => {
  it("winGrid centre row is a 5-of-a-kind Explorer payline on winLineRow", () => {
    expect(bookOfRaTheme.winLineRow).toBe(1);
    const line = bookOfRaTheme.winGrid.map((reel) => reel[1]);
    expect(line).toEqual(["explorer", "explorer", "explorer", "explorer", "explorer"]);
  });
  it("winningCells are exactly the 5 line cells, each an Explorer", () => {
    expect(bookOfRaTheme.winningCells).toHaveLength(5);
    for (const cell of bookOfRaTheme.winningCells) {
      expect(cellSymbol(bookOfRaTheme, cell)).toBe("explorer");
    }
  });
  it("nearMiss centre row holds exactly 4 Explorers (one short of the payline)", () => {
    const line = bookOfRaTheme.nearMissGrid.map((reel) => reel[1]);
    expect(line.filter((c) => c === "explorer")).toHaveLength(4);
  });
  it("uses the authentic Book of Ra symbol set", () => {
    const ids = bookOfRaTheme.symbols.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["book", "explorer", "pharaoh", "anubis", "scarab", "A", "K", "Q", "J", "T"]));
  });
});

describe("Gates of Olympus theme — multiplier-orb storm win (no colored gems)", () => {
  const orbsIn = (grid: string[][]) => grid.flat().filter((id) => symbolById(gatesTheme, id)?.isOrb);

  it("has no colored gem symbols", () => {
    const ids = gatesTheme.symbols.map((s) => s.id);
    expect(ids.some((id) => id.startsWith("gem"))).toBe(false);
  });
  it("the win is a 6-orb multiplier storm", () => {
    expect(orbsIn(gatesTheme.winGrid)).toHaveLength(6);
    expect(gatesTheme.winningCells).toHaveLength(6);
    for (const cell of gatesTheme.winningCells) {
      const sym = symbolById(gatesTheme, cellSymbol(gatesTheme, cell));
      expect(sym?.isOrb, `winning cell ${cell} should be a multiplier orb`).toBe(true);
    }
  });
  it("the near-miss has no orbs (the storm doesn't break)", () => {
    expect(orbsIn(gatesTheme.nearMissGrid)).toHaveLength(0);
  });
  it("uses the Olympus symbol set: treasures + temple + Zeus + multiplier orbs", () => {
    const ids = gatesTheme.symbols.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([
      "zeus", "crown", "hourglass", "ring", "chalice", "temple",
      "orb25", "orb50", "orb100", "orb150", "orb250", "orb500",
    ]));
  });
});
