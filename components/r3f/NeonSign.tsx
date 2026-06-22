import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function NeonSign() {
  const rays = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    if (rays.current) rays.current.rotation.z += dt * 0.15;
  });
  return (
    <group position={[0, 0, -2]}>
      {/* rotating gold sunburst */}
      <group ref={rays}>
        {Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0]} rotation={[0, 0, a]}>
              <planeGeometry args={[0.18, 3.4]} />
              <meshBasicMaterial color="#F5C24B" transparent opacity={0.22} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
          );
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
