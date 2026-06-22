import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WheelTheme } from "./types";

function wedgeShape(startRad: number, endRad: number, radius: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(Math.cos(startRad) * radius, Math.sin(startRad) * radius);
  s.absarc(0, 0, radius, startRad, endRad, false);
  s.lineTo(0, 0);
  return s;
}

function makeLabelTexture(labels: string[], color: string): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2, r = size * 0.36, n = labels.length;
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  for (let i = 0; i < n; i++) {
    const clock = i * (360 / n) + 360 / n / 2;
    const a = (-(clock - 90) * Math.PI) / 180;
    const x = cx + Math.cos(a) * r;
    const y = cy - Math.sin(a) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-a + Math.PI / 2);
    ctx.strokeText(labels[i], 0, 0);
    ctx.fillText(labels[i], 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Wheel3D({ rotationRef, theme }: { rotationRef: MutableRefObject<number>; theme: WheelTheme }) {
  const group = useRef<THREE.Group>(null!);
  const n = theme.labels.length;
  const R = theme.radius;
  const labelTex = useMemo(() => makeLabelTexture(theme.labels, theme.labelColor), [theme.labels, theme.labelColor]);
  const goldSet = useMemo(() => new Set(theme.goldIndices), [theme.goldIndices]);

  const wedges = useMemo(
    () => Array.from({ length: n }, (_, i) => {
      const startDeg = 90 - (i + 1) * (360 / n);
      const endDeg = 90 - i * (360 / n);
      const shape = wedgeShape((startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180, R);
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2,
      });
      return { geom, color: theme.segmentColors[i], jackpot: i === theme.jackpotIndex, gold: goldSet.has(i) };
    }),
    [n, R, theme.segmentColors, theme.jackpotIndex, goldSet]
  );

  const bulbs = useMemo(
    () => Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      return [Math.cos(a) * (R + 0.12), Math.sin(a) * (R + 0.12), 0.42] as const;
    }),
    [R]
  );

  useFrame(() => {
    if (group.current) group.current.rotation.z = THREE.MathUtils.degToRad(-rotationRef.current);
  });

  return (
    <group>
      <mesh position={[0, R + 0.35, 0.5]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.16, 0.42, 4]} />
        <meshStandardMaterial color={theme.goldColor} metalness={1} roughness={0.25} emissive="#FFB020" emissiveIntensity={1.5} />
      </mesh>
      <group ref={group}>
        {wedges.map((w, i) => (
          <mesh key={i} geometry={w.geom} castShadow>
            <meshStandardMaterial
              color={w.gold ? theme.goldColor : w.color}
              metalness={w.jackpot ? 0.95 : w.gold ? 0.6 : 0.4}
              roughness={w.gold ? 0.28 : 0.3}
              emissive={w.jackpot ? "#E2483D" : w.gold ? "#8a6200" : "#08221c"}
              emissiveIntensity={w.jackpot ? 1.4 : w.gold ? 1.15 : 0.6}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.41]}>
          <circleGeometry args={[R, 64]} />
          <meshBasicMaterial map={labelTex} transparent />
        </mesh>
        <mesh position={[0, 0, 0.18]}>
          <torusGeometry args={[R + 0.12, 0.16, 16, 96]} />
          <meshStandardMaterial color={theme.rimColor} metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={0.8} />
        </mesh>
        {bulbs.map((p, i) => (
          <mesh key={i} position={[p[0], p[1], p[2]]}>
            <sphereGeometry args={[0.075, 12, 12]} />
            <meshStandardMaterial color="#FFF6D8" emissive={theme.bulbColor} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 48]} />
          <meshStandardMaterial color={theme.goldColor} metalness={1} roughness={0.2} emissive="#5a3d00" emissiveIntensity={1} />
        </mesh>
      </group>
    </group>
  );
}
