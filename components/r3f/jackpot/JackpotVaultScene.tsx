"use client";
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Wheel3D } from "../kit/Wheel3D";
import { Effects } from "../kit/Effects";
import { CoinStorm } from "../kit/CoinStorm";
import { SpinDriver, Parallax, useSpinScene } from "../kit/spinScene";
import { SpinOverlay } from "../kit/SpinOverlay";
import { createSound } from "../kit/sound";
import { useReducedMotion } from "../kit/useReducedMotion";
import { NeonSign } from "./NeonSign";
import { jackpotWheel, jackpotSound, jackpotCopy, jackpotOverlayVars } from "./theme";

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} theme={jackpotWheel} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>;
}

export function JackpotVaultScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(jackpotSound), []);
  const { rotationRef, status, muted, modalOpen, controller, onSpin, onStatus, onToggleSound } = useSpinScene({ reduced, sound });

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

      <SpinOverlay
        copy={jackpotCopy} vars={jackpotOverlayVars}
        status={status} modalOpen={modalOpen} muted={muted}
        onSpin={onSpin} onToggleSound={onToggleSound} onClaim={() => {}}
      />
    </div>
  );
}
