// Pure landing math for the wheel. "Clock degrees" = clockwise from the top (12 o'clock).
// Segment i (rest) is centered at clock angle i*seg + seg/2; the pointer sits at clock 0.

export function easeOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 3);
}

// Stronger deceleration for the wheel: it rushes early then creeps slowly onto the
// winning segment for a suspenseful final approach before the win.
export function easeOutQuint(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - Math.pow(1 - c, 5);
}

// landFraction = where across the target segment the pointer comes to rest, measured from
// the segment's lower edge (0 = lower edge, 0.5 = center, 1 = upper edge). The wheel
// decelerates from higher rest-angles, so a value near 1 means it creeps in across the upper
// edge and stops *barely* inside; a value near 0 means it stops *just short* of crossing the
// lower edge. Both still resolve to `winningIndex` under the pointer.
export function targetRotationDeg(winningIndex: number, segments = 8, turns = 6, landFraction = 0.5): number {
  const seg = 360 / segments;
  const land = winningIndex * seg + landFraction * seg; // rest clock angle of the landing point
  const base = (((-land) % 360) + 360) % 360; // clockwise rotation that brings it to the top
  return 360 * turns + base;
}

export function segmentUnderPointer(rotationDeg: number, segments = 8): number {
  const seg = 360 / segments;
  // The rest-angle currently sitting at the top is (-rotation) mod 360.
  const a = (((-rotationDeg) % 360) + 360) % 360;
  return (((Math.round((a - seg / 2) / seg) % segments) + segments) % segments);
}
