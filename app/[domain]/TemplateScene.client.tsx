"use client";
import dynamic from "next/dynamic";
import type { LandingSceneConfig } from "@/components/r3f/kit/sceneConfig";
import { SceneLoader } from "@/components/r3f/kit/SceneLoader";

const loader = (label: string, accent: string, bg: string) => () => <SceneLoader label={label} accent={accent} bg={bg} />;

const SCENES = {
  "jackpot-vault": dynamic(() => import("@/components/r3f/jackpot/JackpotVaultScene").then((m) => m.JackpotVaultScene), { ssr: false, loading: loader("Loading the Vault", "#F5C24B", "#070D0B") }),
  "alchemy-lab": dynamic(() => import("@/components/r3f/alchemy/AlchemyLabScene").then((m) => m.AlchemyLabScene), { ssr: false, loading: loader("Brewing the Lab", "#8BFF5A", "#0A1A14") }),
  "book-of-ra": dynamic(() => import("@/components/r3f/slots/book-of-ra/BookOfRaScene").then((m) => m.BookOfRaScene), { ssr: false, loading: loader("Entering the Temple", "#F5C24B", "#1a0f04") }),
  "gates-of-olympus": dynamic(() => import("@/components/r3f/slots/gates-of-olympus/GatesScene").then((m) => m.GatesScene), { ssr: false, loading: loader("Summoning Olympus", "#FFD56A", "#120c2e") }),
} as const;

export function TemplateScene({ template, config }: { template: string; config: LandingSceneConfig }) {
  const Scene = SCENES[template as keyof typeof SCENES];
  if (!Scene) return null;
  return <Scene config={config} />;
}
