import { describe, it, expect } from "vitest";
import { createSpinController } from "./spinController";
import { segmentUnderPointer } from "./spinMath";

describe("createSpinController", () => {
  it("starts idle at rotation 0", () => {
    const c = createSpinController();
    expect(c.status).toBe("idle");
    expect(c.rotation).toBe(0);
  });

  it("transitions idle -> spinning -> won and lands on target", () => {
    const c = createSpinController({ winningIndex: 7, durationMs: 1000, turns: 6 });
    c.start();
    expect(c.status).toBe("spinning");
    c.update(500);
    expect(c.status).toBe("spinning");
    expect(c.rotation).toBeGreaterThan(0);
    c.update(600); // total 1100 >= 1000
    expect(c.status).toBe("won");
    expect(c.rotation).toBeCloseTo(c.target, 5);
    expect(segmentUnderPointer(c.rotation, 8)).toBe(7); // lands barely inside the winning segment
  });

  it("ignores start() while spinning and update() while idle/won", () => {
    const c = createSpinController({ durationMs: 1000 });
    c.update(500);
    expect(c.rotation).toBe(0); // idle: no-op
    c.start();
    c.start(); // second start ignored
    c.update(2000);
    const r = c.rotation;
    c.update(2000); // won: no-op
    expect(c.rotation).toBe(r);
  });

  it("reset returns to idle", () => {
    const c = createSpinController({ durationMs: 100 });
    c.start();
    c.update(200);
    c.reset();
    expect(c.status).toBe("idle");
    expect(c.rotation).toBe(0);
  });
});

import { describe as d3, it as i3, expect as e3 } from "vitest";
import { createSpinController as make } from "./spinController";

d3("createSpinController — win on Nth spin", () => {
  i3("near-misses on spin 1 then wins on spin 2 (winOnSpin=2)", () => {
    const c = make({ winningIndex: 7, winOnSpin: 2, durationMs: 100, turns: 1 });
    c.start();
    c.update(100);
    e3(c.status).toBe("nearmiss");
    e3(segmentUnderPointer(c.rotation, 8)).toBe(0); // stops on the near-miss segment (winningIndex+1), just short
    c.start(); // allowed from nearmiss
    c.update(100);
    e3(c.status).toBe("won");
    e3(c.winning).toBe(true);
  });

  i3("wins on the first spin when winOnSpin=1", () => {
    const c = make({ winningIndex: 3, winOnSpin: 1, durationMs: 100, turns: 1 });
    c.start();
    c.update(100);
    e3(c.status).toBe("won");
  });
});
