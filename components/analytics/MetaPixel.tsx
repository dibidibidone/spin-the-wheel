"use client";
import { useEffect } from "react";
import { ensureBaseSnippet, initPixels, track } from "@/lib/fbq";

// Loads the landing's Meta pixels and fires PageView. Renders only a <noscript> fallback.
// No-op (renders null) when the landing has no pixels configured.
export function MetaPixel({ pixelIds }: { pixelIds: string[] }) {
  const pixelKey = pixelIds.join(",");
  useEffect(() => {
    if (!pixelKey) return;
    ensureBaseSnippet();
    initPixels(pixelKey.split(","));
    track("PageView");
  }, [pixelKey]);

  if (pixelIds.length === 0) return null;
  // Standard Meta fallback for JavaScript-disabled browsers: the <noscript> img only
  // loads when JS is off, so JS users count once via fbq('track','PageView') and no-JS
  // users count once via this beacon — never both. Next.js server-renders this client
  // component, so the <noscript> is present in the initial HTML that no-JS users receive.
  return (
    <noscript>
      {pixelIds.map((id) => (
        <img
          key={id}
          height={1}
          width={1}
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
        />
      ))}
    </noscript>
  );
}
