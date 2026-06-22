"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { Wheel3D } from "./Wheel3D";
import { NeonSign } from "./NeonSign";
import { Effects } from "./Effects";
import { JackpotVaultOverlay } from "./JackpotVaultOverlay";
import { useReducedMotion } from "./useReducedMotion";
import { createSpinController, type SpinStatus } from "./spinController";
import { getSound } from "./sound";
import { CoinStorm } from "./CoinStorm";

function SpinDriver({ controller, rotationRef, onStatus }: {
  controller: ReturnType<typeof createSpinController>;
  rotationRef: React.MutableRefObject<number>;
  onStatus: (s: SpinStatus) => void;
}) {
  const prev = useRef<SpinStatus>("idle");
  useFrame((_, dt) => {
    controller.update(dt * 1000);
    rotationRef.current = controller.rotation;
    if (controller.status !== prev.current) {
      prev.current = controller.status;
      onStatus(controller.status);
    }
  });
  return null;
}

function Parallax({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const tilt = useRef({ x: 0, y: 0 });
  const { pointer } = useThree();
  useEffect(() => {
    if (reduced) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      tilt.current.x = THREE.MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1); // left/right
      tilt.current.y = THREE.MathUtils.clamp(((e.beta ?? 0) - 45) / 45, -1, 1); // front/back
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [reduced]);
  useFrame(() => {
    if (!g.current || reduced) return;
    const px = pointer.x + tilt.current.x;
    const py = pointer.y - tilt.current.y;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, px * 0.25, 0.05);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -py * 0.18, 0.05);
  });
  return <group ref={g}>{children}</group>;
}

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>;
}

export function JackpotVaultScene() {
  const reduced = useReducedMotion();
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // On win, let the coin storm play for a beat before the modal fades in (instant under reduced motion).
  useEffect(() => {
    if (status !== "won") { setModalOpen(false); return; }
    const t = setTimeout(() => setModalOpen(true), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);
  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );

  const onSpin = () => {
    if (controller.status !== "idle") return;
    controller.start();
    setStatus("spinning");
    getSound().tick();
  };
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") getSound().win();
  };
  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    getSound().setMuted(next);
  };
  const onClaim = () => { /* demo: no real redirect */ };

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

        <SpinDriver controller={controller} rotationRef={rotationRef} onStatus={onStatus} />
        <Parallax reduced={reduced}>
          <NeonSign />
          <WheelRig rotationRef={rotationRef} reduced={reduced} />
          {status === "won" && (
            <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 60 : 120)} />
          )}
          {!reduced && <Sparkles count={60} scale={[10, 8, 4]} size={3} speed={0.3} color="#FFD56A" />}
        </Parallax>

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>

      <JackpotVaultOverlay
        status={status} muted={muted} modalOpen={modalOpen}
        onSpin={onSpin} onToggleSound={onToggleSound} onClaim={onClaim}
      />
    </div>
  );
}
