import { describe, it, expect } from "vitest";
import { createSpinController } from "./spinController";
import { targetRotationDeg } from "./spinMath";

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
    expect(c.rotation).toBeCloseTo(targetRotationDeg(7, 8, 6), 5);
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
