import { notFound } from "next/navigation";
import { getLandingViewById } from "@/lib/tenant";
import { LandingScene } from "@/components/landing/LandingScene";

type Params = { params: Promise<{ id: string }> };

export default async function PreviewPage({ params }: Params) {
  const { id } = await params;
  const view = await getLandingViewById(id);
  if (!view) notFound();
  return <LandingScene view={view} />;
}
