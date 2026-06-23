"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaInstall = {
  platform: "android" | "ios" | "other";
  installed: boolean;
  iosHintOpen: boolean;
  promptInstall: () => void;
  openApp: (url: string) => void;
  dismissIosHint: () => void;
};

function detectPlatform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(standalone || iosStandalone);
}

export function usePwaInstall(): PwaInstall {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState(detectPlatform);
  const [installed, setInstalled] = useState(detectInstalled);
  const [iosHintOpen, setIosHintOpen] = useState(false);

  useEffect(() => {
    navigator.serviceWorker?.register("/sw.js").catch(() => { /* installability is best-effort */ });

    const onBip = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => { setInstalled(true); deferred.current = null; };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (deferred.current) {
      void deferred.current.prompt();
      deferred.current = null;
      return;
    }
    if (platform === "ios" && !installed) setIosHintOpen(true);
    // android-without-event / other: no-op; the offer still opens via openApp at claim.
  }, [platform, installed]);

  const openApp = useCallback((url: string) => {
    if (typeof window !== "undefined") window.location.assign(url);
  }, []);

  const dismissIosHint = useCallback(() => setIosHintOpen(false), []);

  return { platform, installed, iosHintOpen, promptInstall, openApp, dismissIosHint };
}
