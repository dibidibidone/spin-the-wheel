import { describe, it, expect } from "vitest";
import { bookOfRaTheme } from "./book-of-ra/theme";
import { gatesTheme } from "./gates-of-olympus/theme";
import type { SlotTheme, SlotCell } from "../kit/types";

const cellSymbol = (t: SlotTheme, [reel, row]: SlotCell) => t.winGrid[reel][row];
const countInGrid = (grid: string[][], id: string) => grid.flat().filter((c) => c === id).length;
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

describe("Gates of Olympus theme — real pay-anywhere purple-gem cluster + orbs", () => {
  it("winGrid holds exactly winCount (8) purple gems", () => {
    expect(gatesTheme.winSymbolId).toBe("gemPurple");
    expect(gatesTheme.winCount).toBe(8);
    expect(countInGrid(gatesTheme.winGrid, "gemPurple")).toBe(8);
  });
  it("every winningCell is the cluster gem or a multiplier orb", () => {
    for (const cell of gatesTheme.winningCells) {
      const id = cellSymbol(gatesTheme, cell);
      const sym = symbolById(gatesTheme, id);
      expect(sym, `symbol "${id}" should be defined`).toBeDefined();
      expect(id === "gemPurple" || sym?.isOrb === true).toBe(true);
    }
  });
  it("winningCells cover all 8 gems + the 2 multiplier orbs (10 lit cells)", () => {
    expect(gatesTheme.winningCells).toHaveLength(10);
    const orbCells = gatesTheme.winningCells.filter((c) => symbolById(gatesTheme, cellSymbol(gatesTheme, c))?.isOrb);
    expect(orbCells).toHaveLength(2);
  });
  it("multiplier orbs appear only in the win grid, never in the near-miss", () => {
    const orbIds = gatesTheme.symbols.filter((s) => s.isOrb).map((s) => s.id);
    expect(orbIds.length).toBeGreaterThan(0);
    for (const id of orbIds) {
      expect(countInGrid(gatesTheme.winGrid, id)).toBeGreaterThan(0);
      expect(countInGrid(gatesTheme.nearMissGrid, id)).toBe(0);
    }
  });
  it("nearMiss holds exactly 7 purple gems (one short of 8)", () => {
    expect(countInGrid(gatesTheme.nearMissGrid, "gemPurple")).toBe(7);
  });
  it("uses the authentic Gates symbol set", () => {
    const ids = gatesTheme.symbols.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["zeus", "crown", "hourglass", "ring", "chalice", "gemRed", "gemBlue", "gemGreen", "gemPurple"]));
  });
});
