// components/r3f/slots/gates-of-olympus/GatesScene.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { SlotReels } from "../../kit/SlotReels";
import { SpinOverlay } from "../../kit/SpinOverlay";
import { Effects } from "../../kit/Effects";
import { createSound } from "../../kit/sound";
import { useReducedMotion } from "../../kit/useReducedMotion";
import { useSlotScene } from "../../kit/useSlotScene";
import { isWebGLAvailable } from "../../kit/webgl";
import { OlympusBackdrop } from "./OlympusBackdrop";
import { gatesTheme, gatesSound, gatesCopy, gatesOverlayVars, gatesConversion } from "./theme";
import type { LandingSceneConfig } from "../../kit/sceneConfig";
import { usePwaInstall } from "../../kit/usePwaInstall";
import { IosInstallHint } from "../../kit/IosInstallHint";

export function GatesScene({ config }: { config?: LandingSceneConfig } = {}) {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(gatesSound), []);
  const conversion = config?.conversion ?? gatesConversion;
  const copy = config?.copy ? { ...gatesCopy, ...config.copy } : gatesCopy;
  const theme = config?.spinsBeforeWin != null ? { ...gatesTheme, winOnSpin: config.spinsBeforeWin } : gatesTheme;
  const pwa = usePwaInstall();
  const prompted = useRef(false);
  const handleSpinStart = config ? () => { if (!prompted.current) { prompted.current = true; pwa.promptInstall(); } } : undefined;

  const scene = useSlotScene({
    reduced, sound, theme, conversion,
    navigate: config ? pwa.openApp : undefined,
    onSpinStart: handleSpinStart,
  });
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
      copy={copy} vars={gatesOverlayVars} config={conversion} logoSrc={config?.logoSrc ?? undefined}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={theme} controller={controller} status={status} onStatus={onStatus} />;

  if (!webgl) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #2a1f5c 0%, #120c2e 70%)" }}>
        {reels}
        {overlay}
        <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
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
        {!reduced && <Sparkles count={60} scale={[14, 9, 4]} size={3} speed={0.3} color="#C9B6FF" />}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>
      {reels}
      {overlay}
      <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
    </div>
  );
}
