// components/r3f/slots/book-of-ra/BookOfRaScene.tsx
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
import { TempleBackdrop } from "./TempleBackdrop";
import {
  bookOfRaTheme, bookOfRaSound, bookOfRaCopy, bookOfRaOverlayVars, bookOfRaConversion,
} from "./theme";

export function BookOfRaScene() {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(bookOfRaSound), []);
  const scene = useSlotScene({ reduced, sound, theme: bookOfRaTheme, conversion: bookOfRaConversion });
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
      copy={bookOfRaCopy} vars={bookOfRaOverlayVars} config={bookOfRaConversion}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={bookOfRaTheme} controller={controller} status={status} onStatus={onStatus} />;

  if (!webgl) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #4a2f10 0%, #1a0f04 70%)" }}>
        {reels}
        {overlay}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1a0f04" }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#1a0f04"]} />
        <fog attach="fog" args={["#1a0f04", 6, 28]} />
        <ambientLight intensity={0.4} />
        <TempleBackdrop status={status} reduced={reduced} />
        {status === "won" && <CoinStorm count={reduced ? 30 : (typeof window !== "undefined" && window.innerWidth < 700 ? 55 : 90)} color="#FFD24A" />}
        {!reduced && <Sparkles count={50} scale={[12, 8, 4]} size={3} speed={0.25} color="#FFCF6A" />}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={false} />
      </Canvas>
      {reels}
      {overlay}
    </div>
  );
}
