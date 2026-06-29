"use client";
import { useEffect, useRef, useState } from "react";

// Fires a last-chance prompt when the visitor looks like they're leaving without claiming:
// desktop mouse exiting the top of the viewport, or the mobile back button (trapped via a
// pushed history state). Armed after a short delay (so it can't fire on load) and shown at
// most once per session.
export function useExitIntent(): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("stw-exit-shown") === "1") { fired.current = true; return; }

    let armed = false;
    const armTimer = window.setTimeout(() => { armed = true; }, 2500);

    const trigger = () => {
      if (fired.current || !armed) return;
      fired.current = true;
      window.sessionStorage.setItem("stw-exit-shown", "1");
      setShow(true);
    };

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };
    const onPop = () => {
      trigger();
      window.history.pushState(null, "", window.location.href); // re-trap the back button
    };
    // Switching tabs / minimising / closing — the prompt is waiting when they return.
    const onVisibility = () => { if (document.visibilityState === "hidden") trigger(); };
    const onBlur = () => trigger();

    window.history.pushState(null, "", window.location.href); // trap the first back press
    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("popstate", onPop);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return { show, dismiss: () => setShow(false) };
}
