import { notFound } from "next/navigation";
import { getLandingViewById } from "@/lib/tenant";
import { buildSceneConfig } from "@/lib/sceneConfig";
import { LandingScene } from "@/components/landing/LandingScene";
import { TemplateScene } from "@/app/[domain]/TemplateScene.client";

type Params = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Params) {
  const { id } = await params;
  const view = await getLandingViewById(id);
  if (!view) notFound();
  // Mirror the public route: classic-2d → the 2D scene, otherwise the chosen 3D template.
  if (view.template === "classic-2d") return <LandingScene view={view} />;
  return <TemplateScene template={view.template} config={buildSceneConfig(view)} />;
}
