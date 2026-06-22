// components/r3f/slots/book-of-ra/TempleBackdrop.tsx
"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SlotStatus } from "../../kit/slotController";

export function TempleBackdrop({ status, reduced }: { status: SlotStatus; reduced: boolean }) {
  const torchL = useRef<THREE.PointLight>(null!);
  const torchR = useRef<THREE.PointLight>(null!);
  const pillars = [-4.6, -3.0, 3.0, 4.6];

  useFrame((s) => {
    if (reduced) return;
    const t = s.clock.elapsedTime;
    const flick = 0.7 + Math.sin(t * 9) * 0.15 + Math.sin(t * 23) * 0.08;
    if (torchL.current) torchL.current.intensity = 16 * flick;
    if (torchR.current) torchR.current.intensity = 16 * (1.45 - flick);
  });

  return (
    <group position={[0, 0, -3]}>
      <pointLight ref={torchL} position={[-3, 2.4, 1.5]} color="#FF8A2A" intensity={16} distance={16} />
      <pointLight ref={torchR} position={[3, 2.4, 1.5]} color="#FFB347" intensity={16} distance={16} />
      <mesh position={[0, 0, -1]}>
        <planeGeometry args={[30, 18]} />
        <meshStandardMaterial color="#3a2410" roughness={1} />
      </mesh>
      {pillars.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[1.2, 16, 1.2]} />
          <meshStandardMaterial color="#6b4a22" roughness={0.92} emissive="#2a1a08" emissiveIntensity={0.4} />
        </mesh>
      ))}
      {status === "won" && <pointLight position={[0, 0, 3]} color="#FFD24A" intensity={70} distance={22} />}
    </group>
  );
}
