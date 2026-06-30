"use client";
import { useEffect } from "react";
import { ensureBaseSnippet, initPixels, track } from "@/lib/fbq";

// The PWA start_url lands here when the installed app is opened. In standalone mode that means
// "downloaded + opened", so we fire Lead to the landing's pixels, then forward to the admin link.
// A normal browser visit (the in-page claim already 302s via /go) just forwards, no Lead.
export function LaunchRedirect({ pixelIds, redirectUrl }: { pixelIds: string[]; redirectUrl: string }) {
  const pixelKey = pixelIds.join(",");
  useEffect(() => {
    const standalone =
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone && pixelKey) {
      ensureBaseSnippet();
      initPixels(pixelKey.split(","));
      track("Lead");
      const t = setTimeout(() => window.location.replace(redirectUrl), 500);
      return () => clearTimeout(t);
    }
    window.location.replace(redirectUrl);
  }, [pixelKey, redirectUrl]);

  return <p style={{ font: "16px system-ui", textAlign: "center", marginTop: "40vh" }}>Opening…</p>;
}
