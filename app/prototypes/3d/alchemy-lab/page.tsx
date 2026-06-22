"use client";
import dynamic from "next/dynamic";

const AlchemyLabScene = dynamic(
  () => import("@/components/r3f/alchemy/AlchemyLabScene").then((m) => m.AlchemyLabScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#0A1A14", color: "#8BFF5A", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        BREWING THE LAB…
      </div>
    ),
  }
);

export default function Page() {
  return <AlchemyLabScene />;
}
