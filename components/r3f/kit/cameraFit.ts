// Distance at which a sphere/disc of `radius` fits the *narrow* viewport axis,
// given a vertical perspective FOV. On portrait (aspect < 1) the horizontal axis
// is the limiter, so the camera is pushed further back.
export function fitCameraDistance(opts: {
  radius: number;
  aspect: number;
  fovDeg: number;
  margin?: number;
}): number {
  const { radius, aspect, fovDeg, margin = 1.15 } = opts;
  const halfFov = (fovDeg * Math.PI) / 180 / 2;
  const t = Math.tan(halfFov);
  const narrow = Math.min(aspect, 1); // <1 on portrait
  return (radius * margin) / (t * narrow);
}
