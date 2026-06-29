"use client";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { Wheel3D } from "../kit/Wheel3D";
import { Effects } from "../kit/Effects";
import { SpinDriver, Parallax, useSpinScene } from "../kit/spinScene";
import { SpinOverlay } from "../kit/SpinOverlay";
import { createSound } from "../kit/sound";
import { useReducedMotion } from "../kit/useReducedMotion";
import { NeonSign } from "./NeonSign";
import { VaultAtmosphere } from "./VaultAtmosphere";
import { ResponsiveCamera } from "../kit/ResponsiveCamera";
import { jackpotWheel, jackpotSound, jackpotCopy, jackpotOverlayVars, jackpotConversion } from "./theme";
import { isWebGLAvailable } from "../kit/webgl";
import { SceneFallback } from "../kit/SceneFallback";
import shell from "../kit/sceneShell.module.css";
import type { LandingSceneConfig } from "../kit/sceneConfig";
import { usePwaInstall } from "../kit/usePwaInstall";
import { IosInstallHint } from "../kit/IosInstallHint";

function WheelRig({ rotationRef, reduced, segments, winningIndex }: {
  rotationRef: React.MutableRefObject<number>; reduced: boolean;
  segments: { label: string; color: string }[]; winningIndex: number;
}) {
  const wheel = <Wheel3D rotationRef={rotationRef} theme={jackpotWheel} segments={segments} winningIndex={winningIndex} />;
  return reduced ? <>{wheel}</> : <Float speed={2} rotationIntensity={0.15} floatIntensity={0.4}>{wheel}</Float>;
}

export function JackpotVaultScene({ config }: { config?: LandingSceneConfig } = {}) {
  const reduced = useReducedMotion();
  const sound = useMemo(() => createSound(jackpotSound), []);
  const conversion = config?.conversion ?? jackpotConversion;
  const copy = config?.copy ? { ...jackpotCopy, ...config.copy } : jackpotCopy;
  // Memoize: a new array identity here makes Wheel3D rebuild its 1024² label texture + all
  // extruded wedge geometry on every re-render — which, on the win re-render, froze the BOOM.
  const segments = useMemo(
    () => config?.segments ?? jackpotWheel.labels.map((label, i) => ({ label, color: jackpotWheel.segmentColors[i] })),
    [config?.segments]
  );
  const winningIndex = config?.winningIndex ?? jackpotWheel.jackpotIndex;
  const pwa = usePwaInstall();
  const prompted = useRef(false);
  const handleSpinStart = config ? () => { if (!prompted.current) { prompted.current = true; pwa.promptInstall(); } } : undefined;

  const { rotationRef, status, muted, claimStep, controller, spinsLeft, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss } =
    useSpinScene({
      reduced, sound, conversion,
      winningIndex,
      winOnSpin: config?.spinsBeforeWin ?? 1,
      segmentCount: segments.length,
      navigate: config ? pwa.openApp : undefined,
      onSpinStart: handleSpinStart,
    });

  const [webgl, setWebgl] = useState(true);
  useEffect(() => { setWebgl(isWebGLAvailable()); }, []);
  useEffect(() => {
    const onVis = () => sound.setMuted(document.hidden ? true : muted);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sound, muted]);

  if (!webgl) return <SceneFallback copy={copy} vars={jackpotOverlayVars} config={conversion} />;

  return (
    <div className={`${shell.shell}${status === "nearmiss" ? " shake" : status === "won" ? " boom" : ""}`} style={{ "--base": "#070D0B", "--glow": "#F5C24B", "--glow2": "#5BE36A" } as CSSProperties}>
      <div className={shell.bg} />
      <div className={shell.rays} />
      <div className={shell.vignette} />
      {(config?.atmosphere ?? "normal") !== "off" && <VaultAtmosphere status={status} reduced={reduced} intensity={config?.atmosphere ?? "normal"} />}
      <Canvas className={shell.canvas} camera={{ position: [0, 0.2, 7], fov: 42 }} dpr={[1, 2]} gl={{ alpha: true, antialias: false }}>
        <ResponsiveCamera radius={jackpotWheel.radius} />
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
          <WheelRig rotationRef={rotationRef} reduced={reduced} segments={segments} winningIndex={winningIndex} />
          {!reduced && <Sparkles count={60} scale={[10, 8, 4]} size={3} speed={0.3} color="#FFD56A" />}
        </Parallax>

        <PerformanceMonitor />
        <AdaptiveDpr pixelated={false} />
        <Effects chromatic={typeof window !== "undefined" && window.innerWidth >= 700} />
      </Canvas>

      <SpinOverlay
        copy={copy} vars={jackpotOverlayVars} config={conversion} logoSrc={config?.logoSrc ?? undefined}
        status={status} claimStep={claimStep} muted={muted} reduced={reduced} spinsLeft={spinsLeft}
        onSpin={onSpin} onToggleSound={onToggleSound}
        onClaimOpen={onClaimOpen} onClaimSubmit={onClaimSubmit} onDismiss={onDismiss}
      />
      <IosInstallHint open={pwa.iosHintOpen} appName={config?.pwa.name ?? ""} iconUrl={config?.pwa.iconUrl ?? null} onClose={pwa.dismissIosHint} />
    </div>
  );
}
