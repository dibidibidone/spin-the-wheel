"use client";
import dynamic from "next/dynamic";

const JackpotVaultScene = dynamic(
  () => import("@/components/r3f/JackpotVaultScene").then((m) => m.JackpotVaultScene),
  {
    ssr: false,
    loading: () => (
      <div style={{
        position: "fixed", inset: 0, display: "grid", placeItems: "center",
        background: "#070D0B", color: "#F5C24B", fontFamily: "system-ui, sans-serif",
        fontWeight: 800, letterSpacing: "2px",
      }}>
        LOADING THE VAULT…
      </div>
    ),
  }
);

export default function Page() {
  return <JackpotVaultScene />;
}
