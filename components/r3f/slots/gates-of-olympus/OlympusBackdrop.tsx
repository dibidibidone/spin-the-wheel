// components/r3f/slots/gates-of-olympus/OlympusBackdrop.tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SlotStatus } from "../../kit/slotController";

export function OlympusBackdrop({ status, reduced }: { status: SlotStatus; reduced: boolean }) {
  const bolt = useRef<THREE.PointLight>(null!);

  useFrame((s) => {
    if (reduced) return;
    const t = s.clock.elapsedTime;
    const strike = Math.sin(t * 0.7) > 0.985 ? 1 : 0; // occasional flash
    const base = status === "won" ? 50 : 10;
    if (bolt.current) bolt.current.intensity = base + strike * 120;
  });

  return (
    <group position={[0, 0, -4]}>
      <pointLight ref={bolt} position={[0, 4, 2]} color="#C9B6FF" intensity={10} distance={30} />
      <pointLight position={[-6, -2, 2]} color="#5b6bff" intensity={20} distance={22} />
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[44, 26]} />
        <meshStandardMaterial color="#1a1140" roughness={1} />
      </mesh>
      <mesh position={[0, 4.5, -1]}>
        <planeGeometry args={[34, 9]} />
        <meshStandardMaterial color="#2a1f5c" transparent opacity={0.5} />
      </mesh>
      <mesh position={[2, -4.5, -1]}>
        <planeGeometry args={[34, 9]} />
        <meshStandardMaterial color="#160f3a" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
