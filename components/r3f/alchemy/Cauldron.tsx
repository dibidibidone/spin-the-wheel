import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Bubbles({ count, radius, rise, color }: { count: number; radius: number; rise: number; color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(
    () => Array.from({ length: count }, () => ({
      a: Math.random() * Math.PI * 2, r: Math.random() * radius, y: Math.random() * rise,
      speed: 0.4 + Math.random() * 0.7, s: 0.03 + Math.random() * 0.06,
    })),
    [count, radius, rise]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Pass a concrete geometry + material to args (TS-safe; avoids `undefined` args).
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 1.4, transparent: true, opacity: 0.8,
    });
    m.toneMapped = false;
    return m;
  }, [color]);
  useFrame((_, dt) => {
    if (!mesh.current) return;
    for (let i = 0; i < data.length; i++) {
      const b = data[i];
      b.y += b.speed * dt;
      if (b.y > rise) { b.y = 0; b.a = Math.random() * Math.PI * 2; b.r = Math.random() * radius; }
      const fade = 1 - b.y / rise;
      dummy.position.set(Math.cos(b.a) * b.r, b.y, Math.sin(b.a) * b.r);
      dummy.scale.setScalar(b.s * (0.4 + fade));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, count]} />;
}

export function Cauldron({ erupting = false }: { erupting?: boolean }) {
  const liquid = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!liquid.current) return;
    const m = liquid.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 1.1 + Math.sin(state.clock.elapsedTime * 4) * 0.25 + (erupting ? 1.4 : 0);
  });
  return (
    <group position={[0, -2.4, 0]}>
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[1.25, 0.95, 0.9, 32, 1, true]} />
        <meshStandardMaterial color="#0d2a22" metalness={0.7} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <sphereGeometry args={[0.95, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color="#0d2a22" metalness={0.7} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.1, 12, 40]} />
        <meshStandardMaterial color="#1b6f5c" metalness={0.9} roughness={0.3} emissive="#0a3a2c" emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={liquid} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.15, 40]} />
        <meshStandardMaterial color="#1f7a3a" emissive="#5BE36A" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} intensity={erupting ? 80 : 24} distance={7} color="#5BE36A" />
      <group position={[0, 0.25, 0]}>
        <Bubbles count={erupting ? 90 : 42} radius={1.0} rise={erupting ? 3.4 : 1.7} color="#8BFF5A" />
      </group>
    </group>
  );
}
