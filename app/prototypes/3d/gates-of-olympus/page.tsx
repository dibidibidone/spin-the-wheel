"use client";
import dynamic from "next/dynamic";
import { SceneLoader } from "@/components/r3f/kit/SceneLoader";

const GatesScene = dynamic(
  () => import("@/components/r3f/slots/gates-of-olympus/GatesScene").then((m) => m.GatesScene),
  { ssr: false, loading: () => <SceneLoader label="Summoning Olympus" accent="#FFD56A" bg="#120c2e" /> }
);

export default function Page() {
  return <GatesScene />;
}
