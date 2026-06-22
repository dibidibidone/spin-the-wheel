import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function PotionBottle({ position, color = "#8BFF5A", phase = 0 }: {
  position: [number, number, number]; color?: string; phase?: number;
}) {
  const g = useRef<THREE.Group>(null!);
  useFrame((s) => {
    if (g.current) g.current.rotation.z = Math.sin(s.clock.elapsedTime * 1.2 + phase) * 0.08;
  });
  return (
    <group ref={g} position={position}>
      <mesh>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color="#bfeede" metalness={0.1} roughness={0.1} transparent opacity={0.35} />
      </mesh>
      <mesh scale={[0.92, 0.7, 0.92]} position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.42, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.4, 16]} />
        <meshStandardMaterial color="#bfeede" metalness={0.1} roughness={0.1} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.12, 12]} />
        <meshStandardMaterial color="#7a5230" roughness={0.8} />
      </mesh>
      <pointLight position={[0, 0, 0.3]} intensity={10} distance={2.6} color={color} />
    </group>
  );
}
