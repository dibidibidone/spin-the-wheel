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
});
