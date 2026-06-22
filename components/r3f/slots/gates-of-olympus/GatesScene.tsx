// components/r3f/slots/gates-of-olympus/GatesScene.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { SlotReels } from "../../kit/SlotReels";
import { SpinOverlay } from "../../kit/SpinOverlay";
import { Effects } from "../../kit/Effects";
import { CoinStorm } from "../../kit/CoinStorm";
import { createSound } from "../../kit/sound";
import { useReducedMotion } from "../../kit/useReducedMotion";
import { useSlotScene } from "../../kit/useSlotScene";
import { isWebGLAvailable } from "../../kit/webgl";
import { OlympusBackdrop } from "./OlympusBackdrop";
import { gatesTheme, gatesSound, gatesCopy, gatesOverlayVars, gatesConversion } from "./theme";

export function GatesScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(gatesSound), []);
  const scene = useSlotScene({ reduced, sound, theme: gatesTheme, conversion: gatesConversion });
  const { status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } = scene;

  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(isWebGLAvailable()); }, []);
  useEffect(() => {
    const onVis = () => sound.setMuted(document.hidden ? true : muted);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sound, muted]);

  const overlay = (
    <SpinOverlay
      copy={gatesCopy} vars={gatesOverlayVars} config={gatesConversion}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={gatesTheme} controller={controller} status={status} onStatus={onStatus} />;

  if (!webgl) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #2a1f5c 0%, #120c2e 70%)" }}>
        {reels}
        {overlay}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#120c2e" }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 44 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#120c2e"]} />
        <fog attach="fog" args={["#120c2e", 8, 32]} />
        <ambientLight intensity={0.45} />
        <OlympusBackdrop status={status} reduced={reduced} />
        {status === "won" && <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 55 : 90)} color="#FFD56A" />}
        {!reduced && <Sparkles count={60} scale={[14, 9, 4]} size={3} speed={0.3} color="#C9B6FF" />}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>
      {reels}
      {overlay}
    </div>
  );
}
