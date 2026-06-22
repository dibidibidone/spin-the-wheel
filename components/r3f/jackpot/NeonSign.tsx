import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// A soft beam texture: bright at the hub end, fading to the tip, with soft side edges —
// so each ray reads as a glowing light beam rather than a flat rectangle.
function makeBeamTexture(): THREE.CanvasTexture {
  const w = 64, h = 256;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const v = ctx.createLinearGradient(0, h, 0, 0); // bottom (hub) -> top (tip)
  v.addColorStop(0, "rgba(255,255,255,1)");
  v.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-in"; // soft left/right falloff
  const hMask = ctx.createLinearGradient(0, 0, w, 0);
  hMask.addColorStop(0, "rgba(0,0,0,0)");
  hMask.addColorStop(0.5, "rgba(0,0,0,1)");
  hMask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = hMask;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function NeonSign() {
  const rays = useRef<THREE.Group>(null!);

  const beamTex = useMemo(() => makeBeamTexture(), []);
  // Plane translated so its base sits at the hub (origin) and it extends outward along +Y.
  const rayGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.5, 3.8);
    g.translate(0, 1.9, 0);
    return g;
  }, []);
  const rayMat = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: beamTex, color: "#FFD56A", transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
    [beamTex]
  );
  useEffect(() => () => { beamTex.dispose(); rayGeom.dispose(); rayMat.dispose(); }, [beamTex, rayGeom, rayMat]);

  useFrame((_, dt) => {
    if (rays.current) rays.current.rotation.z += dt * 0.1;
  });

  const N = 18;
  return (
    <group position={[0, 0, -2]}>
      {/* rotating gold light-rays (radial sunburst behind the wheel) */}
      <group ref={rays}>
        {Array.from({ length: N }, (_, i) => {
          const a = (i / N) * Math.PI * 2;
          return <mesh key={i} geometry={rayGeom} material={rayMat} rotation={[0, 0, a - Math.PI / 2]} />;
        })}
      </group>
      {/* 777 emissive bar */}
      <mesh position={[0, 3.0, 0.2]}>
        <boxGeometry args={[2.0, 0.7, 0.2]} />
        <meshStandardMaterial color="#E2483D" emissive="#E2483D" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}
