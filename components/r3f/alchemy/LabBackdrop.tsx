import { Float } from "@react-three/drei";
import * as THREE from "three";

function Beaker({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 16, 1, true]} />
        <meshStandardMaterial color="#bfeede" metalness={0.1} roughness={0.1} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.22, 16]} />
        <meshStandardMaterial color="#5BE36A" emissive="#5BE36A" emissiveIntensity={1} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

export function LabBackdrop({ reduced }: { reduced: boolean }) {
  return (
    <group>
      {!reduced && (
        <>
          <Float speed={1.5} floatIntensity={0.6} rotationIntensity={0.3}><Beaker position={[-3.6, 1.2, -2]} scale={1.1} /></Float>
          <Float speed={1.2} floatIntensity={0.5} rotationIntensity={0.2}><Beaker position={[3.7, 1.6, -2.2]} scale={0.9} /></Float>
          <Float speed={1.8} floatIntensity={0.7} rotationIntensity={0.4}><Beaker position={[3.2, -1.4, -1.6]} scale={0.8} /></Float>
        </>
      )}
      <mesh position={[0, 0, -4]}>
        <planeGeometry args={[26, 16]} />
        <meshBasicMaterial color="#0a3a2c" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
