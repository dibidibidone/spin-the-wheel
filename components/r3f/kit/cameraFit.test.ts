import { describe, it, expect } from "vitest";
import { fitCameraDistance } from "./cameraFit";

describe("fitCameraDistance", () => {
  const fovDeg = 42;
  const radius = 2.1;

  it("frames the wheel within the vertical extent for a square viewport", () => {
    const d = fitCameraDistance({ radius, aspect: 1, fovDeg, margin: 1 });
    const halfV = d * Math.tan((fovDeg * Math.PI) / 180 / 2);
    expect(halfV).toBeCloseTo(radius, 5); // margin 1 → exact fit
  });

  it("pushes the camera further back on portrait so width still fits", () => {
    const square = fitCameraDistance({ radius, aspect: 1, fovDeg });
    const portrait = fitCameraDistance({ radius, aspect: 0.5, fovDeg });
    expect(portrait).toBeCloseTo(square * 2, 5); // half the width → twice the distance
  });

  it("never frames tighter than the narrow axis (margin leaves breathing room)", () => {
    const d = fitCameraDistance({ radius, aspect: 0.46, fovDeg, margin: 1.15 });
    const halfH = d * Math.tan((fovDeg * Math.PI) / 180 / 2) * 0.46;
    expect(halfH).toBeGreaterThan(radius); // wheel fits horizontally with room to spare
  });
});
