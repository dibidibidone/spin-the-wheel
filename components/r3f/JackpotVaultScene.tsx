"use client";
import { Canvas } from "@react-three/fiber";

export function JackpotVaultScene() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#070D0B" }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[4, 5, 6]} intensity={60} color="#FFD56A" />
        <mesh rotation={[0.5, 0.4, 0]}>
          <icosahedronGeometry args={[1.6, 0]} />
          <meshStandardMaterial color="#F5C24B" metalness={0.9} roughness={0.2} emissive="#1c1400" />
        </mesh>
      </Canvas>
    </div>
  );
}
