"use client";
import dynamic from "next/dynamic";
import type { LandingSceneConfig } from "@/components/r3f/kit/sceneConfig";

function Loading() {
  return (
    <div role="status" aria-label="Loading" style={{
      position: "fixed", inset: 0, display: "grid", placeItems: "center",
      background: "#070D0B", color: "#F5C24B", fontFamily: "system-ui, sans-serif", fontWeight: 800, letterSpacing: "2px",
    }}>
      LOADING…
    </div>
  );
}

const SCENES = {
  "jackpot-vault": dynamic(() => import("@/components/r3f/jackpot/JackpotVaultScene").then((m) => m.JackpotVaultScene), { ssr: false, loading: Loading }),
  "alchemy-lab": dynamic(() => import("@/components/r3f/alchemy/AlchemyLabScene").then((m) => m.AlchemyLabScene), { ssr: false, loading: Loading }),
  "book-of-ra": dynamic(() => import("@/components/r3f/slots/book-of-ra/BookOfRaScene").then((m) => m.BookOfRaScene), { ssr: false, loading: Loading }),
  "gates-of-olympus": dynamic(() => import("@/components/r3f/slots/gates-of-olympus/GatesScene").then((m) => m.GatesScene), { ssr: false, loading: Loading }),
} as const;

export function TemplateScene({ template, config }: { template: string; config: LandingSceneConfig }) {
  const Scene = SCENES[template as keyof typeof SCENES];
  if (!Scene) return null;
  return <Scene config={config} />;
}
