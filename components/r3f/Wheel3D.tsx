import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LABELS = ["€5", "50 FS", "€10", "100 FS", "€20", "200 FS", "50% Bonus", "JACKPOT"];
const SEG_COLORS = ["#15564A", "#F5C24B", "#15564A", "#F5C24B", "#15564A", "#F5C24B", "#15564A", "#E2483D"];
const SEGMENTS = 8;
const RADIUS = 2.1;

function wedgeShape(startRad: number, endRad: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(Math.cos(startRad) * radius, Math.sin(startRad) * radius);
  s.absarc(0, 0, radius, startRad, endRad, false);
  s.lineTo(0, 0);
  return s;
}

function useLabelTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, r = size * 0.36;
    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.fillStyle = "#F4F1E8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    for (let i = 0; i < SEGMENTS; i++) {
      const clock = i * (360 / SEGMENTS) + 360 / SEGMENTS / 2; // clockwise from top
      const a = (-(clock - 90) * Math.PI) / 180; // canvas: 0=+x, y down; top=-90
      const x = cx + Math.cos(a) * r;
      const y = cy - Math.sin(a) * r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-a + Math.PI / 2); // tangential, readable
      ctx.strokeText(LABELS[i], 0, 0);
      ctx.fillText(LABELS[i], 0, 0);
      ctx.restore();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function Wheel3D({ rotationRef }: { rotationRef: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null!);
  const seg = (2 * Math.PI) / SEGMENTS;
  const labelTex = useLabelTexture();

  const wedges = useMemo(
    () =>
      Array.from({ length: SEGMENTS }, (_, i) => {
        // Map clock segment i [i*45 .. i*45+45] (cw from top) to math radians (ccw from +x).
        const startDeg = 90 - (i + 1) * (360 / SEGMENTS);
        const endDeg = 90 - i * (360 / SEGMENTS);
        const shape = wedgeShape((startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180, RADIUS);
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
        });
        return { geom, color: SEG_COLORS[i], jackpot: i === 7, gold: i === 1 || i === 3 || i === 5 };
      }),
    [seg]
  );

  const bulbs = useMemo(
    () => Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return [Math.cos(a) * (RADIUS + 0.12), Math.sin(a) * (RADIUS + 0.12), 0.42] as const;
    }),
    []
  );

  useFrame(() => {
    if (group.current) group.current.rotation.z = THREE.MathUtils.degToRad(-rotationRef.current);
  });

  return (
    <group>
      {/* pointer (fixed, not spinning) */}
      <mesh position={[0, RADIUS + 0.35, 0.5]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.16, 0.42, 4]} />
        <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.25} emissive="#FFB020" emissiveIntensity={1.5} />
      </mesh>

      <group ref={group}>
        {wedges.map((w, i) => (
          <mesh key={i} geometry={w.geom} castShadow>
            <meshStandardMaterial
              color={w.gold ? "#FFD24A" : w.color}
              metalness={w.jackpot ? 0.95 : w.gold ? 0.6 : 0.4}
              roughness={w.gold ? 0.28 : 0.3}
              emissive={w.jackpot ? "#E2483D" : w.gold ? "#8a6200" : "#08221c"}
              emissiveIntensity={w.jackpot ? 1.4 : w.gold ? 1.15 : 0.6}
            />
          </mesh>
        ))}

        {/* labels disc */}
        <mesh position={[0, 0, 0.41]}>
          <circleGeometry args={[RADIUS, 64]} />
          <meshBasicMaterial map={labelTex} transparent />
        </mesh>

        {/* gold rim */}
        <mesh position={[0, 0, 0.18]}>
          <torusGeometry args={[RADIUS + 0.12, 0.16, 16, 96]} />
          <meshStandardMaterial color="#F5C24B" metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={0.8} />
        </mesh>

        {/* bulbs */}
        {bulbs.map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color="#FFF6D8" emissive="#FFD56A" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}

        {/* hub */}
        <mesh position={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 48]} />
          <meshStandardMaterial color="#FFD56A" metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
