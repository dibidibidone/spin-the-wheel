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
import { ResponsiveCamera } from "../kit/ResponsiveCamera";
import { alchemyWheel, alchemySound, alchemyCopy, alchemyOverlayVars, alchemyConversion } from "./theme";
import { Cauldron } from "./Cauldron";
import { PotionBottle } from "./PotionBottle";
import { LabBackdrop } from "./LabBackdrop";

function WheelRig({ rotationRef, reduced }: { rotationRef: React.MutableRefObject<number>; reduced: boolean }) {
  const wheel = <Wheel3D rotationRef={rotationRef} theme={alchemyWheel} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.12} floatIntensity={0.3}>{wheel}</Float>;
}

export function AlchemyLabScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(alchemySound), []);
  const { rotationRef, status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } =
    useSpinScene({ reduced, sound, conversion: alchemyConversion });
  const won = status === "won";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0A1A14" }}>
      <Canvas camera={{ position: [0, 0.1, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#0A1A14"]} />
        <ResponsiveCamera radius={alchemyWheel.radius} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 6, 6]} intensity={90} color="#EAF6EE" />
        <pointLight position={[-6, -2, 4]} intensity={60} color="#5BE36A" />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.5} color="#8BFF5A" position={[4, 5, 4]} scale={[6, 6, 1]} />
          <Lightformer form="rect" intensity={2} color="#F5C24B" position={[-6, 0, 3]} scale={[5, 5, 1]} />
          <Lightformer form="circle" intensity={2} color="#ffffff" position={[0, -4, 4]} scale={[4, 4, 1]} />
        </Environment>

        <SpinDriver controller={controller} rotationRef={rotationRef} onStatus={onStatus} />
        <Parallax reduced={reduced}>
          <LabBackdrop reduced={reduced} />
          <PotionBottle position={[-2.9, -0.6, 0.6]} phase={0} />
          <PotionBottle position={[2.9, -0.6, 0.6]} phase={1.5} />
          <WheelRig rotationRef={rotationRef} reduced={reduced} />
          <Cauldron erupting={won} />
          {won && (
            <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 60 : 120)} />
          )}
          {!reduced && <Sparkles count={60} scale={[11, 8, 5]} size={2.6} speed={0.25} color="#8BFF5A" />}
        </Parallax>

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>

      <SpinOverlay
        copy={alchemyCopy} vars={alchemyOverlayVars} config={alchemyConversion}
        status={status} claimStep={claimStep} muted={muted} reduced={reduced}
        onSpin={onSpin} onToggleSound={onToggleSound}
        onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
    </div>
  );
}
