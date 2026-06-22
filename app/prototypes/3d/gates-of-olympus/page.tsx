"use client";
import dynamic from "next/dynamic";

const GatesScene = dynamic(
  () => import("@/components/r3f/slots/gates-of-olympus/GatesScene").then((m) => m.GatesScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#120c2e", color: "#FFD56A", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        SUMMONING OLYMPUS…
      </div>
    ),
  }
);

export default function Page() {
  return <GatesScene />;
}
