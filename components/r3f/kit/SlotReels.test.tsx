import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SlotReels } from "./SlotReels";
import { createSlotController } from "./slotController";
import type { SlotTheme } from "./types";

const theme: SlotTheme = {
  reels: 3, rows: 3,
  symbols: [
    { id: "a", label: "Ace", glyph: "A", color: "#fff" },
    { id: "b", label: "King", glyph: "K", color: "#fff" },
    { id: "book", label: "Book", glyph: "📖", color: "#fc0", isWin: true },
  ],
  winSymbolId: "book", winCount: 3, winOnSpin: 2,
  nearMissGrid: [["a", "book", "b"], ["a", "b", "a"], ["b", "a", "b"]],
  winGrid: [["a", "book", "b"], ["a", "book", "a"], ["b", "book", "b"]],
  winningCells: [[0, 1], [1, 1], [2, 1]], winLineRow: 1,
  durationMs: 1000,
  cabinet: { frame: "#1a1206", glass: "#0c0802", glow: "#000", accent: "#fc0" },
};

function makeController() {
  return createSlotController({
    reels: theme.reels, rows: theme.rows, pool: theme.symbols.map((s) => s.id),
    nearMissGrid: theme.nearMissGrid, winGrid: theme.winGrid, winOnSpin: theme.winOnSpin,
    durationMs: theme.durationMs, spinRows: 10,
  });
}

describe("SlotReels", () => {
  it("renders one column per reel and a full strip of tiles", () => {
    const c = makeController();
    const { container } = render(<SlotReels theme={theme} controller={c} status="idle" onStatus={() => {}} />);
    expect(container.querySelectorAll("[data-reel]")).toHaveLength(3);
    // each strip = spinRows(10) + rows(3) = 13 tiles
    expect(container.querySelectorAll('[data-reel="0"] [data-tile]')).toHaveLength(13);
  });

  it("marks no winning cells until the win, then lights exactly the winning combination", () => {
    const c = makeController();
    c.start(); c.update(2000); // spin 1 -> near-miss
    c.start(); c.update(2000); // spin 2 -> won (strips now hold the winGrid)

    const idle = render(<SlotReels theme={theme} controller={c} status="idle" onStatus={() => {}} />);
    expect(idle.container.querySelectorAll('[data-win="true"]')).toHaveLength(0);
    idle.unmount();

    const win = render(<SlotReels theme={theme} controller={c} status="won" onStatus={() => {}} />);
    // exactly the 3 winningCells are lit
    expect(win.container.querySelectorAll('[data-win="true"]')).toHaveLength(theme.winningCells.length);
  });
});
