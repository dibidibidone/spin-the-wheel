import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLandingByHost } from "@/lib/tenant";
import { buildMetadata } from "./buildMetadata";
import { buildSceneConfig } from "@/lib/sceneConfig";
import { LandingScene } from "@/components/landing/LandingScene";
import { TemplateScene } from "./TemplateScene.client";

type Params = { params: Promise<{ domain: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  return view ? buildMetadata(view) : {};
}

export default async function LandingPage({ params }: Params) {
  const { domain } = await params;
  const view = await getLandingByHost(decodeURIComponent(domain));
  if (!view) notFound();
  if (view.template === "classic-2d") return <LandingScene view={view} />;
  return <TemplateScene template={view.template} config={buildSceneConfig(view)} />;
}
