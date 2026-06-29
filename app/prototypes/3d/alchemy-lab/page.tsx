"use client";
import dynamic from "next/dynamic";
import { SceneLoader } from "@/components/r3f/kit/SceneLoader";

const AlchemyLabScene = dynamic(
  () => import("@/components/r3f/alchemy/AlchemyLabScene").then((m) => m.AlchemyLabScene),
  { ssr: false, loading: () => <SceneLoader label="Brewing the Lab" accent="#8BFF5A" bg="#0A1A14" /> }
);

export default function Page() {
  return <AlchemyLabScene />;
}
