import { useEffect, useMemo, useReducer, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createSpinController, type SpinStatus } from "./spinController";
import { claimReducer, type ClaimStep } from "./claimMachine";
import { createHaptics } from "./haptics";
import type { SoundInstance, ConversionConfig } from "./types";

export function SpinDriver({ controller, rotationRef, onStatus }: {
  controller: ReturnType<typeof createSpinController>;
  rotationRef: MutableRefObject<number>;
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

export function Parallax({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const g = useRef<THREE.Group>(null!);
  const tilt = useRef({ x: 0, y: 0 });
  const { pointer } = useThree();
  useEffect(() => {
    if (reduced) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      tilt.current.x = THREE.MathUtils.clamp((e.gamma ?? 0) / 45, -1, 1);
      tilt.current.y = THREE.MathUtils.clamp(((e.beta ?? 0) - 45) / 45, -1, 1);
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

export function useSpinScene({ reduced, sound, conversion, onClaim, navigate }: {
  reduced: boolean;
  sound: SoundInstance;
  conversion: ConversionConfig;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
}) {
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [claimStep, dispatch] = useReducer(claimReducer, "hidden");
  const haptics = useMemo(() => createHaptics({ reduced }), [reduced]);
  const go = navigate ?? ((url: string) => { if (typeof window !== "undefined") window.location.assign(url); });

  const controller = useMemo(
    () => createSpinController({ winningIndex: 7, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced]
  );

  useEffect(() => {
    if (status !== "won") { dispatch({ type: "reset" }); return; }
    const t = setTimeout(() => dispatch({ type: "won" }), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);

  const onSpin = () => {
    if (controller.status !== "idle") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
    haptics.spin();
  };
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") { sound.win(); haptics.win(); }
  };
  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
  };

  const onClaimOpen = () => dispatch({ type: "open" });
  const onClaimSubmit = async (value: string) => {
    dispatch({ type: "submit" });
    haptics.claim();
    try { await onClaim?.({ field: conversion.registerField, value, prize: conversion.prize }); } catch { /* lead capture is best-effort */ }
    dispatch({ type: "done" });
    go(conversion.redirectUrl);
  };
  const onDismiss = () => dispatch({ type: "reset" });

  return { rotationRef, status, muted, claimStep, controller, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss };
}
