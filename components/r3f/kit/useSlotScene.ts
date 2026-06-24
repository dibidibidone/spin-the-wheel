import { useEffect, useMemo, useReducer, useState } from "react";
import { createSlotController, type SlotStatus } from "./slotController";
import { claimReducer } from "./claimMachine";
import { createHaptics } from "./haptics";
import type { SoundInstance, ConversionConfig, SlotTheme } from "./types";

export function useSlotScene({ reduced, sound, theme, conversion, onClaim, navigate, onSpinStart }: {
  reduced: boolean;
  sound: SoundInstance;
  theme: SlotTheme;
  conversion: ConversionConfig;
  onClaim?: (p: { field: ConversionConfig["registerField"]; value: string; prize: string }) => void | Promise<void>;
  navigate?: (url: string) => void;
  onSpinStart?: () => void;
}) {
  const [status, setStatus] = useState<SlotStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [claimStep, dispatch] = useReducer(claimReducer, "hidden");
  const haptics = useMemo(() => createHaptics({ reduced }), [reduced]);
  const go = navigate ?? ((url: string) => { if (typeof window !== "undefined") window.location.assign(url); });

  // Key the controller on the meaningful slot fields, NOT the `theme` object's identity:
  // configured scenes rebuild `{ ...theme, winOnSpin }` fresh on every render, so depending
  // on `theme` would recreate the controller on the re-render that onSpin's setStatus triggers
  // — orphaning the in-flight spin so the reels hang on "spinning". These fields are stable
  // across those rebuilds (the spread preserves the inner arrays), so the controller survives.
  const controller = useMemo(
    () => createSlotController({
      reels: theme.reels,
      rows: theme.rows,
      pool: theme.symbols.filter((s) => !s.isOrb).map((s) => s.id), // orbs only drop on the win, never in the spinning filler
      nearMissGrid: theme.nearMissGrid,
      winGrid: theme.winGrid,
      winOnSpin: theme.winOnSpin,
      durationMs: reduced ? 350 : theme.durationMs,
    }),
    [theme.reels, theme.rows, theme.symbols, theme.nearMissGrid, theme.winGrid, theme.winOnSpin, theme.durationMs, reduced]
  );

  useEffect(() => {
    if (status !== "won") { dispatch({ type: "reset" }); return; }
    const t = setTimeout(() => dispatch({ type: "won" }), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [status, reduced]);

  const onSpin = () => {
    if (status !== "idle" && status !== "nearmiss") return;
    controller.start();
    setStatus("spinning");
    sound.tick();
    haptics.spin();
    onSpinStart?.();
  };
  const onStatus = (s: SlotStatus) => {
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
    try { await onClaim?.({ field: conversion.registerField, value, prize: conversion.prize }); } catch { /* best-effort lead */ }
    dispatch({ type: "done" });
    go(conversion.redirectUrl);
  };
  const onDismiss = () => { controller.reset(); setStatus("idle"); dispatch({ type: "reset" }); };

  // Spins remaining until the scripted win (theme.winOnSpin), recomputed each render.
  const spinsLeft = Math.max(0, theme.winOnSpin - controller.spinCount);

  return { status, muted, claimStep, controller, spinsLeft, onSpin, onStatus, onToggleSound, onClaimOpen, onClaimSubmit, onDismiss };
}
