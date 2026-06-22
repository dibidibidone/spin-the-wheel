"use client";
import type { CSSProperties } from "react";
import type { OverlayCopy, ConversionConfig } from "./types";
import type { OverlayVars } from "./SpinOverlay";

export function SceneFallback({ copy, vars, config }: { copy: OverlayCopy; vars: OverlayVars; config: ConversionConfig }) {
  const style: CSSProperties = {
    position: "fixed", inset: 0, display: "grid", placeItems: "center", textAlign: "center",
    padding: "24px", background: vars.surface, color: vars.text, fontFamily: "system-ui, sans-serif",
  };
  return (
    <div style={style}>
      <div>
        <h1 style={{ color: vars.gold, fontSize: "clamp(28px,7vw,48px)", margin: 0 }}>{copy.heading}</h1>
        {copy.subtitle && <p style={{ opacity: 0.85 }}>{copy.subtitle}</p>}
        <a
          href={config.redirectUrl}
          data-testid="spin-button"
          style={{
            display: "inline-block", marginTop: 20, padding: "16px 40px", borderRadius: 999,
            background: vars.gold, color: "#2a1e00", fontWeight: 800, textDecoration: "none", minHeight: 56,
          }}
        >
          {config.claimLabel}
        </a>
      </div>
    </div>
  );
}
