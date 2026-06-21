"use client";

import { useCallback, useRef, useState } from "react";
import { planSpin, rotationForIndex } from "@/lib/spin";
import type { SpinConfig } from "@/lib/types";

export type SpinStatus = "idle" | "spinning" | "almost" | "won";

export function useSpinController(config: SpinConfig) {
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState<SpinStatus>("idle");
  // Mirror status in a ref so guards don't depend on async state and stay
  // correct under React StrictMode (which double-invokes state updaters).
  const statusRef = useRef<SpinStatus>("idle");
  const countRef = useRef(0);
  const pendingWinRef = useRef(false);
  const rotationRef = useRef(0);

  const setBothStatus = useCallback((s: SpinStatus) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const spin = useCallback(() => {
    if (statusRef.current === "spinning" || statusRef.current === "won") return;
    const spinNumber = countRef.current + 1;
    countRef.current = spinNumber;
    const plan = planSpin(spinNumber, config);
    pendingWinRef.current = plan.isWin;
    const next = rotationForIndex(plan.targetIndex, config.segmentCount, rotationRef.current);
    rotationRef.current = next;
    setRotation(next);
    setBothStatus("spinning");
  }, [config, setBothStatus]);

  const onAnimationComplete = useCallback(() => {
    if (statusRef.current !== "spinning") return;
    setBothStatus(pendingWinRef.current ? "won" : "almost");
  }, [setBothStatus]);

  return { rotation, status, spin, onAnimationComplete };
}
