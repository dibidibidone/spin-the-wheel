import { describe, it, expect } from "vitest";
import { createSlotController } from "./slotController";

const pool = ["a", "b", "book"];
const nearMissGrid = [["a", "book", "b"], ["a", "b", "a"], ["b", "a", "b"]]; // 1 book
const winGrid = [["a", "book", "b"], ["a", "book", "a"], ["b", "book", "b"]]; // 3 books (a line)

function make() {
  return createSlotController({ reels: 3, rows: 3, pool, nearMissGrid, winGrid, winOnSpin: 2, durationMs: 1000, spinRows: 10 });
}
function settle(c: ReturnType<typeof make>) { c.update(2000); } // past the longest stop time

describe("createSlotController", () => {
  it("starts idle with neutral strips already built", () => {
    const c = make();
    expect(c.status).toBe("idle");
    expect(c.spinCount).toBe(0);
    expect(c.strips).toHaveLength(3);
    expect(c.strips[0]).toHaveLength(10 + 3); // spinRows + rows
  });

  it("spin 1 lands a near-miss; spin 2 lands the win", () => {
    const c = make();
    c.start();
    expect(c.status).toBe("spinning");
    expect(c.spinCount).toBe(1);
    settle(c);
    expect(c.status).toBe("nearmiss");
    expect(c.winning).toBe(false);
    expect(c.strips.map((s) => s.slice(-3))).toEqual(nearMissGrid);

    c.start(); // allowed from nearmiss
    expect(c.status).toBe("spinning");
    expect(c.spinCount).toBe(2);
    settle(c);
    expect(c.status).toBe("won");
    expect(c.winning).toBe(true);
    expect(c.strips.map((s) => s.slice(-3))).toEqual(winGrid);
  });

  it("stops reels left -> right (reel 0 before the last reel)", () => {
    const c = make();
    c.start();
    c.update(560); // > reel0 stop (550), < last reel stop (1000)
    expect(c.stopped[0]).toBe(true);
    expect(c.stopped[2]).toBe(false);
  });

  it("ignores start() while spinning and update() while not spinning", () => {
    const c = make();
    c.update(100); // idle: no-op, no throw
    expect(c.status).toBe("idle");
    c.start();
    c.start(); // ignored while spinning
    expect(c.spinCount).toBe(1);
  });

  it("reset returns to idle and clears the spin count", () => {
    const c = make();
    c.start(); settle(c); c.start(); settle(c);
    expect(c.status).toBe("won");
    c.reset();
    expect(c.status).toBe("idle");
    expect(c.spinCount).toBe(0);
    expect(c.strips.map((s) => s.slice(-3))).not.toEqual(winGrid); // reset rebuilds neutral strips, not the win grid
  });
});

describe("createSlotController — win spin is slower in the end", () => {
  it("runs the win for winDurationMs while a near-miss settles by durationMs", () => {
    const c = createSlotController({ reels: 3, rows: 3, pool, nearMissGrid, winGrid, winOnSpin: 2, durationMs: 1000, winDurationMs: 4000, spinRows: 10 });
    c.start();
    c.update(1000); // near-miss: last reel stops at durationMs
    expect(c.status).toBe("nearmiss");

    c.start();
    c.update(1000); // win: last reel stops at winDurationMs (4000), so still spinning here
    expect(c.status).toBe("spinning");
    c.update(3000); // total 4000
    expect(c.status).toBe("won");
  });

  it("scales the win spin distance so the longer spin keeps a believable scroll speed", () => {
    const c = createSlotController({ reels: 3, rows: 3, pool, nearMissGrid, winGrid, winOnSpin: 1, durationMs: 1000, winDurationMs: 4000, spinRows: 10 });
    c.start(); // spin 1 is the win (winOnSpin 1)
    expect(c.spinRows).toBe(40);              // 10 * 4000/1000
    expect(c.strips[0]).toHaveLength(40 + 3); // scaled filler + rows
  });

  it("defaults winDurationMs to durationMs (near-miss timing unchanged)", () => {
    const c = make(); // no winDurationMs
    c.start(); settle(c);   // near-miss
    c.start(); c.update(1000); // win settles by durationMs when winDurationMs omitted
    expect(c.status).toBe("won");
    expect(c.spinRows).toBe(10);
  });
});
