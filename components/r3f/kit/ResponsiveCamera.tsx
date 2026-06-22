import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { fitCameraDistance } from "./cameraFit";

export function ResponsiveCamera({ radius, portraitBias = 0.35 }: { radius: number; portraitBias?: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useEffect(() => {
    const aspect = width / height;
    camera.position.z = fitCameraDistance({ radius, aspect, fovDeg: camera.fov });
    const portrait = aspect < 1;
    camera.position.y = portrait ? portraitBias * radius : 0;
    camera.lookAt(0, camera.position.y * 0.4, 0);
  }, [camera, width, height, radius, portraitBias]);

  return null;
}
