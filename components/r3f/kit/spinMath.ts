// Pure landing math for the wheel. "Clock degrees" = clockwise from the top (12 o'clock).
// Segment i (rest) is centered at clock angle i*seg + seg/2; the pointer sits at clock 0.

export function easeOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 3);
}

export function targetRotationDeg(winningIndex: number, segments = 8, turns = 6): number {
  const seg = 360 / segments;
  const center = winningIndex * seg + seg / 2; // rest clock angle of the segment center
  const base = (((-center) % 360) + 360) % 360; // clockwise rotation that brings it to the top
  return 360 * turns + base;
}

export function segmentUnderPointer(rotationDeg: number, segments = 8): number {
  const seg = 360 / segments;
  // The rest-angle currently sitting at the top is (-rotation) mod 360.
  const a = (((-rotationDeg) % 360) + 360) % 360;
  return (((Math.round((a - seg / 2) / seg) % segments) + segments) % segments);
}
