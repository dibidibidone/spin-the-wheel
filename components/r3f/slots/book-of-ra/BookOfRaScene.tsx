// components/r3f/slots/book-of-ra/BookOfRaScene.tsx
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
import { TempleBackdrop } from "./TempleBackdrop";
import { TempleAtmosphere } from "./TempleAtmosphere";
import {
  bookOfRaTheme, bookOfRaSound, bookOfRaCopy, bookOfRaOverlayVars, bookOfRaConversion,
} from "./theme";
import type { LandingSceneConfig } from "../../kit/sceneConfig";
import { usePwaInstall } from "../../kit/usePwaInstall";
import { IosInstallHint } from "../../kit/IosInstallHint";

export function BookOfRaScene({ config }: { config?: LandingSceneConfig } = {}) {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(bookOfRaSound), []);
  const conversion = config?.conversion ?? bookOfRaConversion;
  const copy = config?.copy ? { ...bookOfRaCopy, ...config.copy } : bookOfRaCopy;
  const theme = config?.spinsBeforeWin != null ? { ...bookOfRaTheme, winOnSpin: config.spinsBeforeWin } : bookOfRaTheme;
  const pwa = usePwaInstall();
  const prompted = useRef(false);
  const handleSpinStart = config ? () => { if (!prompted.current) { prompted.current = true; pwa.promptInstall(); } } : undefined;

  const scene = useSlotScene({
    reduced, sound, theme, conversion,
    navigate: config ? pwa.openApp : undefined,
    onSpinStart: handleSpinStart,
  });
  const { status, muted, claimStep, controller, spinsLeft, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } = scene;

  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(isWebGLAvailable()); }, []);
  useEffect(() => {
    const onVis = () => sound.setMuted(document.hidden ? true : muted);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sound, muted]);

  const overlay = (
    <SpinOverlay
      copy={copy} vars={bookOfRaOverlayVars} config={conversion} logoSrc={config?.logoSrc ?? undefined}
      status={status} claimStep={claimStep} muted={muted} reduced={reduced} spinsLeft={spinsLeft}
      onSpin={onSpin} onToggleSound={onToggleSound}
      onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
    />
  );
  const reels = <SlotReels theme={theme} controller={controller} status={status} onStatus={onStatus} />;

  if (!webgl) {
    return (
      <div className={status === "nearmiss" ? "shake" : status === "won" ? "boom" : undefined} style={{ position: "fixed", inset: 0, background: "radial-gradient(120% 90% at 50% 0%, #4a2f10 0%, #1a0f04 70%)" }}>
        {reels}
        {overlay}
        <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
      </div>
    );
  }

  return (
    <div className={status === "nearmiss" ? "shake" : status === "won" ? "boom" : undefined} style={{ position: "fixed", inset: 0, background: "#1a0f04" }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: false }}>
        <color attach="background" args={["#1a0f04"]} />
        <fog attach="fog" args={["#1a0f04", 6, 28]} />
        <ambientLight intensity={0.4} />
        <TempleBackdrop status={status} reduced={reduced} />
        {!reduced && <Sparkles count={50} scale={[12, 8, 4]} size={3} speed={0.25} color="#FFCF6A" />}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={false} />
      </Canvas>
      <TempleAtmosphere status={status} reduced={reduced} />
      {reels}
      {overlay}
      <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
    </div>
  );
}
