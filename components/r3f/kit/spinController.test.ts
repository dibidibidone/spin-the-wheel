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

d3("createSpinController — win spin is slower than the near-miss", () => {
  i3("runs the win for winDurationMs and the near-miss for durationMs", () => {
    const c = make({ winningIndex: 7, winOnSpin: 2, durationMs: 1000, winDurationMs: 3000, turns: 1 });
    // spin 1 is a near-miss: it lands after the (shorter) near-miss duration.
    c.start();
    c.update(1000);
    e3(c.status).toBe("nearmiss");
    // spin 2 is the win: at the near-miss duration it is still creeping, not landed.
    c.start();
    c.update(1000);
    e3(c.status).toBe("spinning");
    c.update(2000); // total 3000 >= winDurationMs
    e3(c.status).toBe("won");
  });

  i3("defaults winDurationMs to durationMs (backward compatible)", () => {
    const c = make({ winOnSpin: 1, durationMs: 500, turns: 1 });
    c.start();
    c.update(500);
    e3(c.status).toBe("won");
  });
});

d3("createSpinController — BOOM fires as soon as the wheel has effectively stopped", () => {
  i3("lands before the full duration once it has settled onto the target (no dead creep)", () => {
    const c = make({ winningIndex: 7, winOnSpin: 1, durationMs: 10000, turns: 7 });
    c.start();
    c.update(8500); // 85% in: easeOutQuint is already within a fraction of a degree of target
    e3(c.status).toBe("won");                 // BOOM now, not at the full 10000ms
    e3(c.rotation).toBeCloseTo(c.target, 5);  // snapped exactly onto the winning segment
  });

  i3("still spins while the wheel is visibly moving", () => {
    const c = make({ winningIndex: 7, winOnSpin: 1, durationMs: 10000, turns: 7 });
    c.start();
    c.update(5000); // halfway: still a long way (many degrees) from target
    e3(c.status).toBe("spinning");
  });
});
