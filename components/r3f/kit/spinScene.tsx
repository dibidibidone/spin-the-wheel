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
  const drag = useRef({ x: 0, y: 0 });
  const isTouch = useRef(false);
  const { pointer, gl } = useThree();

  useEffect(() => {
    isTouch.current = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
    if (reduced || !isTouch.current) return; // desktop keeps pointer parallax below
    const el = gl.domElement;
    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      drag.current.x = (t.clientX / window.innerWidth) * 2 - 1;
      drag.current.y = (t.clientY / window.innerHeight) * 2 - 1;
    };
    el.addEventListener("touchmove", onMove, { passive: true });
    return () => el.removeEventListener("touchmove", onMove);
  }, [reduced, gl]);

  useFrame(() => {
    if (!g.current || reduced) return;
    const px = isTouch.current ? drag.current.x : pointer.x;
    const py = isTouch.current ? -drag.current.y : pointer.y;
    g.current.rotation.y = THREE.MathUtils.lerp(g.current.rotation.y, px * 0.2, 0.05);
    g.current.rotation.x = THREE.MathUtils.lerp(g.current.rotation.x, -py * 0.15, 0.05);
  });

  return <group ref={g}>{children}</group>;
}

export function useSpinScene({ reduced, sound, conversion, winningIndex = 7, winOnSpin = 1, segmentCount, onClaim, navigate, onSpinStart }: {
  reduced: boolean;
  sound: SoundInstance;
  conversion: ConversionConfig;
  winningIndex?: number;
  winOnSpin?: number;
  segmentCount?: number;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
  onSpinStart?: () => void;
}) {
  const rotationRef = useRef(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [claimStep, dispatch] = useReducer(claimReducer, "hidden");
  const haptics = useMemo(() => createHaptics({ reduced }), [reduced]);
  const go = navigate ?? ((url: string) => { if (typeof window !== "undefined") window.location.assign(url); });

  const controller = useMemo(
    () => createSpinController({ winningIndex, winOnSpin, segments: segmentCount ?? 8, durationMs: reduced ? 250 : 4500, turns: reduced ? 0 : 6 }),
    [reduced, winningIndex, winOnSpin, segmentCount]
  );

  useEffect(() => {
    if (status !== "won") { dispatch({ type: "reset" }); return; }
    const t = setTimeout(() => dispatch({ type: "won" }), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);

  const onSpin = () => {
    if (controller.status !== "idle" && controller.status !== "nearmiss") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
    haptics.spin();
    onSpinStart?.();
  };
  const onStatus = (s: SpinStatus) => {
    setStatus(s);
    if (s === "won") { sound.win(); haptics.win(); }
    else if (s === "nearmiss") { sound.tick(); haptics.spin(); }
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

  // How many spins remain until the scripted win (recomputed each render — status
  // changes drive re-renders, so this updates after every spin / near-miss).
  const spinsLeft = Math.max(0, winOnSpin - controller.spinCount);

  return { rotationRef, status, muted, claimStep, controller, spinsLeft, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss };
}
