"use client";
import dynamic from "next/dynamic";
import { SceneLoader } from "@/components/r3f/kit/SceneLoader";

const JackpotVaultScene = dynamic(
  () => import("@/components/r3f/jackpot/JackpotVaultScene").then((m) => m.JackpotVaultScene),
  { ssr: false, loading: () => <SceneLoader label="Loading the Vault" accent="#F5C24B" bg="#070D0B" /> }
);

export default function Page() {
  return <JackpotVaultScene />;
}
