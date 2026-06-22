"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Wheel3D } from "./Wheel3D";
import { NeonSign } from "./NeonSign";
import { Effects } from "./Effects";
import { useReducedMotion } from "./useReducedMotion";
import { createSpinController } from "./spinController";

function SpinDriver({ controller, rotationRef }: {
  controller: ReturnType<typeof createSpinController>;
  rotationRef: React.MutableRefObject<number>;
}) {
  useFrame((_, dt) => {
    controller.update(dt * 1000);
    rotationRef.current = controller.rotation;
  });
  return null;
}

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} />;
  return reduced ? <group>{wheel}</group> : (
    <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>
  );
}

export function JackpotVaultScene() {
  const reduced = useReducedMotion();
  const rotationRef = useRef(0);
  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );

  // TEMPORARY: auto-spin for the visual checkpoint (removed in Task 4).
  useEffect(() => {
    const t = setTimeout(() => controller.start(), 1500);
    return () => clearTimeout(t);
  }, [controller]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#070D0B" }}>
      <Canvas camera={{ position: [0, 0.2, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#070D0B"]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 6, 6]} intensity={120} color="#FFD56A" />
        <pointLight position={[-6, -3, 4]} intensity={50} color="#5BE36A" />

        <Environment resolution={256}>
          <Lightformer form="rect" intensity={3} color="#FFD56A" position={[5, 5, 4]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={2} color="#5BE36A" position={[-6, 0, 3]} scale={[5, 5, 1]} />
          <Lightformer form="circle" intensity={2} color="#ffffff" position={[0, -4, 4]} scale={[4, 4, 1]} />
        </Environment>

        <NeonSign />
        <SpinDriver controller={controller} rotationRef={rotationRef} />
        <WheelRig rotationRef={rotationRef} reduced={reduced} />
        {!reduced && <Sparkles count={60} scale={[10, 8, 4]} size={3} speed={0.3} color="#FFD56A" />}

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects />
      </Canvas>
    </div>
  );
}
